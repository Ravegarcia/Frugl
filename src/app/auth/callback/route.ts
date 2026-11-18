import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeRedirectPath } from '@/lib/auth/redirect';

async function clearLocalSession(supabase: Awaited<ReturnType<typeof createClient>>) {
  try {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) console.error('Could not clear the local OAuth session:', error.message);
  } catch (error) {
    console.error('Could not clear the local OAuth session:', error instanceof Error ? error.message : 'Unknown error');
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  let next = safeRedirectPath(searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Could not verify the OAuth session:', userError.message);
        await clearLocalSession(supabase);
        return NextResponse.redirect(new URL('/login?error=auth', request.url));
      }
      if (!user) {
        console.error('OAuth callback completed without an authenticated user.');
        await clearLocalSession(supabase);
        return NextResponse.redirect(new URL('/login?error=auth', request.url));
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role,status')
        .eq('id', user.id)
        .single();
      if (profileError) {
        console.error('Could not load the OAuth account profile:', profileError.message);
        await clearLocalSession(supabase);
        return NextResponse.redirect(new URL('/login?error=auth', request.url));
      }
      if (profile.status !== 'active') {
        await clearLocalSession(supabase);
        return NextResponse.redirect(new URL('/account-suspended', request.url));
      }
      if (profile.role === 'admin' && !['/reset-password', '/verify'].includes(next)) next = '/admin';

      return NextResponse.redirect(new URL(next, request.url));
    }
  }
  return NextResponse.redirect(new URL('/login?error=auth', request.url));
}
