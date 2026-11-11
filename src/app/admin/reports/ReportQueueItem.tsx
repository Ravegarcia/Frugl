'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { timeAgo } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function ReportQueueItem({ report }: { report: any }) {
  const supabase = createClient();
  const [status, setStatus] = useState(report.status);
  const [busy, setBusy] = useState(false);

  async function handleResolve(newStatus: 'resolved' | 'dismissed') {
    setBusy(true);
    try {
      const { error } = await supabase
        .from('reports')
        .update({ status: newStatus })
        .eq('id', report.id);

      if (!error) setStatus(newStatus);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className='p-4 space-y-2'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <span className='rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800 uppercase'>
            {report.target_type}
          </span>
          <span className='text-xs text-gray-500'>Reported by {report.reporter?.name || 'User'}</span>
          <span className='text-xs text-gray-400'>· {timeAgo(report.created_at)}</span>
        </div>
        <span className={`text-xs font-medium capitalize ${status === 'open' ? 'text-amber-600' : 'text-gray-400'}`}>
          {status}
        </span>
      </div>

      <p className='text-sm text-gray-800 font-medium'>
        Reason: <span className='font-normal text-gray-600'>{report.reason}</span>
      </p>

      <div className='flex items-center justify-between pt-1'>
        {report.target_type === 'listing' ? (
          <Link
            href={`/laptops/${report.target_id}`}
            target='_blank'
            className='text-xs text-emerald-700 underline font-medium'
          >
            Open Reported Listing ↗
          </Link>
        ) : (
          <Link
            href={`/sellers/${report.target_id}`}
            target='_blank'
            className='text-xs text-emerald-700 underline font-medium'
          >
            Open Reported User ↗
          </Link>
        )}

        {status === 'open' && (
          <div className='flex items-center gap-2'>
            <Button
              size='sm'
              variant='outline'
              disabled={busy}
              onClick={() => handleResolve('dismissed')}
              className='text-xs h-7'
            >
              Dismiss
            </Button>
            <Button
              size='sm'
              disabled={busy}
              onClick={() => handleResolve('resolved')}
              className='text-xs h-7 bg-emerald-700 text-white hover:bg-emerald-800'
            >
              Mark Resolved
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
