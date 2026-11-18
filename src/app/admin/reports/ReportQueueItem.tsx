'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ExternalLink } from '@/components/icons';
import { Button } from '@/components/ui/button';
import TimeAgo from '@/components/TimeAgo';
import { createClient } from '@/lib/supabase/client';

export default function ReportQueueItem({ report }: { report: any }) {
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState(report.status);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleResolve(newStatus: 'resolved' | 'dismissed') {
    setBusy(true);
    setActionError(null);
    try {
      const { error } = await supabase
        .from('reports')
        .update({ status: newStatus })
        .eq('id', report.id);

      if (error) setActionError(error.message);
      else {
        setStatus(newStatus);
        router.refresh();
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to update this report.');
    } finally {
      setBusy(false);
    }
  }

  const targetIsListing = report.target_type === 'listing';
  const targetHref = targetIsListing
    ? `/laptops/${report.target_id}`
    : `/sellers/${report.target_id}`;

  return (
    <article className='admin-report-card' aria-busy={busy}>
      <header className='admin-report-card-header'>
        <div className='admin-report-card-labels'>
          <span className={`admin-report-type ${targetIsListing ? 'is-listing' : 'is-user'}`}>
            {targetIsListing ? 'Listing report' : 'User report'}
          </span>
          <span className={`admin-report-status is-${status}`}>{status}</span>
        </div>
        <p className='admin-report-reporter'>
          Reported by <strong>{report.reporter?.name || 'User'}</strong>
          <span aria-hidden='true'> · </span>
          <TimeAgo timestamp={report.created_at} />
        </p>
      </header>

      <div className='admin-report-reason'>
        <p className='admin-report-reason-label'>Reason for report</p>
        <p>{report.reason || 'No reason provided.'}</p>
      </div>

      <footer className='admin-report-card-footer'>
        <Link
          href={targetHref}
          target='_blank'
          rel='noopener noreferrer'
          className='admin-report-target-link'
        >
          Open reported {targetIsListing ? 'listing' : 'user'} <ExternalLink size={14} />
        </Link>

        {status === 'open' && (
          <div className='admin-report-actions'>
            <Button
              type='button'
              size='sm'
              variant='outline'
              disabled={busy}
              onClick={() => handleResolve('dismissed')}
              className='admin-report-action is-dismiss'
            >
              Dismiss
            </Button>
            <Button
              type='button'
              size='sm'
              disabled={busy}
              onClick={() => handleResolve('resolved')}
              className='admin-report-action is-resolve'
            >
              Mark resolved
            </Button>
          </div>
        )}
      </footer>

      {actionError && <p className='admin-report-action-error' role='alert'>{actionError}</p>}
    </article>
  );
}
