import { requireStaff } from '@/lib/auth';
import type { ReactNode } from 'react';
import type { AdminActivityEvent } from '@/lib/admin/activity';
import AdminSidebar from './AdminSidebar';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { supabase, user, profile } = await requireStaff();
  const activityEvents: AdminActivityEvent[] = [
    'listing_created',
    'account_created',
    'report_created',
    'chat_alert_created',
  ];
  const activityResults = await Promise.all(
    activityEvents.map((eventType) =>
      supabase
        .from('admin_activity_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('staff_id', user.id)
        .eq('event_type', eventType)
        .is('read_at', null),
    ),
  );
  const failedActivityResult = activityResults.find((result) => result.error);
  if (failedActivityResult?.error) {
    throw new Error(`Unable to load admin activity counts: ${failedActivityResult.error.message}`);
  }
  const initialActivityCounts: Record<AdminActivityEvent, number> = {
    listing_created: activityResults[0]?.count ?? 0,
    account_created: activityResults[1]?.count ?? 0,
    report_created: activityResults[2]?.count ?? 0,
    chat_alert_created: activityResults[3]?.count ?? 0,
  };

  const name = profile?.name?.trim() || 'Admin';
  const roleLabel = profile?.role === 'admin' ? 'Administrator' : 'Moderator';

  return (
    <div className='admin-dashboard'>
      <AdminSidebar
        name={name}
        roleLabel={roleLabel}
        staffId={user.id}
        initialActivityCounts={initialActivityCounts}
      />
      <div className='admin-dashboard-main'>{children}</div>
    </div>
  );
}
