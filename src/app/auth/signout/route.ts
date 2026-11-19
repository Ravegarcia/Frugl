import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  clearAppSessionCookie,
  getAuthSessionIdentity,
  revokeAppSession,
} from '@/lib/auth/session';

export async function POST(request: Request) {
  const supabase = await createClient();

  let identity: Awaited<ReturnType<typeof getAuthSessionIdentity>> = null;
  try {
    identity = await getAuthSessionIdentity(supabase);
  } catch (error) {
    console.error('Could not identify the application session during sign out:', error instanceof Error ? error.message : 'Unknown error');
  }

  if (identity) {
    try {
      await revokeAppSession(identity.sessionId, identity.userId);
    } catch (error) {
      console.error('Could not revoke the application session during sign out:', error instanceof Error ? error.message : 'Unknown error');
      return NextResponse.json({ error: 'Could not safely end this session. Please try again.' }, { status: 503 });
    }
  }

  try {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      console.error('Could not terminate the local session:', error.message);
      return NextResponse.json({ error: 'Could not sign out. Please try again.' }, { status: 503 });
    }
  } catch (error) {
    console.error('Could not terminate the local session:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Could not sign out. Please try again.' }, { status: 503 });
  }
  await clearAppSessionCookie();
  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
