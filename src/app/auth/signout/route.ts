import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
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
  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
