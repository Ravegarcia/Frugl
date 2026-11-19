import 'server-only';

import { cookies } from 'next/headers';
import type { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const APP_SESSION_COOKIE = 'frugl_session';

const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;
type AppSessionRow = {
  session_id: string;
  user_id: string;
  hard_expires_at: string;
  revoked_at: string | null;
};

export async function getAuthSessionIdentity(supabase: ServerSupabaseClient) {
  const { data, error } = await supabase.auth.getClaims();
  if (error) throw new Error(`Could not verify the authenticated session: ${error.message}`);

  const claims = data?.claims;
  if (!claims || !SESSION_ID_PATTERN.test(claims.session_id) || !SESSION_ID_PATTERN.test(claims.sub)) {
    return null;
  }

  return { sessionId: claims.session_id, userId: claims.sub };
}

async function findSession(sessionId: string): Promise<AppSessionRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('app_auth_sessions')
    .select('session_id, user_id, hard_expires_at, revoked_at')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (error) throw new Error(`Could not load the application session: ${error.message}`);
  return data;
}

async function touchSession(sessionId: string, userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('touch_app_auth_session', {
    p_session_id: sessionId,
    p_user_id: userId,
  });

  if (error) throw new Error(`Could not refresh the application session: ${error.message}`);
  return data === true;
}

async function resumeSession(row: AppSessionRow, userId: string) {
  if (row.user_id !== userId || row.revoked_at) return null;
  if (!(await touchSession(row.session_id, userId))) return null;
  return { sessionId: row.session_id, expiresAt: row.hard_expires_at };
}

export async function createOrResumeAppSession(
  supabase: ServerSupabaseClient,
  expectedUserId: string,
) {
  const identity = await getAuthSessionIdentity(supabase);
  if (!identity || identity.userId !== expectedUserId) return null;

  const existing = await findSession(identity.sessionId);
  if (existing) return resumeSession(existing, identity.userId);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('app_auth_sessions')
    .insert({ session_id: identity.sessionId, user_id: identity.userId })
    .select('session_id, user_id, hard_expires_at, revoked_at')
    .single();

  if (error?.code === '23505') {
    const concurrentSession = await findSession(identity.sessionId);
    if (concurrentSession) return resumeSession(concurrentSession, identity.userId);
  }
  if (error) throw new Error(`Could not create the application session: ${error.message}`);
  return data
    ? { sessionId: data.session_id, expiresAt: data.hard_expires_at }
    : null;
}

export async function validateAppSession(sessionId: string, userId: string) {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from('app_auth_sessions')
    .select('session_id')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .is('revoked_at', null)
    .gt('idle_expires_at', now)
    .gt('hard_expires_at', now)
    .maybeSingle();

  if (error) throw new Error(`Could not validate the application session: ${error.message}`);
  return Boolean(data);
}

export async function revokeAppSession(sessionId: string, userId: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from('app_auth_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .is('revoked_at', null);

  if (error) throw new Error(`Could not revoke the application session: ${error.message}`);
}

export async function touchAppSession(sessionId: string, userId: string) {
  return touchSession(sessionId, userId);
}

export async function setAppSessionCookie(sessionId: string, expiresAt: string) {
  const cookieStore = await cookies();
  cookieStore.set(APP_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(expiresAt),
  });
}

export async function clearAppSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(APP_SESSION_COOKIE);
}
