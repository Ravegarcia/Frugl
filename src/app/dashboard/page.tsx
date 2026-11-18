import Link from 'next/link';
import { requireMarketplaceUser } from '@/lib/auth';
import { formatPrice, conditionLabel } from '@/lib/constants';
import { coverUrl } from '@/lib/queries';
import { createAdminClient } from '@/lib/supabase/admin';
import EmptyState from '@/components/EmptyState';
import ListingStatusNav from './ListingStatusNav';
import ListingActionsMenu from './ListingActionsMenu';
import { PlusCircle, Laptop, Eye, MessageCircle } from '@/components/icons';
import Stagger from '@/components/motion/Stagger';
import StaggerItem from '@/components/motion/StaggerItem';

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = 'active' } = await searchParams;
  const { supabase, user } = await requireMarketplaceUser('/dashboard');

  const validTabs = ['active', 'draft', 'reserved', 'sold'];
  const activeTab = validTabs.includes(tab) ? tab : 'active';
  const listingStatus = activeTab === 'active' ? 'available' : activeTab;

  const admin = createAdminClient();
  const { error: notificationDeleteError } = await admin
    .from('notifications')
    .delete()
    .eq('user_id', user.id)
    .eq('type', 'listing_published');
  if (notificationDeleteError) {
    console.error('Could not remove viewed published listing notifications:', notificationDeleteError.message);
    const { error: notificationReadError } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('type', 'listing_published')
      .is('read_at', null);
    if (notificationReadError) {
      console.error('Could not mark published listing notifications as read:', notificationReadError.message);
    }
  }

  // Fetch seller's listings for current tab
  const { data: listings } = await supabase
    .from('listings')
    .select('*, listing_photos(image_url, sort_order), offers(id, status, amount)')
    .eq('seller_id', user.id)
    .eq('status', listingStatus)
    .order('created_at', { ascending: false });

  const messageCountByListing = new Map<string, number>();
  if (listings?.length) {
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('listing_id')
      .eq('seller_id', user.id)
      .in('listing_id', listings.map((listing) => listing.id));
    if (conversationsError) {
      console.error('Could not load listing conversation counts:', conversationsError.message);
      throw new Error(`Could not load listing conversations: ${conversationsError.message}`);
    }
    for (const conversation of conversations ?? []) {
      messageCountByListing.set(
        conversation.listing_id,
        (messageCountByListing.get(conversation.listing_id) ?? 0) + 1
      );
    }
  }

  // Counts for tabs
  const [activeCount, draftCount, reservedCount, soldCount] = await Promise.all([
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('seller_id', user.id).eq('status', 'available'),
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('seller_id', user.id).eq('status', 'draft'),
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('seller_id', user.id).eq('status', 'reserved'),
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('seller_id', user.id).eq('status', 'sold'),
  ]);

  const tabs = [
    { key: 'active', label: 'Active', count: activeCount.count || 0 },
    { key: 'draft', label: 'Drafts', count: draftCount.count || 0 },
    { key: 'reserved', label: 'Reserved', count: reservedCount.count || 0 },
    { key: 'sold', label: 'Sold', count: soldCount.count || 0 },
  ];
  const currentTab = tabs.find((item) => item.key === activeTab) || tabs[0];

  return (
    <div className='seller-dashboard'>
      <header className='page-banner seller-dashboard-header'>
        <div className='page-banner-main'>
          <span className='page-banner-icon' aria-hidden='true'><Laptop size={22} /></span>
          <div className='page-banner-copy'>
            <h1 className='page-banner-title'>My Listings</h1>
            <p className='page-banner-subtitle'>Manage your draft, active, reserved, and sold listings.</p>
          </div>
        </div>
        <Link
          href='/sell'
          className='button-primary seller-dashboard-create'
        >
          <PlusCircle size={18} />
          <span>Sell another laptop</span>
        </Link>
      </header>

      <ListingStatusNav tabs={tabs} activeTab={activeTab} />

      <section className='seller-dashboard-listings' aria-label={`${currentTab.label} listings`}>
        {listings && listings.length > 0 ? (
          <Stagger className='seller-dashboard-listing-grid'>
            {listings.map((l: any, index) => {
              const img = coverUrl(l);
              const offersCount = l.offers?.length || 0;
              const statusTone = l.status === 'reserved'
                ? 'status-warning'
                : l.status === 'sold'
                  ? 'status-muted'
                  : l.status === 'draft'
                    ? 'status-info'
                    : 'status-success';
              const statusLabel = l.status === 'available'
                ? 'Active'
                : l.status.charAt(0).toUpperCase() + l.status.slice(1);
              const listedDate = new Intl.DateTimeFormat('en', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                timeZone: 'UTC',
              }).format(new Date(l.created_at));

              const card = (
                <article className='seller-dashboard-listing-card'>
                  <div className='seller-dashboard-listing-image'>
                    {img ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={img} alt={l.title || 'Laptop listing'} />
                    ) : (
                      <div className='seller-dashboard-no-photo'>
                        <Laptop size={24} />
                        <span>No photo</span>
                      </div>
                    )}
                  </div>
                  <div className='seller-dashboard-listing-content'>
                    <h3 className='seller-dashboard-listing-title'>{l.title || 'Untitled Draft'}</h3>
                    <div className='seller-dashboard-listing-price-row'>
                      <p className='seller-dashboard-listing-price'>
                        {l.price ? formatPrice(l.price) : 'No price set'}
                      </p>
                      <span className={`status-badge ${statusTone} seller-dashboard-inline-status`}>
                        {statusLabel}
                      </span>
                    </div>
                    <p className='seller-dashboard-listing-details'>
                      <span><time dateTime={l.created_at}>Listed {listedDate}</time></span>
                      <span className='seller-dashboard-detail-divider' aria-hidden='true'>·</span>
                      <span>{conditionLabel(l.condition) || 'Condition not set'}</span>
                      <span className='seller-dashboard-detail-divider' aria-hidden='true'>·</span>
                      <span>{l.location || 'Location not set'}</span>
                    </p>
                    <div className='seller-dashboard-listing-stats'>
                      <span><Eye size={14} />{l.views || 0} views</span>
                      <span><MessageCircle size={14} />{offersCount} offer{offersCount === 1 ? '' : 's'}</span>
                    </div>
                  </div>

                  <footer className='seller-dashboard-listing-actions'>
                    <ListingActionsMenu
                      listingId={l.id}
                      title={l.title || 'Untitled listing'}
                      status={l.status}
                      messageCount={messageCountByListing.get(l.id) ?? 0}
                    />
                  </footer>
                </article>
              );
              return (
                <StaggerItem
                  key={l.id}
                  index={index}
                  initiallyVisible={index < 4}
                  layout
                >
                  {card}
                </StaggerItem>
              );
            })}
          </Stagger>
        ) : (
          <EmptyState
            title={`No ${activeTab} listings`}
            hint={activeTab === 'draft' ? 'You have no saved drafts.' : 'List a laptop to see it here.'}
            href='/sell'
            action='Sell a laptop'
          />
        )}
      </section>
    </div>
  );
}
