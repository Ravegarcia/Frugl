import { apiUser, json } from '@/lib/api';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profile } = await apiUser();
  if (!user) return json({ error: 'Please sign in.' }, 401);
  if (profile?.role === 'admin') return json({ error: 'Admin accounts cannot publish marketplace listings.' }, 403);
  if (profile?.status !== 'active') return json({ error: 'Your account is suspended.' }, 403);

  const { data: l, error: listingError } = await supabase
    .from('listings').select('*, listing_photos(id)').eq('id', id).eq('seller_id', user.id).maybeSingle();
  if (listingError) {
    console.error('Could not load listing to publish:', listingError.message);
    return json({ error: 'Could not verify this listing.' }, 500);
  }
  if (!l) return json({ error: 'Listing not found.' }, 404);
  if (l.status !== 'draft' && l.status !== 'rejected') {
    return json({ error: 'Only drafts and rejected listings can be submitted for review.' }, 409);
  }

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

  const { data: submitted, error } = await supabase
    .from('listings')
    .update({
      status: 'pending_review',
      review_reason: null,
      reviewed_at: null,
      reviewed_by: null,
      published_at: null,
    })
    .eq('id', id)
    .eq('status', l.status)
    .select('id')
    .maybeSingle();
  if (error) {
    console.error('Could not submit listing for review:', error.message);
    return json({ error: 'Could not submit this listing for review.' }, 500);
  }
  if (!submitted) {
    return json({ error: 'This listing changed. Refresh and try again.' }, 409);
  }

  const { error: identificationError } = await supabase
    .from('identification_results')
    .update({ confirmed_by_seller: true })
    .eq('listing_id', id);
  if (identificationError) {
    console.error('Could not record seller confirmation:', identificationError.message);
  }
  return json({ ok: true, status: 'pending_review' });
}
