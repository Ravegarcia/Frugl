import { apiUser, json } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { withinLimit } from '@/lib/usage';
import { secondsUntilDailyReset } from '@/lib/usage-policy';
import { isImage, processImage, uploadListingPhoto } from '@/lib/images';

const MAX_PHOTOS_PER_LISTING = 10;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_PHOTOS_PER_LISTING * MAX_FILE_BYTES + 256 * 1024;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profile } = await apiUser();
  if (!user) return json({ error: 'Please sign in.' }, 401);
  if (profile?.role === 'admin') return json({ error: 'Admin accounts cannot upload marketplace listing photos.' }, 403);
  if (profile?.status !== 'active') return json({ error: 'Your account is suspended.' }, 403);

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('id')
    .eq('id', id)
    .eq('seller_id', user.id)
    .maybeSingle();
  if (listingError) {
    console.error('Could not verify listing photo ownership:', listingError.message);
    return json({ error: 'Could not verify the listing.' }, 500);
  }
  if (!listing) return json({ error: 'Listing not found.' }, 404);
  const limit = await withinLimit(user.id, 'upload');
  if (limit === 'unavailable') {
    return json({ error: 'We could not verify your upload limit. Please try again shortly.' }, 503, { 'Retry-After': '60' });
  }
  if (limit === 'limited') {
    return json({ error: 'Daily upload limit reached.' }, 429, { 'Retry-After': String(secondsUntilDailyReset()) });
  }

  const requestLength = request.headers.get('content-length');
  const requestLengthNumber = requestLength === null ? null : Number(requestLength);
  if (
    requestLengthNumber !== null &&
    (!Number.isSafeInteger(requestLengthNumber) || requestLengthNumber < 0 || requestLengthNumber > MAX_REQUEST_BYTES)
  ) {
    return json({ error: 'The photos must be 40 MB or smaller in total.' }, 413);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'Could not read the uploaded photos.' }, 400);
  }
  const rawFiles = form.getAll('photos');
  if (rawFiles.length === 0 || rawFiles.some((file) => !isImage(file))) {
    return json({ error: 'Choose one or more non-empty JPG, PNG, or WebP photos.' }, 400);
  }
  const files = rawFiles.filter(isImage);
  if (files.some((file) => file.size > MAX_FILE_BYTES)) {
    return json({ error: 'Each photo must be 4 MB or smaller.' }, 413);
  }
  const { count, error: countError } = await supabase.from('listing_photos').select('id', { count: 'exact', head: true }).eq('listing_id', id);
  if (countError) {
    console.error('Could not count listing photos:', countError.message);
    return json({ error: 'Could not verify the listing photo limit.' }, 500);
  }
  if ((count ?? 0) + files.length > MAX_PHOTOS_PER_LISTING) {
    return json({ error: `A listing can have at most ${MAX_PHOTOS_PER_LISTING} photos.` }, 400);
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error('Could not initialize listing photo storage:', error instanceof Error ? error.message : 'Unknown error');
    return json({ error: 'Photo uploads are temporarily unavailable.' }, 503, { 'Retry-After': '60' });
  }
  const uploadedPaths: string[] = [];
  try {
    let order = count ?? 0;
    for (const f of files) {
      const buf = await processImage(Buffer.from(await f.arrayBuffer()));
      const up = await uploadListingPhoto(admin, id, buf);
      uploadedPaths.push(up.path);
      const { error: photoError } = await supabase.from('listing_photos').insert({ listing_id: id, image_path: up.path, image_url: up.url, view_type: 'photo', sort_order: order++ });
      if (photoError) throw new Error('Could not save an uploaded photo: ' + photoError.message);
    }
  } catch (e: unknown) {
    console.error('Could not process listing photos:', e instanceof Error ? e.message : 'Unknown error');
    if (uploadedPaths.length > 0) {
      const { error: cleanupError } = await admin.storage.from('listing-photos').remove(uploadedPaths);
      if (cleanupError) console.error('Could not clean up listing photos:', cleanupError.message);
      const { error: deleteError } = await supabase.from('listing_photos').delete().in('image_path', uploadedPaths);
      if (deleteError) console.error('Could not clean up listing photo records:', deleteError.message);
    }
    return json({ error: 'A photo could not be processed or saved. Check the image format and try again.' }, 400);
  }

  const { data: photos, error: photosError } = await supabase
    .from('listing_photos').select('id,image_url,sort_order,view_type').eq('listing_id', id).order('sort_order');
  if (photosError) {
    console.error('Could not load saved listing photos:', photosError.message);
    return json({ error: 'Could not load the saved photos.' }, 500);
  }
  return json({ photos: photos ?? [] });
}
