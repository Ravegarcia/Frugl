import { Suspense } from 'react';
import { Laptop } from '@/components/icons';
import { redirect } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { formatPrice } from '@/lib/constants';
import { coverUrl } from '@/lib/queries';
import EmptyState from '@/components/EmptyState';
import ListingStatusNav from '@/app/dashboard/ListingStatusNav';
import {
  ADMIN_PAGE_SIZE,
  adminPageHref,
  getAdminPageRange,
  parseAdminPage,
} from '@/lib/admin/pagination';
import AdminActivityViewed from '../AdminActivityViewed';
import AdminPagination from '../AdminPagination';
import Link from 'next/link';
import AdminListingToggle from './AdminListingToggle';
import AdminListingReviewActions from './AdminListingReviewActions';
import AdminLoading from '../loading';

type AdminListingsPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default function AdminListingsPage(props: AdminListingsPageProps) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminListingsContent {...props} />
    </Suspense>
  );
}

async function AdminListingsContent({
  searchParams,
}: AdminListingsPageProps) {
  const { supabase } = await requireStaff();
  const params = await searchParams;
  const { page: pageParam } = params;
  const page = parseAdminPage(pageParam);
  const status = params.status === 'all' ? 'all' : 'pending_review';
  const { from, to } = getAdminPageRange(page);

  let listingQuery = supabase
    .from('listings')
    .select('*, listing_photos(image_url, sort_order), seller:profiles!listings_seller_id_fkey(name)', { count: 'exact' })
    .order('created_at', { ascending: status === 'pending_review' });
  if (status === 'pending_review') listingQuery = listingQuery.eq('status', status);

  const [listingsResult, pendingCountResult, allCountResult] = await Promise.all([
    listingQuery.range(from, to),
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
    supabase.from('listings').select('id', { count: 'exact', head: true }),
  ]);
  if (listingsResult.error) {
    throw new Error(`Unable to load admin listings: ${listingsResult.error.message}`);
  }
  const countError = pendingCountResult.error ?? allCountResult.error;
  if (countError) throw new Error(`Unable to load listing review counts: ${countError.message}`);

  const { data: listings, count } = listingsResult;
  const pendingCount = pendingCountResult.count ?? 0;
  const allCount = allCountResult.count ?? 0;

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / ADMIN_PAGE_SIZE));
  if (page > totalPages) {
    redirect(adminPageHref('/admin/listings', totalPages, { status }));
  }

  return (
    <div className='admin-queue-page admin-listings-page'>
      <AdminActivityViewed eventType='listing_created' />
      <header className='admin-queue-heading'>
        <div>
          <h1 id='admin-listings-title'>Manage listings</h1>
          <p>Review submissions, manage visibility, and feature listings.</p>
        </div>
      </header>

      <section className='admin-panel admin-queue-panel admin-listings-panel' aria-labelledby='admin-listings-title'>
        <ListingStatusNav
          tabs={[
            { key: 'all', label: 'All listings', count: allCount },
            { key: 'pending_review', label: 'Awaiting review', count: pendingCount },
          ]}
          activeTab={status}
          hrefBase='/admin/listings'
          paramName='status'
          ariaLabel='Filter listings by review status'
        />

        {listings?.length ? (
          <div className='admin-queue-list admin-listings-list'>
            {listings.map((listing: any) => {
              const cover = coverUrl(listing);
              return (
                <article className='admin-card admin-listing-row' key={listing.id}>
                  <Link href={`/laptops/${listing.id}`} className='admin-listing-cover' aria-label={`View ${listing.title || 'listing'}`}>
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt='' />
                    ) : (
                      <Laptop size={22} />
                    )}
                  </Link>

                  <div className='admin-listing-details'>
                    <Link href={`/laptops/${listing.id}`} className='admin-listing-title'>
                      {listing.title || 'Untitled listing'}
                    </Link>
                    <div className='admin-listing-meta'>
                      <span>Seller <strong>{listing.seller?.name || 'User'}</strong></span>
                      <span className='admin-listing-separator' aria-hidden='true' />
                      <strong>{formatPrice(listing.price)}</strong>
                    </div>
                    <div className='admin-listing-badges'>
                      <span className={`admin-listing-status is-${listing.status}`}>
                        {listing.status === 'pending_review'
                          ? 'Awaiting review'
                          : listing.status.replaceAll('_', ' ')}
                      </span>
                      {listing.is_featured && <span className='admin-listing-flag is-featured'>Featured</span>}
                      {!listing.is_visible && <span className='admin-listing-flag is-hidden'>Hidden</span>}
                    </div>
                    {listing.review_reason && (
                      <p className='admin-listing-review-reason'>
                        Rejection reason: {listing.review_reason}
                      </p>
                    )}
                  </div>

                  <div className='admin-listing-controls'>
                    {listing.status === 'pending_review' && (
                      <AdminListingReviewActions listingId={listing.id} />
                    )}
                    {['available', 'reserved', 'sold'].includes(listing.status) && (
                      <AdminListingToggle
                        listingId={listing.id}
                        initialVisible={listing.is_visible}
                        initialFeatured={listing.is_featured}
                        allowFeatured={listing.status === 'available'}
                      />
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title={status === 'pending_review' ? 'No listings awaiting review' : 'No listings found'}
            hint={status === 'pending_review' ? 'New submissions will appear here.' : 'Marketplace listings will appear here.'}
          />
        )}
        <AdminPagination
          path='/admin/listings'
          page={page}
          totalPages={totalPages}
          totalCount={count ?? 0}
          query={{ status }}
        />
      </section>
    </div>
  );
}
