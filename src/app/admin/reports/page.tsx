import { requireStaff } from '@/lib/auth';
import { timeAgo } from '@/lib/format';
import Link from 'next/link';
import EmptyState from '@/components/EmptyState';
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
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Report Queue</h1>
          <p className='text-sm text-gray-500'>Review reported listings and suspicious user activity.</p>
        </div>
        <Link href='/admin' className='text-xs text-gray-500 underline'>
          Back to Admin Hub
        </Link>
      </div>

      {reports && reports.length > 0 ? (
        <div className='divide-y rounded-xl border bg-white shadow-sm overflow-hidden'>
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
    </div>
  );
}
