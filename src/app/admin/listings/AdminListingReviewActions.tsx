'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, X } from '@/components/icons';

export default function AdminListingReviewActions({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function review(decision: 'approve' | 'reject') {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/listings/${encodeURIComponent(listingId)}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason }),
      });
      const result: unknown = await response.json();
      const message = typeof result === 'object'
        && result !== null
        && 'error' in result
        && typeof result.error === 'string'
        ? result.error
        : 'Could not save this listing review.';
      if (!response.ok) throw new Error(message);
      router.refresh();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Could not save this listing review.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className='admin-listing-review-actions' aria-busy={busy}>
      <button
        type='button'
        className='admin-listing-action is-approve'
        disabled={busy}
        onClick={() => void review('approve')}
      >
        <CheckCircle size={15} />
        Approve
      </button>
      <button
        type='button'
        className='admin-listing-action is-reject'
        disabled={busy}
        aria-expanded={rejecting}
        onClick={() => {
          setRejecting((open) => !open);
          setError(null);
        }}
      >
        <X size={15} />
        Reject
      </button>
      {rejecting && (
        <div className='admin-listing-reject-form'>
          <label htmlFor={`listing-rejection-${listingId}`}>Reason for rejection</label>
          <textarea
            id={`listing-rejection-${listingId}`}
            value={reason}
            maxLength={1000}
            rows={3}
            onChange={(event) => setReason(event.target.value)}
            placeholder='Explain what the seller needs to correct.'
            disabled={busy}
          />
          <div className='admin-listing-reject-footer'>
            <span>{reason.trim().length}/1000</span>
            <button type='button' disabled={busy || !reason.trim()} onClick={() => void review('reject')}>
              Send rejection
            </button>
          </div>
        </div>
      )}
      {error && <p className='admin-listing-action-error' role='alert'>{error}</p>}
    </div>
  );
}
