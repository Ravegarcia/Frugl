import Link from 'next/link';
import { requireMarketplaceUser } from '@/lib/auth';
import { formatPrice } from '@/lib/constants';
import { coverUrl } from '@/lib/queries';
import { Laptop, Tag } from '@/components/icons';
import TimeAgo from '@/components/TimeAgo';
import ListingStatusNav from '@/app/dashboard/ListingStatusNav';
import Stagger from '@/components/motion/Stagger';
import StaggerItem from '@/components/motion/StaggerItem';

export default async function OffersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab === 'made' ? 'made' : 'received';
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
  const tabs = [
    { key: 'received', label: 'Received', count: received.length },
    { key: 'made', label: 'Made', count: sent.length },
  ];
  const visibleOffers = activeTab === 'received' ? received : sent;

  return (
    <div className='offers-page'>
      <header className='page-banner seller-dashboard-header'>
        <div className='page-banner-main'>
          <span className='page-banner-icon' aria-hidden='true'><Tag size={22} /></span>
          <div className='page-banner-copy'>
            <h1 className='page-banner-title'>Offers</h1>
            <p className='page-banner-subtitle'>Track the offers you have made and received.</p>
          </div>
        </div>
      </header>

      <ListingStatusNav
        tabs={tabs}
        activeTab={activeTab}
        hrefBase='/offers'
        ariaLabel='Filter offers by direction'
      />

      <section className='seller-dashboard-listings' aria-label={activeTab === 'received' ? 'Offers received' : 'Offers made'}>
        {visibleOffers.length > 0 ? (
          <Stagger className='offers-list'>
            {visibleOffers.map((offer: any, index) => {
              const isReceived = activeTab === 'received';
              const cover = coverUrl(offer.listings);

              return (
                <StaggerItem key={offer.id} as='article' index={index} className='offers-card'>
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
                      <Link href={`/laptops/${offer.listings?.id}`} className='offers-card-title'>
                        {offer.listings?.title || 'Laptop listing'}
                      </Link>
                      <p className='offers-card-meta'>
                        {isReceived ? (
                          <>From <strong>{offer.buyer?.name || 'Buyer'}</strong></>
                        ) : (
                          <>Listed at <strong>{formatPrice(offer.listings?.price)}</strong></>
                        )}
                        <span className='offers-meta-divider' aria-hidden='true'>·</span>
                        {isReceived ? 'Received' : 'Offered'} <TimeAgo timestamp={offer.created_at} />
                      </p>
                    </div>
                  </div>
                  <div className='offers-card-value'>
                    <span className='offers-value-label'>{isReceived ? 'Offer amount' : 'Your offer'}</span>
                    <strong>{formatPrice(offer.amount)}</strong>
                    <span className={`offers-status offers-status-${offer.status}`}>
                      {offer.status}
                    </span>
                  </div>
                </StaggerItem>
              );
            })}
          </Stagger>
        ) : (
          <div className={`offers-empty${activeTab === 'made' ? ' offers-empty-sent' : ''}`}>
            <span className='offers-empty-icon'><Tag size={18} /></span>
            <div>
              <strong>{activeTab === 'received' ? 'No offers received yet' : 'No offers sent yet'}</strong>
              <p>
                {activeTab === 'received'
                  ? 'Offers made on your listings will appear here.'
                  : 'Find a laptop you like and send an offer to start negotiating.'}
              </p>
            </div>
            {activeTab === 'made' && <Link href='/laptops'>Browse laptops</Link>}
          </div>
        )}
      </section>
    </div>
  );
}
