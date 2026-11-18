import { randomUUID } from 'node:crypto';
import { apiUser, json } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { isImage, processImage } from '@/lib/images';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_FILE_BYTES + 64 * 1024;
const AVATAR_STORAGE_PREFIX = '/storage/v1/object/public/listing-photos/';

function getOwnedAvatarPath(url: string | null, userId: string): string | null {
  if (!url) return null;

  try {
    const pathname = new URL(url).pathname;
    if (!pathname.startsWith(AVATAR_STORAGE_PREFIX)) return null;
    const path = decodeURIComponent(pathname.slice(AVATAR_STORAGE_PREFIX.length));
    return path.startsWith(`${userId}/profile/`) ? path : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let account: Awaited<ReturnType<typeof apiUser>>;
  try {
    account = await apiUser();
  } catch (error) {
    console.error('Could not load the profile for an avatar upload:', error instanceof Error ? error.message : 'Unknown error');
    return json({ error: 'Could not verify your account.' }, 500);
  }

  const { supabase, user, profile } = account;
  if (!user) return json({ error: 'Please sign in.' }, 401);
  if (profile?.role === 'admin') return json({ error: 'Admin accounts cannot upload marketplace profile photos.' }, 403);
  if (profile?.status !== 'active') return json({ error: 'Your account is suspended.' }, 403);

  const contentLength = request.headers.get('content-length');
  if (contentLength !== null) {
    const length = Number(contentLength);
    if (!Number.isSafeInteger(length) || length < 0 || length > MAX_REQUEST_BYTES) {
      return json({ error: 'Your photo must be 5 MB or smaller.' }, 413);
    }
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'Could not read the uploaded photo.' }, 400);
  }

  const photo = form.get('photo');
  if (!isImage(photo)) return json({ error: 'Choose a non-empty JPG, PNG, or WebP photo.' }, 400);
  if (photo.size > MAX_FILE_BYTES) return json({ error: 'Your photo must be 5 MB or smaller.' }, 413);

  let image: Buffer;
  try {
    image = await processImage(Buffer.from(await photo.arrayBuffer()));
  } catch (error) {
    console.error('Could not process profile photo:', error instanceof Error ? error.message : 'Unknown error');
    return json({ error: 'The photo could not be processed. Use an image at least 200 by 200 pixels.' }, 400);
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error('Could not initialize profile photo storage:', error instanceof Error ? error.message : 'Unknown error');
    return json({ error: 'Photo uploads are temporarily unavailable.' }, 503, { 'Retry-After': '60' });
  }

  const path = `${user.id}/profile/${randomUUID()}.jpg`;
  const { error: uploadError } = await admin.storage
    .from('listing-photos')
    .upload(path, image, { contentType: 'image/jpeg', cacheControl: '3600' });
  if (uploadError) {
    console.error('Could not save profile photo:', uploadError.message);
    return json({ error: 'Could not save your photo. Please try again.' }, 500);
  }

  const { data: urlData } = admin.storage.from('listing-photos').getPublicUrl(path);
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ avatar_url: urlData.publicUrl })
    .eq('id', user.id);

  if (profileError) {
    console.error('Could not save the profile photo URL:', profileError.message);
    const { error: cleanupError } = await admin.storage.from('listing-photos').remove([path]);
    if (cleanupError) console.error('Could not clean up the failed profile photo upload:', cleanupError.message);
    return json({ error: 'Your photo uploaded, but your profile could not be updated.' }, 500);
  }

  const oldAvatarPath = getOwnedAvatarPath(profile.avatar_url, user.id);
  if (oldAvatarPath) {
    const { error: cleanupError } = await admin.storage.from('listing-photos').remove([oldAvatarPath]);
    if (cleanupError) console.error('Could not remove the previous profile photo:', cleanupError.message);
  }

  return json({ avatarUrl: urlData.publicUrl });
}
