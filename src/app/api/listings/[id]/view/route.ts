import { apiUser, json } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { withinLimit } from '@/lib/usage';
import { secondsUntilDailyReset } from '@/lib/usage-policy';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return json({ error: 'Listing not found.' }, 404);

  const { supabase, user, profile } = await apiUser();
  if (!user) return json({ error: 'Please sign in.' }, 401);
  if (profile?.role === 'admin' || profile?.status !== 'active') {
    return json({ counted: false });
  }

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('seller_id')
    .eq('id', id)
    .maybeSingle();

  if (listingError) {
    console.error('Could not verify listing view:', listingError.message);
    return json({ error: 'Could not record this listing view.' }, 500);
  }
  if (!listing) return json({ error: 'Listing not found.' }, 404);
  if (listing.seller_id === user.id) return json({ counted: false });

  const limit = await withinLimit(user.id, 'view');
  if (limit === 'unavailable') {
    return json({ error: 'We could not verify your view limit. Please try again shortly.' }, 503, { 'Retry-After': '60' });
  }
  if (limit === 'limited') {
    return json({ error: 'Daily view-counting limit reached.' }, 429, { 'Retry-After': String(secondsUntilDailyReset()) });
  }

  if (!process.env.SUPABASE_SECRET_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('Listing view tracking is missing Supabase server configuration.');
    return json({ error: 'Listing view tracking is temporarily unavailable.' }, 503, { 'Retry-After': '60' });
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.rpc('increment_views', { p_listing: id });
    if (error) {
      console.error('Could not increment listing views:', error.message);
      return json({ error: 'Listing view tracking is temporarily unavailable.' }, 503, { 'Retry-After': '60' });
    }
  } catch (error) {
    console.error('Could not increment listing views:', error instanceof Error ? error.message : 'Unknown error');
    return json({ error: 'Listing view tracking is temporarily unavailable.' }, 503, { 'Retry-After': '60' });
  }

  return json({ counted: true });
}
