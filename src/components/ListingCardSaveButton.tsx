'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark } from '@/components/icons';
import { createClient } from '@/lib/supabase/client';

type Props = {
  listingId: string;
  title: string;
  initialSaved: boolean;
};

export default function ListingCardSaveButton({ listingId, title, initialSaved }: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState('');

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
      if (!nextSaved) router.refresh();
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
        className='listing-card-save-button'
        aria-label={saved ? `Remove ${title} from saved laptops` : `Save ${title}`}
        aria-pressed={saved}
        title={saved ? 'Remove from saved laptops' : 'Save laptop'}
        disabled={pending}
        onClick={toggleSaved}
      >
        <Bookmark
          size={18}
          variant={saved ? 'solid' : 'regular'}
          hoverVariant={saved ? undefined : 'solid'}
        />
      </button>
      {feedback && <span className='listing-card-save-feedback' role='status'>{feedback}</span>}
    </div>
  );
}
