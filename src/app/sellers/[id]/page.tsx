import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CARD_SELECT } from '@/lib/queries';
import { timeAgo } from '@/lib/format';
import ListingCard from '@/components/ListingCard';
import EmptyState from '@/components/EmptyState';

export default async function SellerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: seller } = await supabase.from('profiles').select('id,name,seller_verified,created_at').eq('id', id).maybeSingle();
  if (!seller) notFound();

  const [reviews, listings] = await Promise.all([
    supabase.from('reviews').select('rating,comment,created_at').eq('reviewee_id', id).order('created_at', { ascending: false }),
    supabase.from('listings').select(CARD_SELECT).eq('seller_id', id).in('status', ['available', 'reserved']).order('created_at', { ascending: false }),
  ]);
  const list = reviews.data ?? [];
  const avg = list.length ? list.reduce((s: number, r: any) => s + r.rating, 0) / list.length : null;

  return (
    <div className='space-y-6'>
      <div className='rounded-xl border bg-white p-4'>
        <h1 className='text-xl font-semibold'>{seller.name}{seller.seller_verified && <span className='ml-2 text-sm text-emerald-700'>Verified</span>}</h1>
        <p className='text-sm text-gray-500'>Member since {timeAgo(seller.created_at).replace(' ago', '')} ago</p>
        <p className='mt-1 text-sm'>
          {avg ? 'Rating ' + avg.toFixed(1) + ' / 5 from ' + list.length + ' review' + (list.length > 1 ? 's' : '') : 'No reviews yet'}
        </p>
      </div>

      <section>
        <h2 className='mb-3 font-semibold'>Active listings</h2>
        {listings.data && listings.data.length > 0 ? (
          <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>{listings.data.map((l: any) => <ListingCard key={l.id} listing={l} />)}</div>
        ) : (
          <EmptyState title='No active listings' />
        )}
      </section>

      {list.length > 0 && (
        <section>
          <h2 className='mb-3 font-semibold'>Reviews</h2>
          <ul className='space-y-2'>
            {list.map((r: any, i: number) => (
              <li key={i} className='rounded-lg border bg-white p-3 text-sm'>
                <span className='font-medium'>{r.rating} / 5</span> <span className='text-gray-500'>{timeAgo(r.created_at)}</span>
                {r.comment && <p>{r.comment}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
