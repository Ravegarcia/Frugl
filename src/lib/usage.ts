import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveUsageLimit, type UsageLimitResult } from '@/lib/usage-policy';

export const LIMITS = { identify: 15, message: 200, upload: 60, view: 300 };

export async function withinLimit(userId: string, action: keyof typeof LIMITS): Promise<UsageLimitResult> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc('bump_usage', {
      p_user: userId,
      p_action: action,
      p_limit: LIMITS[action],
    });
    if (error) {
      console.error('Usage counter failed:', error.message);
      return resolveUsageLimit(null, true);
    }
    return resolveUsageLimit(data, false);
  } catch (error) {
    console.error('Usage counter failed:', error instanceof Error ? error.message : 'Unknown error');
    return resolveUsageLimit(null, true);
  }
}
