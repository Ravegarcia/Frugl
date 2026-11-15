'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, Star } from '@/components/icons';

export default function AdminListingToggle({
  listingId,
  initialVisible,
  initialFeatured,
}: {
  listingId: string;
  initialVisible: boolean;
  initialFeatured: boolean;
}) {
  const supabase = createClient();
  const [visible, setVisible] = useState(initialVisible);
  const [featured, setFeatured] = useState(initialFeatured);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function toggleVisible() {
    setBusy(true);
    setActionError(null);
    const next = !visible;
    try {
      const { error } = await supabase.from('listings').update({ is_visible: next }).eq('id', listingId);
      if (error) setActionError(error.message);
      else setVisible(next);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to update listing visibility.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleFeatured() {
    setBusy(true);
    setActionError(null);
    const next = !featured;
    try {
      const { error } = await supabase.from('listings').update({ is_featured: next }).eq('id', listingId);
      if (error) setActionError(error.message);
      else setFeatured(next);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to update featured status.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className='admin-listing-toggle' aria-busy={busy}>
      <button
        type='button'
        onClick={toggleFeatured}
        disabled={busy}
        aria-label={featured ? 'Remove listing from featured' : 'Feature listing on homepage'}
        aria-pressed={featured}
        title={featured ? 'Remove from featured' : 'Feature on homepage'}
        className={`admin-listing-action ${featured ? 'is-featured' : ''}`}
      >
        <Star size={16} variant={featured ? 'solid' : 'regular'} />
        <span>{featured ? 'Featured' : 'Feature'}</span>
      </button>

      <button
        type='button'
        onClick={toggleVisible}
        disabled={busy}
        aria-label={visible ? 'Hide listing from public' : 'Make listing visible'}
        aria-pressed={visible}
        title={visible ? 'Hide listing from public' : 'Make listing visible'}
        className={`admin-listing-action ${visible ? 'is-visible' : 'is-hidden'}`}
      >
        {visible ? <Eye size={16} /> : <EyeOff size={16} />}
        <span>{visible ? 'Public' : 'Hidden'}</span>
      </button>

      {actionError && <p className='admin-listing-action-error' role='alert'>{actionError}</p>}
    </div>
  );
}
