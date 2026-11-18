'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark } from '@/components/icons';
import { createClient } from '@/lib/supabase/client';
import {
  dispatchSavedListingChanged,
  SAVED_LISTING_CHANGED_EVENT,
  type SavedListingChange,
} from '@/lib/saved-listings-events';

type Props = {
  listingId: string;
  title: string;
  initialSaved: boolean;
};

const saveIconTransitionClasses =
  'transition-[opacity,scale] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:scale-100!';

export default function ListingCardSaveButton({ listingId, title, initialSaved }: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const handleSavedListingChanged = (event: Event) => {
      const change = (event as CustomEvent<SavedListingChange>).detail;
      if (change?.listingId === listingId) setSaved(change.saved);
    };

    window.addEventListener(SAVED_LISTING_CHANGED_EVENT, handleSavedListingChanged);
    return () => window.removeEventListener(SAVED_LISTING_CHANGED_EVENT, handleSavedListingChanged);
  }, [listingId]);

  async function toggleSaved() {
    if (pending) return;
    setPending(true);
    setFeedback('');

    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError && authError.name !== 'AuthSessionMissingError') throw authError;

      if (!user) {
        router.push('/login?next=' + encodeURIComponent(window.location.pathname + window.location.search));
        return;
      }

      const nextSaved = !saved;
      const result = nextSaved
        ? await supabase
            .from('saved_listings')
            .upsert(
              { user_id: user.id, listing_id: listingId },
              { onConflict: 'user_id,listing_id', ignoreDuplicates: true }
            )
        : await supabase.from('saved_listings').delete().eq('user_id', user.id).eq('listing_id', listingId);

      if (result.error) throw result.error;
      setSaved(nextSaved);
      dispatchSavedListingChanged({ userId: user.id, listingId, saved: nextSaved });
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Could not update your saved laptops.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className='listing-card-save-control'>
      <button
        type='button'
        className='listing-card-save-button group'
        aria-label={saved ? `Remove ${title} from saved laptops` : `Save ${title}`}
        aria-pressed={saved}
        title={saved ? 'Remove from saved laptops' : 'Save laptop'}
        disabled={pending}
        onClick={toggleSaved}
      >
        <span className='relative inline-block size-[18px] shrink-0'>
          {saved ? (
            <Bookmark size={18} variant='solid' className='absolute inset-0 m-auto' />
          ) : (
            <>
              <Bookmark
                size={18}
                variant='regular'
                className={`absolute inset-0 m-auto ${saveIconTransitionClasses} group-hover:scale-[0.92] group-hover:opacity-0 group-focus-visible:scale-[0.92] group-focus-visible:opacity-0`}
              />
              <Bookmark
                size={18}
                variant='solid'
                className={`pointer-events-none absolute inset-0 m-auto scale-[0.92] opacity-0 ${saveIconTransitionClasses} group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100`}
              />
            </>
          )}
        </span>
      </button>
      {feedback && <span className='listing-card-save-feedback' role='status'>{feedback}</span>}
    </div>
  );
}
