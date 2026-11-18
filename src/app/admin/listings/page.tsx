import { Laptop } from '@/components/icons';
import { redirect } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { formatPrice } from '@/lib/constants';
import { coverUrl } from '@/lib/queries';
import {
  ADMIN_PAGE_SIZE,
  getAdminPageRange,
  parseAdminPage,
} from '@/lib/admin/pagination';
import AdminActivityViewed from '../AdminActivityViewed';
import AdminPagination from '../AdminPagination';
import Link from 'next/link';
import AdminListingToggle from './AdminListingToggle';

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { supabase } = await requireStaff();
  const { page: pageParam } = await searchParams;
  const page = parseAdminPage(pageParam);
  const { from, to } = getAdminPageRange(page);

  const { data: listings, error, count } = await supabase
    .from('listings')
    .select('*, listing_photos(image_url, sort_order), seller:profiles!listings_seller_id_fkey(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(`Unable to load admin listings: ${error.message}`);
  }

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / ADMIN_PAGE_SIZE));
  if (page > totalPages) {
    redirect(`/admin/listings?page=${totalPages}`);
  }

  return (
    <div className='admin-listings-page'>
      <AdminActivityViewed eventType='listing_created' />
      <header className='admin-listings-header'>
        <div>
          <p className='admin-eyebrow'>Marketplace operations</p>
          <h1>Manage listings</h1>
          <p>Review marketplace inventory, feature listings, and manage public visibility.</p>
          <div className='admin-listings-header-note'>
            <span className='admin-listings-note-dot' aria-hidden='true' />
            <p>Changes to visibility and featured status are applied immediately.</p>
          </div>
        </div>
      </header>

      <section className='admin-listings-section' aria-labelledby='admin-listings-title'>
        <div className='admin-listings-section-heading'>
          <div>
            <p className='admin-eyebrow'>Inventory</p>
            <h2 id='admin-listings-title'>Recent listings</h2>
          </div>
          <span className='admin-listings-count'>{(count ?? 0).toLocaleString()} total</span>
        </div>

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
                      <span className={`admin-listing-status is-${listing.status}`}>{listing.status}</span>
                    </div>
                  </div>

                  <AdminListingToggle
                    listingId={listing.id}
                    initialVisible={listing.is_visible}
                    initialFeatured={listing.is_featured}
                  />
                </article>
              );
            })}
          </div>
        ) : (
          <div className='admin-listings-empty'>
            <span aria-hidden='true'><Laptop size={22} /></span>
            <strong>No listings found</strong>
            <p>New marketplace listings will appear here.</p>
          </div>
        )}
        <AdminPagination path='/admin/listings' page={page} totalPages={totalPages} />
      </section>
    </div>
  );
}
