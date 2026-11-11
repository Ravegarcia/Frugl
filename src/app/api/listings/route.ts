import { apiUser, json } from '@/lib/api';

export async function POST() {
  const { supabase, user, profile } = await apiUser();
  if (!user) return json({ error: 'Please sign in.' }, 401);
  const { data, error } = await supabase
    .from('listings')
    .insert({ seller_id: user.id, location: profile?.default_location ?? '' })
    .select('id')
    .single();
  if (error) return json({ error: error.message }, 400);
  return json({ id: data.id });
}
