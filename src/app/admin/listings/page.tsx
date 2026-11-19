import { Suspense } from 'react';
import { Laptop } from '@/components/icons';
import { redirect } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { formatPrice } from '@/lib/constants';
import { coverUrl } from '@/lib/queries';
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
    .order('created_at', { ascending: false });
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
    <div className='admin-listings-page'>
      <AdminActivityViewed eventType='listing_created' />
      <header className='admin-listings-header'>
        <div>
          <p className='admin-eyebrow'>Marketplace operations</p>
          <h1>Manage listings</h1>
          <p>Review submissions, manage visibility, and feature listings.</p>
        </div>
      </header>

      <section className='admin-listings-section' aria-labelledby='admin-listings-title'>
        <div className='admin-listings-section-heading'>
          <div>
            <p className='admin-eyebrow'>Inventory</p>
            <h2 id='admin-listings-title'>{status === 'pending_review' ? 'Awaiting review' : 'All listings'}</h2>
          </div>
          <span className='admin-listings-count'>{(count ?? 0).toLocaleString()} total</span>
        </div>

        <nav className='admin-listing-filters' aria-label='Filter listings'>
          <Link
            href={adminPageHref('/admin/listings', 1, { status: 'pending_review' })}
            className={`admin-listing-filter${status === 'pending_review' ? ' is-active' : ''}`}
            aria-current={status === 'pending_review' ? 'page' : undefined}
          >
            Awaiting review <span>{pendingCount.toLocaleString()}</span>
          </Link>
          <Link
            href={adminPageHref('/admin/listings', 1, { status: 'all' })}
            className={`admin-listing-filter${status === 'all' ? ' is-active' : ''}`}
            aria-current={status === 'all' ? 'page' : undefined}
          >
            All listings <span>{allCount.toLocaleString()}</span>
          </Link>
        </nav>

        {listings?.length ? (
          <div className='admin-listings-list'>
            {listings.map((listing: any) => {
              const cover = coverUrl(listing);
              return (
                <article className='admin-listing-row' key={listing.id}>
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
                    <AdminListingToggle
                      listingId={listing.id}
                      initialVisible={listing.is_visible}
                      initialFeatured={listing.is_featured}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className='admin-listings-empty'>
            <span aria-hidden='true'><Laptop size={22} /></span>
            <strong>{status === 'pending_review' ? 'No listings awaiting review' : 'No listings found'}</strong>
            <p>{status === 'pending_review' ? 'New submissions will appear here.' : 'Marketplace listings will appear here.'}</p>
          </div>
        )}
        <AdminPagination path='/admin/listings' page={page} totalPages={totalPages} query={{ status }} />
      </section>
    </div>
  );
}
