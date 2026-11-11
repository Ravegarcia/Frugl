import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

export async function apiUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null as any };
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return { supabase, user, profile: profile as any };
}
