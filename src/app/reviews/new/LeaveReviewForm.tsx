'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Star, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  userId: string;
  listing: any;
  otherParty: any;
}

export default function LeaveReviewForm({ userId, listing, otherParty }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  if (!listing || !otherParty) {
    return (
      <div className='mx-auto max-w-md rounded-xl border bg-white p-6 text-center text-sm space-y-2'>
        <p className='font-semibold text-gray-800'>No completed sale found.</p>
        <p className='text-gray-500'>Reviews can only be submitted after a laptop listing has been marked sold.</p>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    setErr('');

    try {
      const { error } = await supabase.from('reviews').insert({
        listing_id: listing.id,
        reviewer_id: userId,
        reviewee_id: otherParty.id,
        rating,
        comment: comment.trim() || null,
      });

      if (error) throw new Error(error.message);

      setMsg('Thank you! Your review has been posted.');
      setTimeout(() => {
        router.push(`/sellers/${otherParty.id}`);
      }, 1500);
    } catch (e: any) {
      setErr(e.message || 'Failed to submit review.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className='mx-auto max-w-md rounded-xl border bg-white p-6 shadow-sm space-y-5'>
      <div>
        <h1 className='text-xl font-bold text-gray-900'>Leave a Review</h1>
        <p className='text-xs text-gray-500'>
          Reviewing <span className='font-medium text-gray-800'>{otherParty.name}</span> for {listing.title}
        </p>
      </div>

      {msg && (
        <div className='flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800'>
          <CheckCircle2 size={16} className='shrink-0' />
          <span>{msg}</span>
        </div>
      )}

      {err && (
        <div className='flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700'>
          <AlertCircle size={16} className='shrink-0' />
          <span>{err}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className='space-y-4'>
        {/* Star Rating */}
        <div className='space-y-1.5'>
          <Label>Rating</Label>
          <div className='flex items-center gap-2'>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type='button'
                onClick={() => setRating(star)}
                className='text-2xl transition hover:scale-110'
              >
                <Star
                  size={26}
                  className={star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
                />
              </button>
            ))}
            <span className='ml-2 text-sm font-semibold text-gray-700'>{rating} / 5</span>
          </div>
        </div>

        {/* Comment */}
        <div className='space-y-1.5'>
          <Label htmlFor='comment'>Feedback & Comments (Optional)</Label>
          <Textarea
            id='comment'
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder='How was the communication, laptop condition, and handover?'
            rows={4}
          />
        </div>

        <Button
          type='submit'
          disabled={busy}
          className='w-full bg-emerald-700 hover:bg-emerald-800 text-white'
        >
          {busy ? 'Submitting...' : 'Submit Review'}
        </Button>
      </form>
    </div>
  );
}
