import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function getSessionProfile() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null as any };
  const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (error) throw new Error(`Unable to load account profile: ${error.message}`);
  return { supabase, user, profile };
}

export async function requireUser(next = '/') {
  const s = await getSessionProfile();
  if (!s.user) redirect('/login?next=' + encodeURIComponent(next));
  return s;
}

export async function requireMarketplaceUser(next = '/') {
  const s = await requireUser(next);
  if (s.profile?.role === 'admin') redirect('/admin');
  return s;
}

export function isStaff(profile: any) {
  return !!profile && profile.status === 'active' && ['moderator', 'admin'].includes(profile.role);
}

export async function requireStaff() {
  const s = await requireUser('/admin');
  if (!isStaff(s.profile)) redirect('/');
  return s;
}
