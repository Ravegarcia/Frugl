/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { conditionLabel, formatPrice } from '@/lib/constants';
import { coverUrl } from '@/lib/queries';
import { Laptop, Star } from '@/components/icons';

export default function ListingCard({ listing }: { listing: any }) {
  const img = coverUrl(listing);
  const condition = conditionLabel(listing.condition);
  const conditionTone = condition === 'Lightly Used' || condition === 'Well Used'
    ? 'condition-chip-neutral'
    : condition === 'Heavily Used'
      ? 'condition-chip-muted'
      : '';
  return (
    <Link href={'/laptops/' + listing.id} className='listing-card'>
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
        <p className='listing-card-price'>{formatPrice(listing.price)}</p>
        <p className='listing-card-title line-clamp-2'>{listing.title}</p>
        {(listing.cpu || listing.ram || listing.storage) && (
          <p className='listing-card-specs line-clamp-1'>
            {[listing.cpu, listing.ram, listing.storage].filter(Boolean).join(' · ')}
          </p>
        )}
        <div className='listing-card-meta'>
          {condition && (
            <span className={`condition-chip ${conditionTone}`}>
              {condition === 'Brand New' && <Star size={11} variant='solid' />}
              {condition}
            </span>
          )}
          {listing.location && <span className='truncate'>{listing.location}</span>}
        </div>
        {listing.status === 'reserved' && <span className='status-badge status-warning'>Reserved</span>}
        {listing.status === 'sold' && <span className='status-badge status-muted'>Sold</span>}
      </div>
    </Link>
  );
}
