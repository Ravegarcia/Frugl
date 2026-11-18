import { apiUser, json } from '@/lib/api';
import { sellerListingStatusPatch } from '@/lib/listings/status';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profile } = await apiUser();
  if (!user) return json({ error: 'Please sign in.' }, 401);
  if (profile?.status !== 'active') return json({ error: 'Your account is suspended.' }, 403);
  if (profile.role === 'admin') return json({ error: 'Admin accounts cannot manage marketplace listings.' }, 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, 400);
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return json({ error: 'A listing status is required.' }, 400);
  }

  const requestedStatus = (body as Record<string, unknown>).status;
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('id, seller_id, status')
    .eq('id', id)
    .maybeSingle();

  if (listingError) {
    console.error('Could not verify listing status access:', listingError.message);
    return json({ error: 'Could not verify listing access.' }, 500);
  }
  if (!listing) return json({ error: 'Listing not found.' }, 404);
  if (listing.seller_id !== user.id) return json({ error: 'Forbidden.' }, 403);

  const patch = sellerListingStatusPatch(listing.status, requestedStatus);
  if (!patch) {
    return json({ error: 'This listing status change is not allowed.' }, 409);
  }

  const { data: updated, error: updateError } = await supabase
    .from('listings')
    .update(patch)
    .eq('id', id)
    .eq('seller_id', user.id)
    .eq('status', listing.status)
    .select('id, status')
    .maybeSingle();

  if (updateError) {
    console.error('Could not update listing status:', updateError.message);
    return json({ error: 'Could not update this listing status.' }, 500);
  }
  if (!updated) return json({ error: 'This listing changed. Refresh and try again.' }, 409);

  return json({ ok: true, status: updated.status });
}
