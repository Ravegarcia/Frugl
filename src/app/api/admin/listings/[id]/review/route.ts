import { apiUser, json } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';

type ReviewRequest = {
  decision?: unknown;
  reason?: unknown;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { user, profile } = await apiUser();
  if (!user) return json({ error: 'Please sign in.' }, 401);
  if (profile?.status !== 'active' || profile.role !== 'admin') {
    return json({ error: 'Administrator access is required.' }, 403);
  }

  let body: ReviewRequest;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json({ error: 'A review decision is required.' }, 400);
  }

  if (body.decision !== 'approve' && body.decision !== 'reject') {
    return json({ error: 'Choose approve or reject.' }, 400);
  }

  if (body.reason !== undefined && typeof body.reason !== 'string') {
    return json({ error: 'The rejection reason must be text.' }, 400);
  }
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (body.decision === 'reject' && reason.length > 1000) {
    return json({ error: 'The rejection reason must be 1000 characters or fewer.' }, 400);
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error('Could not initialize listing review:', error instanceof Error ? error.message : 'Unknown error');
    return json({ error: 'Listing review is temporarily unavailable.' }, 503);
  }

  const reviewedAt = new Date().toISOString();
  const patch = body.decision === 'approve'
    ? {
        status: 'available',
        is_visible: true,
        review_reason: null,
        reviewed_at: reviewedAt,
        reviewed_by: user.id,
        published_at: reviewedAt,
      }
    : {
        status: 'rejected',
        review_reason: reason || null,
        reviewed_at: reviewedAt,
        reviewed_by: user.id,
      };

  const { data: listing, error } = await admin
    .from('listings')
    .update(patch)
    .eq('id', id)
    .eq('status', 'pending_review')
    .select('id, status, review_reason')
    .maybeSingle();

  if (error) {
    console.error('Could not save listing review:', error.message);
    return json({ error: 'Could not save this listing review.' }, 500);
  }
  if (!listing) {
    return json({ error: 'This listing is no longer awaiting review. Refresh the queue.' }, 409);
  }

  return json({ ok: true, listing });
}
