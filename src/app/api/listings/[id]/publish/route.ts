import { apiUser, json } from '@/lib/api';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await apiUser();
  if (!user) return json({ error: 'Please sign in.' }, 401);

  const { data: l } = await supabase
    .from('listings').select('*, listing_photos(id)').eq('id', id).eq('seller_id', user.id).maybeSingle();
  if (!l) return json({ error: 'Listing not found.' }, 404);

  const missing: string[] = [];
  if (!l.listing_photos?.length) missing.push('photos');
  if (!l.title?.trim()) missing.push('title');
  if (!(Number(l.price) > 0)) missing.push('price');
  if (!l.condition) missing.push('condition');
  if (!l.brand?.trim()) missing.push('brand');
  if (!l.model?.trim()) missing.push('model');
  if (!l.description?.trim()) missing.push('description');
  if (!l.deal_methods?.length) missing.push('deal method');
  if (!l.location?.trim()) missing.push('location');
  if (missing.length) return json({ error: 'Missing: ' + missing.join(', '), missing }, 400);

  const { error } = await supabase
    .from('listings')
    .update({ status: 'available', published_at: l.published_at ?? new Date().toISOString() })
    .eq('id', id);
  if (error) return json({ error: error.message }, 400);

  await supabase.from('identification_results').update({ confirmed_by_seller: true }).eq('listing_id', id);
  return json({ ok: true });
}
