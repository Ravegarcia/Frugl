import { apiUser, json } from '@/lib/api';
import { validateListingPatch } from '@/lib/listings/validation';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await apiUser();

  const { data: listing, error } = await supabase
    .from('listings')
    .select('*, listing_photos(*), condition_reports(*)')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Could not load listing:', error.message);
    return json({ error: 'Could not load this listing.' }, 500);
  }
  if (!listing) return json({ error: 'Listing not found.' }, 404);

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
  if (profile?.status !== 'active') return json({ error: 'Your account is suspended.' }, 403);

  // Check ownership or staff
  const { data: existing, error: existingError } = await supabase
    .from('listings')
    .select('id, seller_id, status, location, location_lat, location_lng, location_label')
    .eq('id', id)
    .maybeSingle();

  if (existingError) {
    console.error('Could not verify listing update access:', existingError.message);
    return json({ error: 'Could not verify listing access.' }, 500);
  }
  if (!existing) return json({ error: 'Listing not found.' }, 404);

  const isOwner = existing.seller_id === user.id;
  const isStaff = profile?.status === 'active' && profile?.role === 'admin';
  if (!isOwner && !isStaff) return json({ error: 'Forbidden.' }, 403);
  if (isOwner && existing.status === 'pending_review') {
    return json({ error: 'This listing is awaiting review and cannot be edited.' }, 409);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, 400);
  }

  const validation = validateListingPatch(body);
  if (validation.valid === false) return json({ error: validation.error }, 422);

  const patch = validation.patch;
  const includesCoordinates =
    Object.prototype.hasOwnProperty.call(patch, 'location_lat') &&
    Object.prototype.hasOwnProperty.call(patch, 'location_lng');
  if (
    typeof patch.location === 'string' &&
    patch.location !== existing.location &&
    !includesCoordinates
  ) {
    patch.location_lat = null;
    patch.location_lng = null;
    patch.location_label = null;
  }

  const { data, error } = await supabase
    .from('listings')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Could not update listing:', error.message);
    return json({ error: 'Could not save listing changes.' }, 500);
  }

  return json({ ok: true, listing: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profile } = await apiUser();
  if (!user) return json({ error: 'Please sign in.' }, 401);
  if (profile?.status !== 'active') return json({ error: 'Your account is suspended.' }, 403);

  const { data: existing, error: existingError } = await supabase
    .from('listings')
    .select('id, seller_id')
    .eq('id', id)
    .maybeSingle();

  if (existingError) {
    console.error('Could not verify listing delete access:', existingError.message);
    return json({ error: 'Could not verify listing access.' }, 500);
  }
  if (!existing) return json({ error: 'Listing not found.' }, 404);

  const isOwner = existing.seller_id === user.id;
  const isStaff = profile?.status === 'active' && profile?.role === 'admin';
  if (!isOwner && !isStaff) return json({ error: 'Forbidden.' }, 403);

  const { error } = await supabase.from('listings').delete().eq('id', id);
  if (error) {
    console.error('Could not delete listing:', error.message);
    return json({ error: 'Could not delete this listing.' }, 500);
  }

  return json({ ok: true });
}
