import { Suspense } from 'react';
import { requireStaff } from '@/lib/auth';
import type { ReactNode } from 'react';
import type { AdminActivityEvent } from '@/lib/admin/activity';
import AdminSidebar from './AdminSidebar';

async function AdminWorkspace({ children }: { children: ReactNode }) {
  const { supabase, user } = await requireStaff();
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

  return (
    <>
      <AdminSidebar
        staffId={user.id}
        initialActivityCounts={initialActivityCounts}
      />
      <div className='admin-dashboard-main'>{children}</div>
    </>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className='admin-dashboard'>
      <Suspense
        fallback={
          <div className='admin-workspace-loading' role='status' aria-label='Loading admin workspace'>
            <div className='admin-loading-surface admin-loading-sidebar' aria-hidden='true' />
            <div className='admin-loading-main' aria-hidden='true'>
              <div className='admin-loading-stats'>
                {Array.from({ length: 5 }, (_, index) => (
                  <div className='admin-loading-surface' key={index} />
                ))}
              </div>
              <div className='admin-loading-overview-layout'>
                <div className='admin-loading-surface admin-loading-map' />
                <div className='admin-loading-side-stack'>
                  <div className='admin-loading-surface' />
                  <div className='admin-loading-surface' />
                </div>
              </div>
            </div>
          </div>
        }
      >
        <AdminWorkspace>{children}</AdminWorkspace>
      </Suspense>
    </div>
  );
}
