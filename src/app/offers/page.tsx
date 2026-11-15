import Link from 'next/link';
import { requireMarketplaceUser } from '@/lib/auth';
import { formatPrice } from '@/lib/constants';
import { coverUrl } from '@/lib/queries';
import { Laptop, Tag } from '@/components/icons';
import TimeAgo from '@/components/TimeAgo';

export default async function OffersPage() {
  const { supabase, user } = await requireMarketplaceUser('/offers');

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
    <div className='mx-auto max-w-4xl offers-page'>
      <header className='offers-page-header'>
        <div className='offers-page-heading-copy'>
          <span className='offers-page-icon'><Tag size={20} /></span>
          <div>
            <p className='offers-page-eyebrow'>Marketplace activity</p>
            <h1>Offers</h1>
            <p>Track the offers you have made and received.</p>
          </div>
        </div>
        <div className='offers-overview' aria-label='Offer totals'>
          <div><strong>{received.length}</strong><span>Received</span></div>
          <div><strong>{sent.length}</strong><span>Made</span></div>
        </div>
      </header>

      {/* Offers Received (Seller) */}
      <section className='offers-section' aria-labelledby='offers-received-title'>
        <div className='offers-section-heading'>
          <div>
            <p>For your listings</p>
            <h2 id='offers-received-title'>Offers received</h2>
          </div>
          <span className='offers-count'>{received.length}</span>
        </div>
        {received.length > 0 ? (
          <div className='offers-list'>
            {received.map((o: any) => {
              const cover = coverUrl(o.listings);
              return (
                <article key={o.id} className='offers-card'>
                  <div className='offers-card-listing'>
                    <div className='offers-card-image'>
                      {cover ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={cover} alt='' />
                      ) : (
                        <div className='offers-card-image-placeholder'>
                          <Laptop size={22} />
                        </div>
                      )}
                    </div>
                    <div className='offers-card-details'>
                      <Link href={`/laptops/${o.listings?.id}`} className='offers-card-title'>
                        {o.listings?.title}
                      </Link>
                      <p className='offers-card-meta'>
                        From <strong>{o.buyer?.name || 'Buyer'}</strong>
                        <span className='offers-meta-divider'>·</span>
                        <TimeAgo timestamp={o.created_at} />
                      </p>
                    </div>
                  </div>
                  <div className='offers-card-value'>
                    <span className='offers-value-label'>Offer amount</span>
                    <strong>{formatPrice(o.amount)}</strong>
                    <span className={`offers-status offers-status-${o.status}`}>
                      {o.status}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className='offers-empty'>
            <span className='offers-empty-icon'><Tag size={18} /></span>
            <div>
              <strong>No offers received yet</strong>
              <p>When someone makes an offer on one of your listings, it will appear here.</p>
            </div>
          </div>
        )}
      </section>

      {/* Offers Made (Buyer) */}
      <section className='offers-section' aria-labelledby='offers-made-title'>
        <div className='offers-section-heading'>
          <div>
            <p>Your negotiations</p>
            <h2 id='offers-made-title'>Offers made</h2>
          </div>
          <span className='offers-count'>{sent.length}</span>
        </div>
        {sent.length > 0 ? (
          <div className='offers-list'>
            {sent.map((o: any) => {
              const cover = coverUrl(o.listings);
              return (
                <article key={o.id} className='offers-card'>
                  <div className='offers-card-listing'>
                    <div className='offers-card-image'>
                      {cover ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={cover} alt='' />
                      ) : (
                        <div className='offers-card-image-placeholder'>
                          <Laptop size={22} />
                        </div>
                      )}
                    </div>
                    <div className='offers-card-details'>
                      <Link href={`/laptops/${o.listings?.id}`} className='offers-card-title'>
                        {o.listings?.title}
                      </Link>
                      <p className='offers-card-meta'>
                        Listed at <strong>{formatPrice(o.listings?.price)}</strong>
                        <span className='offers-meta-divider'>·</span>
                        Offered <TimeAgo timestamp={o.created_at} />
                      </p>
                    </div>
                  </div>
                  <div className='offers-card-value'>
                    <span className='offers-value-label'>Your offer</span>
                    <strong>{formatPrice(o.amount)}</strong>
                    <span className={`offers-status offers-status-${o.status}`}>
                      {o.status}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className='offers-empty offers-empty-sent'>
            <span className='offers-empty-icon'><Tag size={18} /></span>
            <div>
              <strong>No offers sent yet</strong>
              <p>Find a laptop you like and send an offer to start negotiating.</p>
            </div>
            <Link href='/laptops'>Browse laptops</Link>
          </div>
        )}
      </section>
    </div>
  );
}
