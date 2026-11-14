/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { conditionLabel, formatPrice } from '@/lib/constants';
import { coverUrl } from '@/lib/queries';
import { Laptop, Star } from '@/components/icons';
import ListingCardSaveButton from '@/components/ListingCardSaveButton';

export default function ListingCard({
  listing,
  initialSaved,
  guest = false,
}: {
  listing: any;
  initialSaved?: boolean;
  guest?: boolean;
}) {
  const img = coverUrl(listing);
  const condition = conditionLabel(listing.condition);
  const saved = initialSaved ?? Boolean(listing.saved_listings?.length);
  const listingPath = '/laptops/' + listing.id;
  const listingHref = guest ? '/register?next=' + encodeURIComponent(listingPath) : listingPath;
  const conditionTone = condition === 'Lightly Used' || condition === 'Well Used'
    ? 'condition-chip-neutral'
    : condition === 'Heavily Used'
      ? 'condition-chip-muted'
      : '';
  return (
    <article className='listing-card'>
      <Link
        href={listingHref}
        className='listing-card-link'
        aria-label={`View laptop: ${listing.title}`}
      />
      <div className='listing-card-image aspect-[4/3]'>
        {img ? (
          <img src={img} alt={listing.title} className='h-full w-full object-cover' />
        ) : (
          <div className='listing-photo-placeholder'>
            <Laptop size={32} />
            <span>No photo</span>
          </div>
        )}
      </div>
      <div className='listing-card-content'>
        <div className='listing-card-price-row'>
          <p className='listing-card-price'>{formatPrice(listing.price)}</p>
          <ListingCardSaveButton listingId={listing.id} title={listing.title} initialSaved={saved} />
        </div>
        <p className='listing-card-title line-clamp-2'>{listing.title}</p>
        {(listing.cpu || listing.ram || listing.storage) && (
          <p className='listing-card-specs line-clamp-1'>
            {[listing.cpu, listing.ram, listing.storage].filter(Boolean).join(' · ')}
          </p>
        )}
        {listing.status === 'reserved' && <span className='status-badge status-warning'>Reserved</span>}
        {listing.status === 'sold' && <span className='status-badge status-muted'>Sold</span>}
        <div className='listing-card-meta'>
          {condition && (
            <span className={`condition-chip ${conditionTone}`}>
              {condition === 'Brand New' && <Star size={11} variant='solid' />}
              {condition}
            </span>
          )}
          {listing.location && <span className='listing-card-location truncate'>{listing.location}</span>}
        </div>
      </div>
    </article>
  );
}
