import { apiUser, json } from '@/lib/api';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await apiUser();

  const { data: listing, error } = await supabase
    .from('listings')
    .select('*, listing_photos(*), condition_reports(*)')
    .eq('id', id)
    .maybeSingle();

  if (error || !listing) return json({ error: 'Listing not found.' }, 404);

  // Drafts are visible only to the seller
  if (listing.status === 'draft' && listing.seller_id !== user?.id) {
    return json({ error: 'Not authorized to view this draft.' }, 403);
  }

  return json({ listing });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profile } = await apiUser();
  if (!user) return json({ error: 'Please sign in.' }, 401);

  // Check ownership or staff
  const { data: existing } = await supabase
    .from('listings')
    .select('id, seller_id, status')
    .eq('id', id)
    .maybeSingle();

  if (!existing) return json({ error: 'Listing not found.' }, 404);

  const isOwner = existing.seller_id === user.id;
  const isStaff = profile?.status === 'active' && ['moderator', 'admin'].includes(profile?.role);
  if (!isOwner && !isStaff) return json({ error: 'Forbidden.' }, 403);

  const body = await request.json();

  // Pick allowed editable fields
  const allowed = [
    'title',
    'description',
    'price',
    'brand',
    'model',
    'condition',
    'deal_methods',
    'location',
    'address_detail',
    'cpu',
    'gpu',
    'screen_size',
    'ram',
    'storage',
  ];

  const patch: Record<string, any> = {};
  for (const k of allowed) {
    if (k in body) patch[k] = body[k];
  }

  const { data, error } = await supabase
    .from('listings')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) return json({ error: error.message }, 400);

  return json({ ok: true, listing: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profile } = await apiUser();
  if (!user) return json({ error: 'Please sign in.' }, 401);

  const { data: existing } = await supabase
    .from('listings')
    .select('id, seller_id')
    .eq('id', id)
    .maybeSingle();

  if (!existing) return json({ error: 'Listing not found.' }, 404);

  const isOwner = existing.seller_id === user.id;
  const isStaff = profile?.status === 'active' && ['moderator', 'admin'].includes(profile?.role);
  if (!isOwner && !isStaff) return json({ error: 'Forbidden.' }, 403);

  const { error } = await supabase.from('listings').delete().eq('id', id);
  if (error) return json({ error: error.message }, 400);

  return json({ ok: true });
}
