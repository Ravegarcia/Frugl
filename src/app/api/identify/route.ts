import { apiUser, json } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { withinLimit } from '@/lib/usage';
import { isImage, processImage, uploadHintFile, uploadListingPhoto } from '@/lib/images';
import { GeminiIdentifier } from '@/lib/ai/gemini';
import { combineConfidence, modelLabel, rankCandidates, type CatalogModel } from '@/lib/ai/match';
import type { Hints } from '@/lib/ai/types';
import { tierFor } from '@/lib/ai/tier';
import { buildDescription } from '@/lib/description';
import { priceFor } from '@/lib/price';

export const maxDuration = 60;

const MAX_PHOTOS = 10;
const MAX_BYTES = 4 * 1024 * 1024;

const text = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
};

function draftFromModel(m: CatalogModel, hints: Hints) {
  const ram = hints.ram || m.default_ram || null;
  const storage = hints.storage || m.default_storage || null;
  const cpu = hints.cpu || m.cpu || null;
  return {
    model_id: m.id,
    brand: m.brand,
    model: modelLabel(m),
    title: [m.brand, m.series, cpu, ram && storage ? ram + '/' + storage : ram || storage].filter(Boolean).join(' '),
    cpu,
    gpu: m.gpu,
    screen_size: m.screen_size,
    ram,
    storage,
    description: buildDescription('simple', {
      brand: m.brand, model: m.series, cpu: cpu ?? undefined, gpu: m.gpu ?? undefined,
      ram: ram ?? undefined, storage: storage ?? undefined, screen_size: m.screen_size, notes: hints.notes,
    }),
    ai_filled: ['title', 'brand', 'model', 'description', 'cpu', 'gpu', 'screen_size', 'ram', 'storage'],
  };
}

export async function POST(request: Request) {
  const { supabase, user, profile } = await apiUser();
  if (!user) return json({ error: 'Please sign in.' }, 401);
  if (profile?.role === 'admin') return json({ error: 'Admin accounts cannot create marketplace listings.' }, 403);
  if (profile?.status === 'suspended') return json({ error: 'Your account is suspended.' }, 403);
  if (!(await withinLimit(user.id, 'identify'))) {
    return json({ error: 'You reached the daily limit for AI identification. Try again tomorrow, or skip the AI and type the details yourself.' }, 429);
  }

  const form = await request.formData();
  const photos = form.getAll('photos').filter(isImage).slice(0, MAX_PHOTOS) as File[];
  const stickerRaw = form.get('sticker');
  const sticker = isImage(stickerRaw) ? (stickerRaw as File) : null;
  if (photos.length === 0) return json({ error: 'Add at least one photo.' }, 400);
  if ([...photos, ...(sticker ? [sticker] : [])].some((f) => f.size > MAX_BYTES)) {
    return json({ error: 'Each photo must be under 4 MB.' }, 400);
  }

  const hints: Hints = {
    brand: text(form, 'brand'),
    series: text(form, 'series'),
    modelNumber: text(form, 'modelNumber'),
    serialNumber: text(form, 'serialNumber'),
    purchaseYear: Number(text(form, 'purchaseYear')) || undefined,
    ram: text(form, 'ram'),
    storage: text(form, 'storage'),
    cpu: text(form, 'cpu'),
    notes: text(form, 'notes'),
  };

  // 1. create the draft listing (only its seller can see it)
  const { data: draft, error: draftError } = await supabase
    .from('listings')
    .insert({ seller_id: user.id, location: profile?.default_location ?? '' })
    .select('id')
    .single();
  if (draftError || !draft) return json({ error: 'Could not create the draft: ' + (draftError?.message ?? 'unknown error') }, 400);

  // 2. resize photos, strip location data, store them
  const admin = createAdminClient();
  const buffers: Buffer[] = [];
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
      await supabase.from('listing_photos').insert({
        listing_id: draft.id, image_path: up.path, image_url: up.url,
        view_type: order === 0 ? 'cover' : item.type, sort_order: order,
      });
      order++;
    }
  } catch (e: any) {
    await supabase.from('listings').delete().eq('id', draft.id);
    return json({ error: 'A photo could not be processed: ' + e.message }, 400);
  }

  // 3. optional hint files (private bucket)
  let systemInfoPath: string | null = null;
  let receiptPath: string | null = null;
  try {
    const sys = form.get('systemInfoImage');
    const rec = form.get('receiptOrBoxImage');
    if (isImage(sys)) systemInfoPath = await uploadHintFile(admin, user.id, draft.id, await processImage(Buffer.from(await (sys as File).arrayBuffer())), 'system-info');
    if (isImage(rec)) receiptPath = await uploadHintFile(admin, user.id, draft.id, await processImage(Buffer.from(await (rec as File).arrayBuffer())), 'receipt-or-box');
  } catch {
    // optional files: ignore problems
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
  const { data: catalog } = await supabase.from('laptop_models').select('*');
  const candidates = vision ? rankCandidates((catalog ?? []) as CatalogModel[], vision, hints) : [];
  const confidence = vision ? combineConfidence(vision, candidates, hints) : 0;
  const tier = tierFor(confidence);
  const model = tier === 'auto' ? (catalog ?? []).find((m: any) => m.id === candidates[0]?.modelId) : null;

  // 6. fill the draft
  const patch: Record<string, any> = model
    ? draftFromModel(model as CatalogModel, hints)
    : {
        brand: vision?.brand ?? hints.brand ?? '',
        cpu: hints.cpu ?? null,
        ram: hints.ram ?? null,
        storage: hints.storage ?? null,
        description: hints.notes ?? '',
        ai_filled: vision?.brand ? ['brand'] : [],
      };
  await supabase.from('listings').update(patch).eq('id', draft.id);
  const suggestion = model ? await priceFor(supabase, (model as any).id, null) : null;

  // 7. keep the AI run for the accuracy test (Section 13)
  const hintsUsed = vision?.hintsUsed ?? Object.entries(hints).filter(([, v]) => v !== undefined).map(([k]) => k);
  const { data: ident } = await supabase
    .from('identification_results')
    .insert({
      listing_id: draft.id, candidates, brand: vision?.brand, series: vision?.series, model_number: vision?.modelNumber,
      visible_text: vision?.visibleText ?? [], confidence, tier, provider: 'gemini:' + (process.env.GEMINI_MODEL || 'default'), hints_used: hintsUsed,
    })
    .select('id')
    .single();
  if (ident) {
    await supabase.from('seller_hints').insert({
      identification_id: ident.id, brand: hints.brand, series: hints.series, model_number: hints.modelNumber,
      serial_number: hints.serialNumber, purchase_year: hints.purchaseYear, ram: hints.ram, storage: hints.storage,
      cpu: hints.cpu, system_info_path: systemInfoPath, receipt_path: receiptPath, notes: hints.notes,
    });
  }

  return json({
    status: 'done',
    draftListingId: draft.id,
    guess: { brand: vision?.brand ?? null, series: vision?.series ?? null, modelNumber: vision?.modelNumber ?? null, confidence },
    tier,
    candidates,
    hintsUsed,
    priceSuggestion: suggestion,
    prefill: { title: patch.title ?? '', brand: patch.brand ?? '', model: patch.model ?? null, description: patch.description ?? '', specs: { cpu: patch.cpu ?? null, ram: patch.ram ?? null, storage: patch.storage ?? null } },
    error: aiError,
  });
}
