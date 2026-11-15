import Link from 'next/link';
import { requireMarketplaceUser } from '@/lib/auth';
import { formatPrice, conditionLabel } from '@/lib/constants';
import { coverUrl } from '@/lib/queries';
import { createAdminClient } from '@/lib/supabase/admin';
import EmptyState from '@/components/EmptyState';
import { PlusCircle, ExternalLink, Edit3, Laptop, ShieldCheck, CheckCircle, Eye, MessageCircle } from '@/components/icons';

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

  // Counts for tabs
  const [activeCount, draftCount, reservedCount, soldCount] = await Promise.all([
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('seller_id', user.id).eq('status', 'available'),
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('seller_id', user.id).eq('status', 'draft'),
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('seller_id', user.id).eq('status', 'reserved'),
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('seller_id', user.id).eq('status', 'sold'),
  ]);

  const tabs = [
    { key: 'active', label: 'Active', count: activeCount.count || 0, icon: Laptop },
    { key: 'draft', label: 'Drafts', count: draftCount.count || 0, icon: Edit3 },
    { key: 'reserved', label: 'Reserved', count: reservedCount.count || 0, icon: ShieldCheck },
    { key: 'sold', label: 'Sold', count: soldCount.count || 0, icon: CheckCircle },
  ];
  const currentTab = tabs.find((item) => item.key === activeTab) || tabs[0];

  return (
    <div className='seller-dashboard'>
      <header className='seller-dashboard-header'>
        <div className='seller-dashboard-intro'>
          <p className='seller-dashboard-eyebrow'>Seller workspace</p>
          <h1 className='text-2xl font-bold text-gray-900'>My listings dashboard</h1>
          <p>Manage your draft, active, reserved, and sold listings.</p>
        </div>
        <Link
          href='/sell'
          className='seller-dashboard-create'
        >
          <PlusCircle size={18} />
          <span>Sell another laptop</span>
        </Link>
      </header>

      <nav className='seller-dashboard-status-grid' aria-label='Filter listings by status'>
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/dashboard?tab=${t.key}`}
            aria-current={activeTab === t.key ? 'page' : undefined}
            className={`seller-dashboard-status-card ${activeTab === t.key ? 'is-active' : ''}`}
          >
            <span className='seller-dashboard-status-icon'><t.icon size={18} /></span>
            <span className='seller-dashboard-status-label'>{t.label}</span>
            <span className='seller-dashboard-status-count'>{t.count}</span>
          </Link>
        ))}
      </nav>

      <section className='seller-dashboard-listings' aria-labelledby='seller-dashboard-listings-title'>
        <div className='seller-dashboard-section-heading'>
          <div>
            <p className='seller-dashboard-section-eyebrow'>Your inventory</p>
            <h2 id='seller-dashboard-listings-title'>{currentTab.label} listings</h2>
          </div>
          <span className='seller-dashboard-total'>{currentTab.count} total</span>
        </div>

      {listings && listings.length > 0 ? (
        <div className='seller-dashboard-listing-grid'>
          {listings.map((l: any) => {
            const img = coverUrl(l);
            const offersCount = l.offers?.length || 0;
            const statusTone = l.status === 'reserved'
              ? 'status-warning'
              : l.status === 'sold'
                ? 'status-muted'
                : l.status === 'draft'
                  ? 'status-info'
                  : 'status-success';
            return (
              <article key={l.id} className='seller-dashboard-listing-card'>
                <div className='seller-dashboard-listing-image'>
                    {img ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={img} alt={l.title} />
                    ) : (
                      <div className='seller-dashboard-no-photo'>
                        <Laptop size={24} />
                        No photo
                      </div>
                    )}
                    <span className={`status-badge ${statusTone} absolute right-2 top-2 capitalize`}>
                      {l.status}
                    </span>
                </div>
                <div className='seller-dashboard-listing-content'>
                  <p className='seller-dashboard-listing-price'>
                    {l.price ? formatPrice(l.price) : 'No price set'}
                  </p>
                  <h3 className='seller-dashboard-listing-title'>{l.title || 'Untitled Draft'}</h3>
                  <p className='seller-dashboard-listing-details'>
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
                  <Link
                    href={`/sell/${l.id}`}
                    className='seller-dashboard-edit-link'
                  >
                    <Edit3 size={15} />
                    <span>Edit</span>
                  </Link>
                  {l.status !== 'draft' && (
                    <Link
                      href={`/laptops/${l.id}`}
                      className='seller-dashboard-view-link'
                    >
                      <ExternalLink size={15} />
                      <span>View live</span>
                    </Link>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
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
