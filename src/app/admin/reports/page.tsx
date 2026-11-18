import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import EmptyState from '@/components/EmptyState';
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

const reportStatusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'all', label: 'All reports' },
] as const;

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
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
  const filteredCount = reportCounts[status];
  const totalPages = Math.max(1, Math.ceil(filteredCount / ADMIN_PAGE_SIZE));
  if (page > totalPages) {
    redirect(adminPageHref('/admin/reports', totalPages, { status }));
  }

  return (
    <div className='admin-reports-page'>
      <AdminActivityViewed eventType='report_created' />
      <header className='admin-reports-header'>
        <div>
          <p className='admin-eyebrow'>Trust &amp; safety</p>
          <h1>Report queue</h1>
          <p>Review reported listings and suspicious user activity.</p>
        </div>
      </header>

      <div className='admin-reports-toolbar'>
        <nav className='admin-reports-filters' aria-label='Filter reports by status'>
          {reportStatusOptions.map((option) => (
            <Link
              key={option.value}
              href={adminPageHref('/admin/reports', 1, { status: option.value })}
              className={`admin-report-filter${status === option.value ? ' is-active' : ''}`}
              aria-current={status === option.value ? 'page' : undefined}
            >
              {option.label}
              <span className='admin-report-filter-count'>
                {reportCounts[option.value].toLocaleString()}
              </span>
            </Link>
          ))}
        </nav>
        <span className='admin-reports-count'>
          {filteredCount.toLocaleString()} {filteredCount === 1 ? 'report' : 'reports'}
        </span>
      </div>

      {reports && reports.length > 0 ? (
        <div className='admin-reports-list'>
          {reports.map((r: any) => (
            <ReportQueueItem key={r.id} report={r} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={status === 'all' ? 'No reports yet' : `No ${status} reports`}
          hint={status === 'open' ? 'The report queue is currently clean.' : 'Try another status filter to review other reports.'}
        />
      )}
      <AdminPagination
        path='/admin/reports'
        page={page}
        totalPages={totalPages}
        query={{ status }}
      />
    </div>
  );
}
