import { apiUser, json } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { withinLimit } from '@/lib/usage';
import { secondsUntilDailyReset } from '@/lib/usage-policy';
import { isImage, processImage, uploadHintFile, uploadListingPhoto } from '@/lib/images';
import { GeminiIdentifier } from '@/lib/ai/gemini';
import { combineConfidence, hasClearLead, rankCandidates, type CatalogModel } from '@/lib/ai/match';
import { modelPrefill } from '@/lib/ai/prefill';
import type { Hints } from '@/lib/ai/types';
import { tierFor } from '@/lib/ai/tier';
import { priceFor } from '@/lib/price';

export const maxDuration = 60;

const MAX_PHOTOS = 10;
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_REQUEST_BYTES = 53 * 1024 * 1024;
const HINT_MAX_LENGTHS = {
  brand: 60,
  series: 120,
  modelNumber: 80,
  serialNumber: 120,
  ram: 40,
  storage: 40,
  cpu: 160,
  gpu: 160,
  notes: 2000,
};

const text = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
};

export async function POST(request: Request) {
  const { supabase, user, profile } = await apiUser();
  if (!user) return json({ error: 'Please sign in.' }, 401);
  if (profile?.role === 'admin') return json({ error: 'Admin accounts cannot create marketplace listings.' }, 403);
  if (profile?.status !== 'active') return json({ error: 'Your account is suspended.' }, 403);
  const limit = await withinLimit(user.id, 'identify');
  if (limit === 'unavailable') {
    return json({ error: 'We could not verify your usage limit. Please try again shortly.' }, 503, { 'Retry-After': '60' });
  }
  if (limit === 'limited') {
    return json(
      { error: 'You reached the daily limit for AI identification. Try again tomorrow, or skip the AI and type the details yourself.' },
      429,
      { 'Retry-After': String(secondsUntilDailyReset()) }
    );
  }

  const requestLength = request.headers.get('content-length');
  const requestLengthNumber = requestLength === null ? null : Number(requestLength);
  if (
    requestLengthNumber !== null &&
    (!Number.isSafeInteger(requestLengthNumber) || requestLengthNumber < 0 || requestLengthNumber > MAX_REQUEST_BYTES)
  ) {
    return json({ error: 'The upload must be 53 MB or smaller.' }, 413);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'Could not read the laptop photos and details.' }, 400);
  }

  const rawPhotos = form.getAll('photos');
  if (rawPhotos.length > MAX_PHOTOS) {
    return json({ error: `Add no more than ${MAX_PHOTOS} laptop photos.` }, 400);
  }
  if (rawPhotos.some((file) => !isImage(file))) {
    return json({ error: 'Use non-empty JPG, PNG, or WebP images.' }, 400);
  }
  const photos = rawPhotos.filter(isImage);
  const stickerRaw = form.get('sticker');
  const systemInfoRaw = form.get('systemInfoImage');
  const receiptOrBoxRaw = form.get('receiptOrBoxImage');
  for (const [field, value] of [
    ['sticker', stickerRaw],
    ['systemInfoImage', systemInfoRaw],
    ['receiptOrBoxImage', receiptOrBoxRaw],
  ] as const) {
    if (typeof value === 'string') {
      if (value.trim()) return json({ error: `${field} must be uploaded as an image file.` }, 400);
      continue;
    }
    if (value !== null && !isImage(value)) {
      return json({ error: `${field} must be a non-empty JPG, PNG, or WebP image.` }, 400);
    }
    if (isImage(value) && value.size > MAX_BYTES) {
      return json({ error: `${field} must be 4 MB or smaller.` }, 413);
    }
  }
  const sticker = isImage(stickerRaw) ? stickerRaw : null;
  const systemInfoImage = isImage(systemInfoRaw) ? systemInfoRaw : null;
  const receiptOrBoxImage = isImage(receiptOrBoxRaw) ? receiptOrBoxRaw : null;
  if (photos.length === 0) return json({ error: 'Add at least one photo.' }, 400);
  if ([...photos, ...(sticker ? [sticker] : [])].some((f) => f.size > MAX_BYTES)) {
    return json({ error: 'Each photo must be 4 MB or smaller.' }, 413);
  }

  for (const [field, maxLength] of Object.entries(HINT_MAX_LENGTHS)) {
    const value = form.get(field);
    if (value !== null && typeof value !== 'string') {
      return json({ error: `${field} must be text.` }, 400);
    }
    if (typeof value === 'string' && value.trim().length > maxLength) {
      return json({ error: `${field} must be ${maxLength} characters or fewer.` }, 422);
    }
  }

  const purchaseYearValue = text(form, 'purchaseYear');
  const purchaseYear = purchaseYearValue === undefined ? undefined : Number(purchaseYearValue);
  if (
    purchaseYearValue !== undefined &&
    (purchaseYear === undefined ||
      !Number.isInteger(purchaseYear) ||
      purchaseYear < 1970 ||
      purchaseYear > new Date().getFullYear() + 1)
  ) {
    return json({ error: 'Enter a valid laptop purchase year.' }, 422);
  }

  const hints: Hints = {
    brand: text(form, 'brand'),
    series: text(form, 'series'),
    modelNumber: text(form, 'modelNumber'),
    serialNumber: text(form, 'serialNumber'),
    purchaseYear,
    ram: text(form, 'ram'),
    storage: text(form, 'storage'),
    cpu: text(form, 'cpu'),
    gpu: text(form, 'gpu'),
    notes: text(form, 'notes'),
  };

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error('Could not initialize listing photo storage:', error instanceof Error ? error.message : 'Unknown error');
    return json({ error: 'Photo identification is temporarily unavailable.' }, 503, { 'Retry-After': '60' });
  }

  // 1. create the draft listing (only its seller can see it)
  const { data: draft, error: draftError } = await supabase
    .from('listings')
    .insert({ seller_id: user.id, location: profile?.default_location ?? '' })
    .select('id')
    .single();
  if (draftError || !draft) {
    console.error('Could not create a listing draft for identification:', draftError?.message ?? 'No draft returned.');
    return json({ error: 'Could not create a listing draft.' }, 500);
  }

  // 2. resize photos, strip location data, store them
  const buffers: Buffer[] = [];
  const uploadedPaths: string[] = [];
  try {
    const all = [
      ...photos.map((f) => ({ f, type: 'photo' })),
      ...(sticker ? [{ f: sticker, type: 'sticker' }] : []),
    ];
    let order = 0;
    for (const item of all) {
      const buf = await processImage(Buffer.from(await item.f.arrayBuffer()));
      buffers.push(buf);
      const up = await uploadListingPhoto(admin, draft.id, buf);
      uploadedPaths.push(up.path);
      const { error: photoError } = await supabase.from('listing_photos').insert({
        listing_id: draft.id, image_path: up.path, image_url: up.url,
        view_type: order === 0 ? 'cover' : item.type, sort_order: order,
      });
      if (photoError) throw new Error('Could not save an uploaded photo: ' + photoError.message);
      order++;
    }
  } catch (e: unknown) {
    console.error('Could not process listing photos:', e instanceof Error ? e.message : 'Unknown error');
    if (uploadedPaths.length > 0) {
      const { error: storageError } = await admin.storage.from('listing-photos').remove(uploadedPaths);
      if (storageError) console.error('Could not clean up listing photos:', storageError.message);
    }
    const { error: deleteError } = await supabase.from('listings').delete().eq('id', draft.id);
    if (deleteError) console.error('Could not delete failed listing draft:', deleteError.message);
    return json({ error: 'A photo could not be processed or saved. Check the image format and try again.' }, 400);
  }

  // 3. optional hint files (private bucket)
  let systemInfoPath: string | null = null;
  let receiptPath: string | null = null;
  try {
    if (systemInfoImage) {
      const image = await processImage(Buffer.from(await systemInfoImage.arrayBuffer()));
      buffers.push(image);
      systemInfoPath = await uploadHintFile(admin, user.id, draft.id, image, 'system-info');
    }
    if (receiptOrBoxImage) {
      const image = await processImage(Buffer.from(await receiptOrBoxImage.arrayBuffer()));
      receiptPath = await uploadHintFile(admin, user.id, draft.id, image, 'receipt-or-box');
    }
  } catch (error: unknown) {
    console.error('Could not process supplemental identification files:', error instanceof Error ? error.message : 'Unknown error');
  }

  // 4. ask the vision model; if it fails the seller gets a blank form instead of an error
  let vision: Awaited<ReturnType<GeminiIdentifier['identify']>> | null = null;
  let aiError: string | null = null;
  try {
    vision = await new GeminiIdentifier().identify({ images: buffers, hints });
  } catch (e: any) {
    console.error('identify failed:', e?.message ?? e);
    aiError = 'The AI could not read the photos right now. Please enter the model yourself.';
  }

  // 5. match against the catalog and choose a confidence tier
  const { data: catalog, error: catalogError } = await supabase.from('laptop_models').select('*');
  if (catalogError) console.error('Could not load catalog models for identification:', catalogError.message);
  const candidates = vision ? rankCandidates((catalog ?? []) as CatalogModel[], vision, hints) : [];
  const confidence = vision ? combineConfidence(vision, candidates, hints) : 0;
  const tier = tierFor(confidence);
  const canPrefillModel = tier === 'auto' || (tier === 'suggest' && hasClearLead(candidates));
  const model = canPrefillModel
    ? (catalog ?? []).find((m: any) => m.id === candidates[0]?.modelId) ?? null
    : null;

  // 6. fill the draft
  const detectedBrand = vision?.brand ?? hints.brand ?? '';
  const detectedSeries = vision?.series ?? hints.series ?? '';
  const detectedModelNumber = vision?.modelNumber ?? hints.modelNumber ?? '';
  const detectedModel = detectedSeries || detectedModelNumber;
  const patch: Record<string, any> = model
    ? modelPrefill(model as CatalogModel, hints)
    : {
        brand: detectedBrand,
        model: detectedModel,
        title: [detectedBrand, detectedModel].filter(Boolean).join(' '),
        cpu: hints.cpu ?? null,
        gpu: hints.gpu ?? null,
        ram: hints.ram ?? null,
        storage: hints.storage ?? null,
        description: hints.notes ?? '',
        ai_filled: [
          ...(vision?.brand ? ['brand'] : []),
          ...(vision?.series || vision?.modelNumber ? ['model'] : []),
          ...(vision?.brand && (vision?.series || vision?.modelNumber) ? ['title'] : []),
        ],
      };
  const { data: updatedDraft, error: updateError } = await supabase
    .from('listings')
    .update(patch)
    .eq('id', draft.id)
    .select('id')
    .maybeSingle();
  if (updateError || !updatedDraft) {
    console.error('identify draft update failed:', updateError?.message ?? 'No listing row was updated.');
    return json({
      error: 'The photo draft was created, but its details could not be saved. Open it from My Listings and enter the details manually.',
    }, 500);
  }
  const suggestion = model ? await priceFor(supabase, (model as any).id, null) : null;

  // 7. keep the AI run for the accuracy test (Section 13)
  const hintsUsed = vision?.hintsUsed ?? Object.entries(hints).filter(([, v]) => v !== undefined).map(([k]) => k);
  const { data: ident, error: identError } = await supabase
    .from('identification_results')
    .insert({
      listing_id: draft.id, candidates, brand: vision?.brand, series: vision?.series, model_number: vision?.modelNumber,
      visible_text: vision?.visibleText ?? [], confidence, tier,
      provider: aiError ? 'gemini:error' : 'gemini:' + (process.env.GEMINI_MODEL || 'default'),
      hints_used: hintsUsed,
    })
    .select('id')
    .single();
  if (identError) console.error('Could not save identification result:', identError.message);
  if (ident) {
    const { error: hintsError } = await supabase.from('seller_hints').insert({
      identification_id: ident.id, brand: hints.brand, series: hints.series, model_number: hints.modelNumber,
      serial_number: hints.serialNumber, purchase_year: hints.purchaseYear, ram: hints.ram, storage: hints.storage,
      cpu: hints.cpu, system_info_path: systemInfoPath, receipt_path: receiptPath, notes: hints.notes,
    });
    if (hintsError) console.error('Could not save seller identification hints:', hintsError.message);
  }

  return json({
    status: 'done',
    draftListingId: draft.id,
    guess: { brand: vision?.brand ?? null, series: vision?.series ?? null, modelNumber: vision?.modelNumber ?? null, confidence },
    tier,
    candidates,
    hintsUsed,
    priceSuggestion: suggestion,
    prefill: { title: patch.title ?? '', brand: patch.brand ?? '', model: patch.model ?? null, description: patch.description ?? '', specs: { cpu: patch.cpu ?? null, gpu: patch.gpu ?? null, ram: patch.ram ?? null, storage: patch.storage ?? null } },
    error: aiError,
  }, 201);
}
