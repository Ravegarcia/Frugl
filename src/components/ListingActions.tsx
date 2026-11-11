'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { btn, btnOutline, field } from '@/lib/ui';

type Props = { listingId: string; sellerId: string; status: string; userId: string | null; initialSaved: boolean };

export default function ListingActions({ listingId, sellerId, status, userId, initialSaved }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [saved, setSaved] = useState(initialSaved);
  const [panel, setPanel] = useState<'' | 'offer' | 'report'>('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  if (!userId) {
    return (
      <div className='space-y-2 rounded-xl border bg-white p-4'>
        <p className='text-sm'>Sign in to chat, make an offer, save or report this listing.</p>
        <Link href={'/login?next=' + encodeURIComponent('/laptops/' + listingId)} className={btn}>Sign in</Link>
      </div>
    );
  }

  if (userId === sellerId) {
    return (
      <div className='space-y-2 rounded-xl border bg-white p-4 text-sm'>
        <p>This is your listing.</p>
        <Link href={'/sell/' + listingId} className={btnOutline}>Edit listing</Link>
      </div>
    );
  }

  async function toggleSave() {
    if (saved) await supabase.from('saved_listings').delete().eq('user_id', userId).eq('listing_id', listingId);
    else await supabase.from('saved_listings').insert({ user_id: userId, listing_id: listingId });
    setSaved(!saved);
  }

  async function message() {
    const { data: existing } = await supabase
      .from('conversations').select('id').eq('listing_id', listingId).eq('buyer_id', userId).maybeSingle();
    if (existing) {
      router.push('/messages/' + existing.id);
      return;
    }
    const { data, error } = await supabase
      .from('conversations').insert({ listing_id: listingId, buyer_id: userId, seller_id: sellerId }).select('id').single();
    if (error) setNote(error.message);
    else router.push('/messages/' + data.id);
  }

  async function sendOffer() {
    const n = Number(amount);
    if (!n || n <= 0) {
      setNote('Enter an amount above zero.');
      return;
    }
    const { error } = await supabase.from('offers').insert({ listing_id: listingId, buyer_id: userId, amount: n });
    if (error) setNote(error.message);
    else {
      setNote('Offer sent. Track it on the Offers page.');
      setPanel('');
      setAmount('');
    }
  }

  async function sendReport() {
    if (!reason.trim()) {
      setNote('Tell us what is wrong with this listing.');
      return;
    }
    const { error } = await supabase
      .from('reports').insert({ target_type: 'listing', target_id: listingId, reporter_id: userId, reason });
    if (error) setNote(error.message);
    else {
      setNote('Thank you. A moderator will review this listing.');
      setPanel('');
      setReason('');
    }
  }

  return (
    <div className='space-y-3 rounded-xl border bg-white p-4'>
      <div className='flex flex-wrap gap-2'>
        <button onClick={message} className={btn}>Message seller</button>
        {status === 'available' && <button onClick={() => setPanel(panel === 'offer' ? '' : 'offer')} className={btnOutline}>Make offer</button>}
        <button onClick={toggleSave} className={btnOutline}>{saved ? 'Saved' : 'Save'}</button>
        <button onClick={() => setPanel(panel === 'report' ? '' : 'report')} className={btnOutline}>Report</button>
      </div>

      {panel === 'offer' && (
        <div className='flex gap-2'>
          <input type='number' value={amount} onChange={(e) => setAmount(e.target.value)} placeholder='Your offer in PHP' className={field} />
          <button onClick={sendOffer} className={btn}>Send</button>
        </div>
      )}
      {panel === 'report' && (
        <div className='space-y-2'>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder='What is wrong with this listing?' className={field} />
          <button onClick={sendReport} className={btn}>Submit report</button>
        </div>
      )}
      {note && <p className='text-sm text-gray-600'>{note}</p>}
    </div>
  );
}
