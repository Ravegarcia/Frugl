import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import {
  APP_SESSION_COOKIE,
  clearAppSessionCookie,
  getAuthSessionIdentity,
  touchAppSession,
} from '@/lib/auth/session';

async function clearLocalSession(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) console.error('Could not clear the expired local session:', error.message);
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    await clearAppSessionCookie();
    return NextResponse.json({ error: 'Your session has ended.' }, { status: 401 });
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(APP_SESSION_COOKIE)?.value;
  try {
    const identity = await getAuthSessionIdentity(supabase);
    if (!sessionCookie || !identity || identity.sessionId !== sessionCookie || identity.userId !== user.id) {
      await clearLocalSession(supabase);
      await clearAppSessionCookie();
      return NextResponse.json({ error: 'Your session has ended.' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Could not verify account access during session renewal:', profileError.message);
      return NextResponse.json({ error: 'Could not verify account access.' }, { status: 503 });
    }
    if (profile.status !== 'active') {
      await clearLocalSession(supabase);
      await clearAppSessionCookie();
      return NextResponse.json({ error: 'Your account is suspended.' }, { status: 403 });
    }

    if (!(await touchAppSession(identity.sessionId, user.id))) {
      await clearLocalSession(supabase);
      await clearAppSessionCookie();
      return NextResponse.json({ error: 'Your session has expired.' }, { status: 401 });
    }

    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Could not renew the application session:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Could not renew your session.' }, { status: 503 });
  }
}
