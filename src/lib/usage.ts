import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export const LIMITS = { identify: 15, message: 200, upload: 60 };

export async function withinLimit(userId: string, action: keyof typeof LIMITS) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('bump_usage', { p_user: userId, p_action: action, p_limit: LIMITS[action] });
  if (error) {
    console.error('usage counter failed', error.message);
    return true;
  }
  return data === true;
}
