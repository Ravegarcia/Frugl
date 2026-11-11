import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function getSessionProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null as any };
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return { supabase, user, profile: profile as any };
}

export async function requireUser(next = '/') {
  const s = await getSessionProfile();
  if (!s.user) redirect('/login?next=' + encodeURIComponent(next));
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
