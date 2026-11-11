import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { formatPrice } from '@/lib/constants';
import { coverUrl } from '@/lib/queries';
import EmptyState from '@/components/EmptyState';
import TimeAgo from '@/components/TimeAgo';

export default async function OffersPage() {
  const { supabase, user } = await requireUser('/offers');

  // Fetch offers received (for user's listings) and offers made (by user)
  const [receivedRes, sentRes] = await Promise.all([
    supabase
      .from('offers')
      .select('*, listings!inner(id, title, price, seller_id, listing_photos(image_url, sort_order)), buyer:profiles!offers_buyer_id_fkey(id, name)')
      .eq('listings.seller_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('offers')
      .select('*, listings(id, title, price, seller_id, listing_photos(image_url, sort_order)), seller:profiles!offers_buyer_id_fkey(id, name)')
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false }),
  ]);

  const received = receivedRes.data || [];
  const sent = sentRes.data || [];

  return (
    <div className='mx-auto max-w-4xl space-y-8'>
      <div>
        <h1 className='text-2xl font-bold text-gray-900'>Offers</h1>
        <p className='text-sm text-gray-500'>Track offers you have made and received.</p>
      </div>

      {/* Offers Received (Seller) */}
      <section className='space-y-3'>
        <h2 className='text-lg font-semibold text-gray-900'>Offers Received ({received.length})</h2>
        {received.length > 0 ? (
          <div className='divide-y rounded-xl border bg-white shadow-sm overflow-hidden'>
            {received.map((o: any) => {
              const cover = coverUrl(o.listings);
              return (
                <div key={o.id} className='flex items-center justify-between p-4'>
                  <div className='flex items-center gap-3'>
                    <div className='h-12 w-12 rounded border bg-gray-100 overflow-hidden shrink-0'>
                      {cover ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={cover} alt='' className='h-full w-full object-cover' />
                      ) : (
                        <div className='flex h-full items-center justify-center text-[9px] text-gray-400'>
                          No photo
                        </div>
                      )}
                    </div>
                    <div>
                      <Link href={`/laptops/${o.listings?.id}`} className='text-sm font-semibold hover:underline line-clamp-1'>
                        {o.listings?.title}
                      </Link>
                      <p className='text-xs text-gray-500'>
                        From <span className='font-medium text-gray-800'>{o.buyer?.name}</span> · <TimeAgo timestamp={o.created_at} />
                      </p>
                    </div>
                  </div>

                  <div className='text-right'>
                    <p className='text-sm font-bold text-emerald-700'>{formatPrice(o.amount)}</p>
                    <span className='rounded bg-gray-100 px-2 py-0.5 text-xs capitalize text-gray-700'>
                      {o.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className='text-xs text-gray-500 italic'>No offers received yet.</p>
        )}
      </section>

      {/* Offers Made (Buyer) */}
      <section className='space-y-3'>
        <h2 className='text-lg font-semibold text-gray-900'>Offers Made ({sent.length})</h2>
        {sent.length > 0 ? (
          <div className='divide-y rounded-xl border bg-white shadow-sm overflow-hidden'>
            {sent.map((o: any) => {
              const cover = coverUrl(o.listings);
              return (
                <div key={o.id} className='flex items-center justify-between p-4'>
                  <div className='flex items-center gap-3'>
                    <div className='h-12 w-12 rounded border bg-gray-100 overflow-hidden shrink-0'>
                      {cover ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={cover} alt='' className='h-full w-full object-cover' />
                      ) : (
                        <div className='flex h-full items-center justify-center text-[9px] text-gray-400'>
                          No photo
                        </div>
                      )}
                    </div>
                    <div>
                      <Link href={`/laptops/${o.listings?.id}`} className='text-sm font-semibold hover:underline line-clamp-1'>
                        {o.listings?.title}
                      </Link>
                      <p className='text-xs text-gray-500'>
                        Listed at {formatPrice(o.listings?.price)} · Offered <TimeAgo timestamp={o.created_at} />
                      </p>
                    </div>
                  </div>

                  <div className='text-right'>
                    <p className='text-sm font-bold text-emerald-700'>{formatPrice(o.amount)}</p>
                    <span className='rounded bg-gray-100 px-2 py-0.5 text-xs capitalize text-gray-700'>
                      {o.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title='No offers sent'
            hint='Find a laptop and make an offer to start negotiating.'
            href='/laptops'
            action='Browse laptops'
          />
        )}
      </section>
    </div>
  );
}
