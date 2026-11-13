import Link from 'next/link';
import { requireMarketplaceUser } from '@/lib/auth';
import { formatPrice, conditionLabel } from '@/lib/constants';
import { coverUrl } from '@/lib/queries';
import EmptyState from '@/components/EmptyState';
import { PlusCircle, ExternalLink, Edit3 } from '@/components/icons';

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = 'active' } = await searchParams;
  const { supabase, user } = await requireMarketplaceUser('/dashboard');

  const validTabs = ['active', 'draft', 'reserved', 'sold'];
  const activeTab = validTabs.includes(tab) ? tab : 'active';

  // Fetch seller's listings for current tab
  const { data: listings } = await supabase
    .from('listings')
    .select('*, listing_photos(image_url, sort_order), offers(id, status, amount)')
    .eq('seller_id', user.id)
    .eq('status', activeTab)
    .order('created_at', { ascending: false });

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

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>My listings dashboard</h1>
          <p className='text-sm text-gray-500'>Manage your draft, active, reserved, and sold listings.</p>
        </div>
        <Link
          href='/sell'
          className='inline-flex min-h-11 items-center gap-2 rounded-full border border-primary bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent-hover'
        >
          <PlusCircle size={16} />
          <span>Sell another laptop</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className='flex border-b border-gray-200'>
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/dashboard?tab=${t.key}`}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              activeTab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-primary'
            }`}
          >
            <span>{t.label}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                activeTab === t.key ? 'bg-secondary text-secondary-foreground' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {t.count}
            </span>
          </Link>
        ))}
      </div>

      {/* Listings list */}
      {listings && listings.length > 0 ? (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
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
              <div key={l.id} className='flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface shadow-sm'>
                <div>
                  <div className='relative aspect-[4/3] bg-gray-100'>
                    {img ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={img} alt={l.title} className='h-full w-full object-cover' />
                    ) : (
                      <div className='flex h-full items-center justify-center text-xs text-gray-400'>
                        No photo
                      </div>
                    )}
                    <span className={`status-badge ${statusTone} absolute right-2 top-2 capitalize`}>
                      {l.status}
                    </span>
                  </div>
                  <div className='p-4 space-y-1.5'>
                    <p className='text-lg font-bold text-gray-900'>
                      {l.price ? formatPrice(l.price) : 'No price set'}
                    </p>
                    <h3 className='line-clamp-2 font-sans text-sm font-semibold text-gray-800'>{l.title || 'Untitled Draft'}</h3>
                    <p className='text-xs text-gray-500'>
                      {conditionLabel(l.condition) || 'Condition not set'} · {l.location || 'Location not set'}
                    </p>
                    <div className='flex gap-3 text-xs text-gray-500 pt-1'>
                      <span>{l.views || 0} views</span>
                      <span>·</span>
                      <span>{offersCount} offer{offersCount === 1 ? '' : 's'}</span>
                    </div>
                  </div>
                </div>

                <div className='border-t bg-gray-50 px-4 py-2.5 flex items-center justify-between text-xs font-medium'>
                  <Link
                    href={`/sell/${l.id}`}
                    className='inline-flex items-center gap-1 text-gray-700 hover:text-primary'
                  >
                    <Edit3 size={14} />
                    <span>Edit</span>
                  </Link>
                  {l.status !== 'draft' && (
                    <Link
                      href={`/laptops/${l.id}`}
                      className='inline-flex items-center gap-1 text-primary hover:underline'
                    >
                      <ExternalLink size={14} />
                      <span>View live</span>
                    </Link>
                  )}
                </div>
              </div>
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
    </div>
  );
}
