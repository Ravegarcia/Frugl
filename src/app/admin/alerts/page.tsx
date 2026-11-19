import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import EmptyState from '@/components/EmptyState';
import ListingStatusNav from '@/app/dashboard/ListingStatusNav';
import {
  ADMIN_PAGE_SIZE,
  adminPageHref,
  getAdminPageRange,
  parseAdminPage,
  parseAdminReportStatus,
} from '@/lib/admin/pagination';
import AdminActivityViewed from '../AdminActivityViewed';
import AdminPagination from '../AdminPagination';
import AdminLoading from '../loading';
import AdminChatAlertItem from './AdminChatAlertItem';

const alertStatusLabels = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'dismissed', label: 'Dismissed' },
] as const;

const chatAlertSelect = `
  *,
  messages (
    id,
    body,
    conversation_id,
    sender_id,
    sender:profiles!messages_sender_id_fkey(id, name)
  )
`;

function isMissingAlertStatus(error: { code?: string; message: string }) {
  return (
    ['42703', 'PGRST204'].includes(error.code ?? '') &&
    /\bstatus\b/i.test(error.message) &&
    /chat_alerts/i.test(error.message)
  );
}

type AdminAlertsPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default function AdminAlertsPage(props: AdminAlertsPageProps) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminAlertsContent {...props} />
    </Suspense>
  );
}

async function AdminAlertsContent({ searchParams }: AdminAlertsPageProps) {
  const { supabase } = await requireStaff();
  const params = await searchParams;
  const page = parseAdminPage(params.page);
  const status = parseAdminReportStatus(params.status);
  const { from, to } = getAdminPageRange(page);

  let alertQuery = supabase
    .from('chat_alerts')
    .select(chatAlertSelect, { count: 'exact' })
    .order('created_at', { ascending: false });
  if (status !== 'all') alertQuery = alertQuery.eq('status', status);

  const [
    alertsResult,
    openCountResult,
    resolvedCountResult,
    dismissedCountResult,
    allCountResult,
  ] = await Promise.all([
    alertQuery.range(from, to),
    supabase.from('chat_alerts').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('chat_alerts').select('id', { count: 'exact', head: true }).eq('status', 'resolved'),
    supabase.from('chat_alerts').select('id', { count: 'exact', head: true }).eq('status', 'dismissed'),
    supabase.from('chat_alerts').select('id', { count: 'exact', head: true }),
  ]);

  const queryErrors = [
    alertsResult.error,
    openCountResult.error,
    resolvedCountResult.error,
    dismissedCountResult.error,
    allCountResult.error,
  ].filter((error): error is NonNullable<typeof error> => error !== null);
  const migrationWarning = queryErrors.some(isMissingAlertStatus);
  const queryError = queryErrors.find((error) => !isMissingAlertStatus(error));
  if (queryError) {
    throw new Error(`Unable to load admin scam alerts: ${queryError.message}`);
  }

  let alerts = alertsResult.data;
  const alertCounts = {
    open: openCountResult.count ?? 0,
    resolved: resolvedCountResult.count ?? 0,
    dismissed: dismissedCountResult.count ?? 0,
    all: allCountResult.count ?? 0,
  };
  let totalCount = alertCounts[status];

  if (migrationWarning) {
    const fallbackResult = await supabase
      .from('chat_alerts')
      .select(chatAlertSelect, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);
    if (fallbackResult.error) {
      throw new Error(`Unable to load read-only scam alerts: ${fallbackResult.error.message}`);
    }

    alerts = fallbackResult.data;
    totalCount = fallbackResult.count ?? 0;
  }

  const tabs = alertStatusLabels.map((tab) => ({ ...tab, count: alertCounts[tab.key] }));
  const totalPages = Math.max(1, Math.ceil(totalCount / ADMIN_PAGE_SIZE));
  if (page > totalPages) {
    redirect(migrationWarning
      ? adminPageHref('/admin/alerts', totalPages)
      : adminPageHref('/admin/alerts', totalPages, { status }));
  }

  return (
    <div className='admin-queue-page admin-alerts-page'>
      <AdminActivityViewed eventType='chat_alert_created' />
      <header className='admin-queue-heading'>
        <div>
          <h1 id='admin-alerts-title'>Scam alerts</h1>
          <p>Review suspicious messages flagged by Frugl&apos;s detection system.</p>
        </div>
      </header>

      <section className='admin-panel admin-queue-panel' aria-labelledby='admin-alerts-title'>
        {migrationWarning ? (
          <p className='admin-alerts-migration-warning' role='status'>
            Scam alert moderation is read-only until you apply <code>supabase/15_chat_alert_status.sql</code>.
          </p>
        ) : (
          <ListingStatusNav
            tabs={tabs}
            activeTab={status}
            hrefBase='/admin/alerts'
            paramName='status'
            ariaLabel='Filter scam alerts by status'
          />
        )}
        {alerts?.length ? (
          <div className='admin-queue-list admin-alerts-list'>
            {alerts.map((alert: any) => (
              <AdminChatAlertItem
                key={alert.id}
                alert={{ ...alert, status: alert.status ?? 'open' }}
                showStatus={!migrationWarning && status === 'all'}
                readOnly={migrationWarning}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title={migrationWarning || status === 'all' ? 'No scam alerts yet' : `No ${status} alerts`}
            hint={!migrationWarning && status === 'open'
              ? 'New messages flagged for review will appear here.'
              : migrationWarning || status === 'all'
                ? 'New messages flagged for review will appear here.'
                : 'Try another status filter to review other alerts.'}
          />
        )}
        <AdminPagination
          path='/admin/alerts'
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          showSinglePage
          query={migrationWarning ? undefined : { status }}
        />
      </section>
    </div>
  );
}
