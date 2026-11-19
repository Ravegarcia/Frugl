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
import ReportQueueItem from './ReportQueueItem';
import AdminLoading from '../loading';

const reportStatusLabels = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'dismissed', label: 'Dismissed' },
] as const;

type AdminReportsPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default function AdminReportsPage(props: AdminReportsPageProps) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminReportsContent {...props} />
    </Suspense>
  );
}

async function AdminReportsContent({
  searchParams,
}: AdminReportsPageProps) {
  const { supabase } = await requireStaff();
  const params = await searchParams;
  const page = parseAdminPage(params.page);
  const status = parseAdminReportStatus(params.status);
  const { from, to } = getAdminPageRange(page);

  let reportQuery = supabase
    .from('reports')
    .select(`
      *,
      reporter:profiles!reports_reporter_id_fkey(id, name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (status !== 'all') {
    reportQuery = reportQuery.eq('status', status);
  }

  const [
    { data: reports, error },
    openCountResult,
    resolvedCountResult,
    dismissedCountResult,
    totalCountResult,
  ] = await Promise.all([
    reportQuery.range(from, to),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'resolved'),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'dismissed'),
    supabase.from('reports').select('id', { count: 'exact', head: true }),
  ]);

  if (error) {
    throw new Error(`Unable to load admin reports: ${error.message}`);
  }

  const countError = [
    openCountResult.error,
    resolvedCountResult.error,
    dismissedCountResult.error,
    totalCountResult.error,
  ].find(Boolean);
  if (countError) {
    throw new Error(`Unable to load report status counts: ${countError.message}`);
  }

  const reportCounts = {
    open: openCountResult.count ?? 0,
    resolved: resolvedCountResult.count ?? 0,
    dismissed: dismissedCountResult.count ?? 0,
    all: totalCountResult.count ?? 0,
  };
  const reportTabs = reportStatusLabels.map((tab) => ({
    ...tab,
    count: reportCounts[tab.key],
  }));
  const filteredCount = reportCounts[status];
  const totalPages = Math.max(1, Math.ceil(filteredCount / ADMIN_PAGE_SIZE));
  if (page > totalPages) {
    redirect(adminPageHref('/admin/reports', totalPages, { status }));
  }

  return (
    <div className='admin-queue-page admin-reports-page'>
      <AdminActivityViewed eventType='report_created' />
      <header className='admin-queue-heading'>
        <div>
          <h1 id='admin-reports-title'>Report queue</h1>
          <p>Review reported listings and suspicious user activity.</p>
        </div>
      </header>

      <section className='admin-panel admin-queue-panel' aria-labelledby='admin-reports-title'>
        <ListingStatusNav
          tabs={reportTabs}
          activeTab={status}
          hrefBase='/admin/reports'
          paramName='status'
          ariaLabel='Filter reports by status'
        />
        {reports && reports.length > 0 ? (
          <div className='admin-queue-list admin-reports-list'>
            {reports.map((report: any) => (
              <ReportQueueItem key={report.id} report={report} showStatus={status === 'all'} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={status === 'all' ? 'No reports yet' : `No ${status} reports`}
            hint={status === 'open' ? 'The report queue is currently clear.' : 'Try another status filter to review reports.'}
          />
        )}
        <AdminPagination
          path='/admin/reports'
          page={page}
          totalPages={totalPages}
          totalCount={filteredCount}
          showSinglePage
          query={{ status }}
        />
      </section>
    </div>
  );
}
