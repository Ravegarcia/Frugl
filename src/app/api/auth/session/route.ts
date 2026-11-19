import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  clearAppSessionCookie,
  createOrResumeAppSession,
  revokeAppSession,
  setAppSessionCookie,
} from '@/lib/auth/session';

export async function POST() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Please sign in to start a session.' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Could not verify account access while starting a session:', profileError.message);
    return NextResponse.json({ error: 'Could not verify account access.' }, { status: 503 });
  }
  if (profile.status !== 'active') {
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
    if (signOutError) console.error('Could not clear the suspended local session:', signOutError.message);
    await clearAppSessionCookie();
    return NextResponse.json({ error: 'Your account is suspended.' }, { status: 403 });
  }

  let sessionId: string | null = null;
  try {
    const session = await createOrResumeAppSession(supabase, user.id);
    if (!session) {
      return NextResponse.json({ error: 'Please sign in again to start a new session.' }, { status: 401 });
    }

    sessionId = session.sessionId;
    await setAppSessionCookie(session.sessionId, session.expiresAt);
    return NextResponse.json(
      { ok: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (sessionId) {
      try {
        await revokeAppSession(sessionId, user.id);
      } catch (revokeError) {
        console.error('Could not revoke a session that failed to initialize:', revokeError instanceof Error ? revokeError.message : 'Unknown error');
      }
    }
    console.error('Could not establish the application session:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Could not establish a secure session.' }, { status: 503 });
  }
}
