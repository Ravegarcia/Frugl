import { apiUser, json } from '@/lib/api';

export async function POST() {
  const { supabase, user, profile } = await apiUser();
  if (!user) return json({ error: 'Please sign in.' }, 401);
  if (profile?.role === 'admin') return json({ error: 'Admin accounts cannot create marketplace listings.' }, 403);
  if (profile?.status !== 'active') return json({ error: 'Your account is suspended.' }, 403);
  const { data, error } = await supabase
    .from('listings')
    .insert({
      seller_id: user.id,
      location: profile?.default_location ?? '',
      location_lat: profile?.location_lat ?? null,
      location_lng: profile?.location_lng ?? null,
      location_label: profile?.location_label ?? null,
    })
    .select('id')
    .single();
  if (error) {
    console.error('Could not create listing draft:', error.message);
    return json({ error: 'Could not create a listing draft.' }, 500);
  }
  return json({ id: data.id }, 201);
}
