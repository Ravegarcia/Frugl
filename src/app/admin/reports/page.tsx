import { requireStaff } from '@/lib/auth';
import EmptyState from '@/components/EmptyState';
import AdminActivityViewed from '../AdminActivityViewed';
import ReportQueueItem from './ReportQueueItem';

export default async function AdminReportsPage() {
  const { supabase } = await requireStaff();

  // Fetch open reports
  const { data: reports } = await supabase
    .from('reports')
    .select(`
      *,
      reporter:profiles!reports_reporter_id_fkey(id, name)
    `)
    .order('created_at', { ascending: false });

  return (
    <main className='admin-reports-page'>
      <AdminActivityViewed eventType='report_created' />
      <header className='admin-reports-header'>
        <div>
          <p className='admin-eyebrow'>Trust &amp; safety</p>
          <h1>Report queue</h1>
          <p>Review reported listings and suspicious user activity.</p>
        </div>
      </header>

      {reports && reports.length > 0 ? (
        <div className='admin-reports-list'>
          {reports.map((r: any) => (
            <ReportQueueItem key={r.id} report={r} />
          ))}
        </div>
      ) : (
        <EmptyState
          title='No open reports'
          hint='The report queue is currently clean.'
        />
      )}
    </main>
  );
}
