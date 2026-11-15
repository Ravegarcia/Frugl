'use server';

import { requireStaff } from '@/lib/auth';
import { markAdminActivityViewed, type AdminActivityEvent } from '@/lib/admin/activity';

export async function markAdminActivityViewedAction(eventType: AdminActivityEvent) {
  if (
    eventType !== 'listing_created'
    && eventType !== 'account_created'
    && eventType !== 'report_created'
    && eventType !== 'chat_alert_created'
  ) {
    throw new Error('Unsupported admin activity event type.');
  }

  const { supabase, user } = await requireStaff();
  await markAdminActivityViewed(supabase, user.id, eventType);
}
