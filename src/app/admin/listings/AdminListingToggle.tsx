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

  async function toggleVisible() {
    setBusy(true);
    const next = !visible;
    const { error } = await supabase.from('listings').update({ is_visible: next }).eq('id', listingId);
    if (!error) setVisible(next);
    setBusy(false);
  }

  async function toggleFeatured() {
    setBusy(true);
    const next = !featured;
    const { error } = await supabase.from('listings').update({ is_featured: next }).eq('id', listingId);
    if (!error) setFeatured(next);
    setBusy(false);
  }

  return (
    <div className='flex items-center gap-2'>
      <button
        onClick={toggleFeatured}
        disabled={busy}
        title={featured ? 'Remove from featured' : 'Feature on homepage'}
        className={`rounded p-1.5 transition ${featured ? 'bg-amber-100 text-amber-700' : 'text-gray-400 hover:bg-gray-100'}`}
      >
        <Star size={16} className={featured ? 'fill-amber-500' : ''} />
      </button>

      <button
        onClick={toggleVisible}
        disabled={busy}
        title={visible ? 'Hide listing from public' : 'Make listing visible'}
        className={`rounded p-1.5 transition ${visible ? 'text-emerald-700 hover:bg-emerald-50' : 'bg-red-50 text-red-600'}`}
      >
        {visible ? <Eye size={16} /> : <EyeOff size={16} />}
      </button>
    </div>
  );
}
