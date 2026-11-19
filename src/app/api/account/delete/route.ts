import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { apiUser, json } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';

const PAGE_SIZE = 500;
const STORAGE_BATCH_SIZE = 100;
const MAX_REQUEST_BYTES = 8 * 1024;
const LISTING_PHOTOS_BUCKET = 'listing-photos';
const HINT_FILES_BUCKET = 'hint-files';
const MESSAGE_ATTACHMENTS_BUCKET = 'message-attachments';

type QueryPage<T> = (
  from: number,
  to: number
) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

async function selectAll<T>(queryPage: QueryPage<T>, label: string): Promise<T[]> {
  const rows: T[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await queryPage(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${label}: ${error.message}`);

    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

function isSafeStoragePath(path: unknown): path is string {
  return (
    typeof path === 'string' &&
    path.length > 0 &&
    path.length <= 1024 &&
    !path.startsWith('/') &&
    !path.includes('\\') &&
    path.split('/').every((part) => part.length > 0 && part !== '.' && part !== '..')
  );
}

function getOwnedAvatarPath(avatarUrl: string | null, userId: string): string | null {
  if (!avatarUrl || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null;

  try {
    const url = new URL(avatarUrl);
    const projectUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const prefix = '/storage/v1/object/public/listing-photos/';
    if (url.origin !== projectUrl.origin || !url.pathname.startsWith(prefix)) return null;

    const path = decodeURIComponent(url.pathname.slice(prefix.length));
    return path.startsWith(`${userId}/profile/`) && isSafeStoragePath(path) ? path : null;
  } catch {
    return null;
  }
}

async function collectAccountStoragePaths(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  avatarUrl: string | null
) {
  const listingPhotos = new Set<string>();
  const hintFiles = new Set<string>();
  const messageAttachments = new Set<string>();

  const listings = await selectAll(
    (from, to) => admin.from('listings').select('id').eq('seller_id', userId).range(from, to),
    'Could not load account listings'
  );
  const listingIds = listings.map((listing) => listing.id as string);
  const ownedListingIds = new Set(listingIds);

  const avatarPath = getOwnedAvatarPath(avatarUrl, userId);
  if (avatarPath) listingPhotos.add(avatarPath);

  if (listingIds.length > 0) {
    const photos = await selectAll(
      (from, to) => admin.from('listing_photos').select('image_path').in('listing_id', listingIds).range(from, to),
      'Could not load listing photos'
    );
    for (const photo of photos) {
      if (!isSafeStoragePath(photo.image_path)) continue;
      const listingId = photo.image_path.split('/')[0];
      if (ownedListingIds.has(listingId)) listingPhotos.add(photo.image_path);
    }

    const identifications = await selectAll(
      (from, to) => admin.from('identification_results').select('id').in('listing_id', listingIds).range(from, to),
      'Could not load laptop identification files'
    );
    const identificationIds = identifications.map((identification) => identification.id as string);

    if (identificationIds.length > 0) {
      const hints = await selectAll(
        (from, to) =>
          admin
            .from('seller_hints')
            .select('system_info_path, receipt_path')
            .in('identification_id', identificationIds)
            .range(from, to),
        'Could not load seller hint files'
      );
      for (const hint of hints) {
        for (const path of [hint.system_info_path, hint.receipt_path]) {
          if (isSafeStoragePath(path) && path.startsWith(`${userId}/`)) hintFiles.add(path);
        }
      }
    }
  }

  const conversations = await selectAll(
    (from, to) =>
      admin
        .from('conversations')
        .select('id')
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .range(from, to),
    'Could not load account conversations'
  );
  const conversationIds = new Set(conversations.map((conversation) => conversation.id as string));

  if (listingIds.length > 0) {
    const listingConversations = await selectAll(
      (from, to) =>
        admin.from('conversations').select('id').in('listing_id', listingIds).range(from, to),
      'Could not load listing conversations'
    );
    for (const conversation of listingConversations) conversationIds.add(conversation.id as string);
  }

  const conversationIdList = [...conversationIds];
  if (conversationIdList.length > 0) {
    const messages = await selectAll(
      (from, to) =>
        admin.from('messages').select('attachments').in('conversation_id', conversationIdList).range(from, to),
      'Could not load conversation attachments'
    );
    for (const message of messages) {
      if (!Array.isArray(message.attachments)) continue;
      for (const attachment of message.attachments) {
        if (
          attachment &&
          typeof attachment === 'object' &&
          'path' in attachment &&
          isSafeStoragePath(attachment.path) &&
          conversationIds.has(attachment.path.split('/')[0])
        ) {
          messageAttachments.add(attachment.path);
        }
      }
    }
  }

  return { listingPhotos, hintFiles, messageAttachments };
}

async function removeStoragePaths(
  admin: ReturnType<typeof createAdminClient>,
  bucket: string,
  paths: Set<string>
) {
  const files = [...paths];
  for (let index = 0; index < files.length; index += STORAGE_BATCH_SIZE) {
    const { error } = await admin.storage.from(bucket).remove(files.slice(index, index + STORAGE_BATCH_SIZE));
    if (error) throw new Error(`Could not remove files from ${bucket}: ${error.message}`);
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  let sameOrigin = false;
  if (origin) {
    try {
      sameOrigin = new URL(origin).origin === new URL(request.url).origin;
    } catch {
      sameOrigin = false;
    }
  }
  if (!sameOrigin) {
    return json({ error: 'This request could not be verified.' }, 403);
  }

  const contentLength = request.headers.get('content-length');
  if (contentLength !== null) {
    const length = Number(contentLength);
    if (!Number.isSafeInteger(length) || length < 0 || length > MAX_REQUEST_BYTES) {
      return json({ error: 'The confirmation details are invalid.' }, 413);
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'The confirmation details are invalid.' }, 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json({ error: 'The confirmation details are invalid.' }, 400);
  }

  const confirmation = 'confirmation' in body ? body.confirmation : undefined;
  const password = 'password' in body ? body.password : undefined;
  if (
    typeof confirmation !== 'string' ||
    confirmation.length > 320 ||
    (password !== undefined && (typeof password !== 'string' || password.length > 1024))
  ) {
    return json({ error: 'The confirmation details are invalid.' }, 400);
  }

  let account: Awaited<ReturnType<typeof apiUser>>;
  try {
    account = await apiUser();
  } catch (error) {
    console.error('Could not verify an account deletion request:', error instanceof Error ? error.message : 'Unknown error');
    return json({ error: 'Could not verify your account. Please try again.' }, 503);
  }

  const { supabase, user, profile } = account;
  if (!user) return json({ error: 'Please sign in again before deleting your account.' }, 401);
  if (profile?.role === 'admin') {
    return json({ error: 'Administrator accounts cannot be deleted from account settings.' }, 403);
  }
  if (!user.email || confirmation.trim().toLowerCase() !== user.email.toLowerCase()) {
    return json({ error: 'Enter your account email exactly as shown to confirm deletion.' }, 400);
  }

  const providers = new Set<string>([
    ...(Array.isArray(user.app_metadata?.providers) ? user.app_metadata.providers : []),
    ...(user.identities ?? []).map((identity) => identity.provider),
  ]);
  const hasPasswordProvider = providers.size === 0 || providers.has('email');

  if (hasPasswordProvider) {
    if (typeof password !== 'string' || password.length === 0) {
      return json({ error: 'Enter your current password to confirm account deletion.' }, 400);
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      console.error('Supabase public environment is not configured for account reauthentication.');
      return json({ error: 'Account deletion is temporarily unavailable.' }, 503);
    }

    const verifier = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    );
    let passwordVerified = false;
    try {
      const { error } = await verifier.auth.signInWithPassword({ email: user.email, password });
      passwordVerified = !error;
    } catch (error) {
      console.error('Could not verify the account password for deletion:', error instanceof Error ? error.message : 'Unknown error');
      return json({ error: 'Password verification is temporarily unavailable. Please try again.' }, 503);
    } finally {
      const { error } = await verifier.auth.signOut({ scope: 'local' });
      if (error) console.error('Could not clear the temporary account verification session:', error.message);
    }
    if (!passwordVerified) return json({ error: 'Your password could not be verified.' }, 403);
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error('Could not initialize account deletion:', error instanceof Error ? error.message : 'Unknown error');
    return json({ error: 'Account deletion is temporarily unavailable.' }, 503);
  }

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    console.error('Could not load the current session to revoke before account deletion:', sessionError?.message ?? 'No session');
    return json({ error: 'Your session expired. Sign in again and retry account deletion.' }, 401);
  }

  try {
    const storagePaths = await collectAccountStoragePaths(admin, user.id, profile?.avatar_url ?? null);
    await removeStoragePaths(admin, LISTING_PHOTOS_BUCKET, storagePaths.listingPhotos);
    await removeStoragePaths(admin, HINT_FILES_BUCKET, storagePaths.hintFiles);
    await removeStoragePaths(admin, MESSAGE_ATTACHMENTS_BUCKET, storagePaths.messageAttachments);
  } catch (error) {
    console.error('Could not clean up files for account deletion:', error instanceof Error ? error.message : 'Unknown error');
    return json({
      error: 'We could not remove all of your uploaded files, so your account is still active. Please try again.',
    }, 503);
  }

  const { error: revokeError } = await admin.auth.admin.signOut(session.access_token, 'global');
  if (revokeError) {
    console.error('Could not revoke account sessions before deletion:', revokeError.message);
    return json({ error: 'We could not end all account sessions. Please try again.' }, 503);
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error('Could not delete the authenticated account:', deleteError.message);
    return json({
      error: 'We could not finish deleting your account. You can sign in and try again.',
    }, 503);
  }

  return json({ deleted: true }, 200, { 'Cache-Control': 'no-store' });
}
