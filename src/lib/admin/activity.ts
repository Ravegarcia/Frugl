import 'server-only';
import type { createClient } from '@/lib/supabase/server';

export type AdminActivityEvent =
  | 'listing_created'
  | 'account_created'
  | 'report_created'
  | 'chat_alert_created';

export async function markAdminActivityViewed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  staffId: string,
  eventType: AdminActivityEvent,
) {
  const { error } = await supabase
    .from('admin_activity_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('staff_id', staffId)
    .eq('event_type', eventType)
    .is('read_at', null);

  if (error) {
    throw new Error(`Unable to clear ${eventType} notifications: ${error.message}`);
  }
}
