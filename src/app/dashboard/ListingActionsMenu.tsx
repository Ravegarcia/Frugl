'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { CheckCircle, ChevronDown, Edit3, ExternalLink, MessageCircle, ShieldCheck, Trash } from '@/components/icons';
import Chevron from '@/components/motion/Chevron';
import Popover from '@/components/motion/Popover';

type Props = {
  listingId: string;
  title: string;
  status: string;
  messageCount: number;
};

export default function ListingActionsMenu({ listingId, title, status, messageCount }: Props) {
  const router = useRouter();
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null);
  const menuId = `listing-actions-${listingId}`;

  const runAction = async (action: 'status' | 'delete', targetStatus?: string) => {
    if (action === 'delete' && !window.confirm(`Delete "${title}"? This cannot be undone.`)) return;

    setIsBusy(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/listings/${encodeURIComponent(listingId)}${action === 'status' ? '/status' : ''}`, {
        method: action === 'status' ? 'PATCH' : 'DELETE',
        ...(action === 'status'
          ? {
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: targetStatus }),
            }
          : {}),
      });
      const result: unknown = await response.json();
      const errorMessage = typeof result === 'object' &&
        result !== null &&
        'error' in result &&
        typeof result.error === 'string'
        ? result.error
        : 'Could not complete this listing action.';
      if (!response.ok) throw new Error(errorMessage);

      setIsOpen(false);
      setFeedback({
        message: action === 'delete'
          ? 'Listing deleted.'
          : `Listing marked as ${targetStatus === 'available' ? 'active' : targetStatus}.`,
        isError: false,
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        message: error instanceof Error ? error.message : 'Could not complete this listing action.',
        isError: true,
      });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className='seller-dashboard-action-menu' ref={menuContainerRef}>
      <button
        type='button'
        className='seller-dashboard-action-trigger'
        aria-expanded={isOpen}
        aria-controls={menuId}
        disabled={isBusy}
        onClick={() => setIsOpen((open) => !open)}
      >
        Actions
        <Chevron open={isOpen}><ChevronDown size={13} /></Chevron>
      </button>
      <Popover
        open={isOpen}
        onClose={() => setIsOpen(false)}
        anchorRef={menuContainerRef}
        id={menuId}
        className='seller-dashboard-action-popover'
        ariaLabel='Listing actions'
      >
        {status !== 'pending_review' && (
          <Link href={`/sell/${listingId}`} onClick={() => setIsOpen(false)}>
            <Edit3 size={15} />
            <span>{status === 'rejected' ? 'Update listing' : 'Edit listing'}</span>
          </Link>
        )}
        {status !== 'draft' && status !== 'pending_review' && status !== 'rejected' && (
          <Link href={`/laptops/${listingId}`} onClick={() => setIsOpen(false)}>
            <ExternalLink size={15} />
            <span>View listing</span>
          </Link>
        )}
        <Link href={`/messages?listingId=${encodeURIComponent(listingId)}`} onClick={() => setIsOpen(false)}>
          <MessageCircle size={15} />
          <span>View messages ({messageCount} conversations)</span>
        </Link>

        {(status === 'available' || status === 'reserved') && (
          <div className='seller-dashboard-action-separator' aria-hidden='true' />
        )}
        {status === 'available' && (
          <button type='button' disabled={isBusy} onClick={() => runAction('status', 'reserved')}>
            <ShieldCheck size={15} />
            <span>Mark as reserved</span>
          </button>
        )}
        {status === 'reserved' && (
          <button type='button' disabled={isBusy} onClick={() => runAction('status', 'available')}>
            <ShieldCheck size={15} />
            <span>Mark as active</span>
          </button>
        )}
        {(status === 'available' || status === 'reserved') && (
          <button type='button' disabled={isBusy} onClick={() => runAction('status', 'sold')}>
            <CheckCircle size={15} />
            <span>Mark as sold</span>
          </button>
        )}

        <div className='seller-dashboard-action-separator' aria-hidden='true' />
        <button
          type='button'
          className='is-danger'
          disabled={isBusy}
          onClick={() => runAction('delete')}
        >
          <Trash size={15} />
          <span>Delete listing</span>
        </button>
      </Popover>
      {feedback && (
        <span
          className={`seller-dashboard-action-feedback${feedback.isError ? ' is-error' : ''}`}
          role={feedback.isError ? 'alert' : 'status'}
        >
          {feedback.message}
        </span>
      )}
    </div>
  );
}
