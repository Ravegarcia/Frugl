import { NextResponse } from 'next/server';
import { apiUser, json } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';

const STORAGE_BUCKET = 'admin-backups';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  const { user, profile } = await apiUser();
  if (!user) return json({ error: 'Please sign in.' }, 401);
  if (profile?.status !== 'active' || profile.role !== 'admin') {
    return json({ error: 'Administrator access is required.' }, 403);
  }
  if (!/^frugl-db-backup-[0-9TZ-]+\.sql$/.test(filename)) {
    return json({ error: 'Backup file not found.' }, 404);
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error('Could not initialize database backup download:', error instanceof Error ? error.message : 'Unknown error');
    return json({ error: 'Database backups are temporarily unavailable.' }, 503);
  }

  const { data, error } = await admin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(filename, 60, { download: filename });
  if (error || !data?.signedUrl) {
    if (error) console.error('Could not sign database backup download:', error.message);
    return json({ error: 'Could not download this backup.' }, 404);
  }

  return NextResponse.redirect(data.signedUrl, {
    status: 302,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
