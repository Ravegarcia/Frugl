'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Star, CheckCircle2, AlertCircle } from '@/components/icons';

type ReviewListing = { id: string; title: string };
type ReviewParty = { id: string; name: string | null };

interface Props {
  userId: string;
  listing: ReviewListing | null;
  otherParty: ReviewParty | null;
  transactionId: string | null;
  existingRating: number | null;
  inModal?: boolean;
}

export default function LeaveReviewForm({
  userId,
  listing,
  otherParty,
  transactionId,
  existingRating,
  inModal = false,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const cardClass = inModal
    ? 'review-form-in-modal'
    : 'mx-auto max-w-md rounded-xl border bg-white p-6 shadow-sm space-y-5';
  const messageClass = inModal
    ? 'review-form-message-in-modal'
    : 'mx-auto max-w-md rounded-xl border bg-white p-6 text-center text-sm space-y-2';

  if (!listing || !otherParty) {
    return (
      <div className={messageClass}>
        <p className='font-semibold text-gray-800'>No completed sale found.</p>
        <p className='text-gray-500'>Reviews can only be submitted by people involved in a completed sale.</p>
      </div>
    );
  }

  if (existingRating !== null) {
    return (
      <div className={messageClass}>
        <p className='font-semibold text-gray-800'>You’ve already rated {otherParty.name || 'this member'}.</p>
        <p className='text-gray-500'>Your rating: {existingRating} out of 5 stars.</p>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErr('');
    setMsg('');
    if (rating < 1 || rating > 5) {
      setErr('Choose a rating from 1 to 5 stars.');
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.from('reviews').insert({
        listing_id: listing.id,
        ...(transactionId ? { transaction_id: transactionId } : {}),
        reviewer_id: userId,
        reviewee_id: otherParty.id,
        rating,
        comment: comment.trim() || null,
      });

      if (error) throw new Error(error.message);

      setMsg('Thank you! Your review has been posted.');
      window.setTimeout(() => {
        router.push(`/sellers/${otherParty.id}`);
      }, 1500);
    } catch (submitError: unknown) {
      setErr(submitError instanceof Error ? submitError.message : 'Failed to submit review.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cardClass}>
      <div>
        <h1 className='text-xl font-bold text-gray-900'>Rate {otherParty.name || 'this member'}</h1>
        <p className='text-xs text-gray-500'>
          Your rating for <span className='font-medium text-gray-800'>{listing.title}</span>
        </p>
      </div>

      {msg && (
        <div className='flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800' role='status'>
          <CheckCircle2 size={16} className='shrink-0' />
          <span>{msg}</span>
        </div>
      )}

      {err && (
        <div className='flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700' role='alert'>
          <AlertCircle size={16} className='shrink-0' />
          <span>{err}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className='space-y-4'>
        <fieldset className='space-y-1.5'>
          <legend className='text-sm font-medium'>Rating (required)</legend>
          <div className='flex items-center gap-2'>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type='button'
                aria-label={`${star} star${star === 1 ? '' : 's'}`}
                aria-pressed={rating === star}
                disabled={busy}
                onClick={() => setRating(star)}
                className='rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-700'
              >
                <Star
                  size={26}
                  variant={star <= rating ? 'solid' : 'regular'}
                  className={star <= rating ? 'text-plum-700' : 'text-lavender-300'}
                />
              </button>
            ))}
            <span className='ml-2 text-sm font-semibold text-gray-700'>
              {rating ? `${rating} / 5` : 'Choose a rating'}
            </span>
          </div>
        </fieldset>

        <div className='space-y-1.5'>
          <Label htmlFor='comment'>Feedback & comments (optional)</Label>
          <Textarea
            id='comment'
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder='How was the communication and handover?'
            rows={4}
            disabled={busy}
          />
        </div>

        <Button type='submit' disabled={busy || rating < 1} className='w-full'>
          {busy ? 'Submitting…' : 'Submit rating'}
        </Button>
      </form>
    </div>
  );
}
