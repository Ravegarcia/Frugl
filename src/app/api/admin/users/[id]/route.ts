import { apiUser, json } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';

type ProfileUpdate = {
  role?: unknown;
  status?: unknown;
  seller_verified?: unknown;
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
  if (id === user.id) return json({ error: 'You cannot change your own administrator account.' }, 409);

  let body: ProfileUpdate;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json({ error: 'A profile change is required.' }, 400);
  }

  const entries = Object.entries(body);
  if (entries.length !== 1) return json({ error: 'Update one account setting at a time.' }, 400);

  const [field, value] = entries[0];
  if (
    (field === 'role' && value !== 'buyer' && value !== 'admin')
    || (field === 'status' && value !== 'active' && value !== 'suspended')
    || (field === 'seller_verified' && typeof value !== 'boolean')
    || !['role', 'status', 'seller_verified'].includes(field)
  ) {
    return json({ error: 'This account change is not allowed.' }, 400);
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error('Could not initialize account management:', error instanceof Error ? error.message : 'Unknown error');
    return json({ error: 'Account management is temporarily unavailable.' }, 503);
  }

  const { data: target, error: targetError } = await admin
    .from('profiles')
    .select('role, status')
    .eq('id', id)
    .maybeSingle();
  if (targetError) {
    console.error('Could not load account for administration:', targetError.message);
    return json({ error: 'Could not load this account.' }, 500);
  }
  if (!target) return json({ error: 'Account not found.' }, 404);

  const removesActiveAdmin = target.role === 'admin'
    && target.status === 'active'
    && ((field === 'role' && value !== 'admin') || (field === 'status' && value !== 'active'));

  if (removesActiveAdmin) {
    const { count, error: countError } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('status', 'active');
    if (countError) {
      console.error('Could not verify active administrator count:', countError.message);
      return json({ error: 'Could not verify administrator access.' }, 500);
    }
    if ((count ?? 0) <= 1) {
      return json({ error: 'The last active administrator cannot be removed.' }, 409);
    }
  }

  const { error: updateError } = await admin
    .from('profiles')
    .update({ [field]: value })
    .eq('id', id);
  if (updateError) {
    console.error('Could not update account:', updateError.message);
    return json({ error: 'Could not update this account.' }, 500);
  }

  return json({ ok: true });
}
