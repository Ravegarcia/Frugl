'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ExternalLink } from '@/components/icons';
import { Button } from '@/components/ui/button';
import TimeAgo from '@/components/TimeAgo';
import { createClient } from '@/lib/supabase/client';

export default function ReportQueueItem({
  report,
  showStatus,
}: {
  report: any;
  showStatus: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState(report.status);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleResolve(newStatus: 'resolved' | 'dismissed') {
    setBusy(true);
    setActionError(null);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(authError.message);
      if (!user) throw new Error('You must be signed in to update reports.');

      const { data: updated, error } = await supabase
        .from('reports')
        .update({ status: newStatus, resolved_by: report.resolved_by ?? user.id })
        .eq('id', report.id)
        .eq('status', 'open')
        .select('id')
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!updated) throw new Error('This report has already been updated. Refresh the queue.');
      setStatus(newStatus);
      router.refresh();
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
    <article className='admin-card admin-report-card' aria-busy={busy}>
      <header className='admin-report-card-header'>
        <div className='admin-report-card-labels'>
          <span className={`admin-report-type ${targetIsListing ? 'is-listing' : 'is-user'}`}>
            {targetIsListing ? 'Listing report' : 'User report'}
          </span>
          {showStatus && <span className={`admin-report-status is-${status}`}>{status}</span>}
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
              className='admin-queue-action is-dismiss'
            >
              Dismiss
            </Button>
            <Button
              type='button'
              size='sm'
              disabled={busy}
              onClick={() => handleResolve('resolved')}
              className='button-primary admin-queue-action is-resolve'
            >
              Mark resolved
            </Button>
          </div>
        )}
      </footer>

      {actionError && <p className='admin-queue-action-error' role='alert'>{actionError}</p>}
    </article>
  );
}
