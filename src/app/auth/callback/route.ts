import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  let next = searchParams.get('next') ?? '/';
  if (!next.startsWith('/') || next.startsWith('//')) next = '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error(`Unable to verify authenticated user: ${userError.message}`);

      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (profileError) throw new Error(`Unable to load account role: ${profileError.message}`);
        if (profile.role === 'admin' && !['/reset-password', '/verify'].includes(next)) next = '/admin';
      }

      return NextResponse.redirect(origin + next);
    }
  }
  return NextResponse.redirect(origin + '/login?error=auth');
}
