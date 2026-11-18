import { timingSafeEqual } from 'node:crypto';
import { json } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';

function isAuthorized(request: Request, secret: string) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return false;

  const provided = Buffer.from(authorization.slice('Bearer '.length));
  const expected = Buffer.from(secret);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !process.env.SUPABASE_SECRET_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('Reservation cleanup is missing required server configuration.');
    return json({ error: 'Scheduled reservation cleanup is not configured.' }, 503, { 'Retry-After': '300' });
  }
  if (!isAuthorized(request, secret)) return json({ error: 'Unauthorized.' }, 401);

  try {
    const admin = createAdminClient();
    const { error } = await admin.rpc('release_expired_reservations');
    if (error) {
      console.error('Could not release expired reservations:', error.message);
      return json({ error: 'Could not release expired reservations.' }, 503, { 'Retry-After': '300' });
    }
  } catch (error) {
    console.error('Could not release expired reservations:', error instanceof Error ? error.message : 'Unknown error');
    return json({ error: 'Could not release expired reservations.' }, 503, { 'Retry-After': '300' });
  }

  return json({ ok: true });
}
