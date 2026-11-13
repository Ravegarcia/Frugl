/* eslint-disable @next/next/no-img-element */
'use client';
import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { conditionLabel, dealLabel, formatPrice } from '@/lib/constants';
import TimeAgo from '@/components/TimeAgo';
import { CheckCircle, Laptop } from '@/components/icons';

type Props = {
  listing: any;
  photos: string[];
  seller?: { id: string; name: string; seller_verified?: boolean } | null;
  children?: ReactNode;
};

export default function ListingDetails({ listing, photos, seller, children }: Props) {
  const [index, setIndex] = useState(0);
  const listedAt = listing.published_at ?? listing.created_at;
  const current = photos[Math.min(index, Math.max(photos.length - 1, 0))];

  const details = [
    ['Condition', conditionLabel(listing.condition)],
    ['Brand', listing.brand],
    ['Model', listing.model],
    ['Deal method', (listing.deal_methods ?? []).map(dealLabel).join(', ')],
  ].filter(([, v]) => v);

  const specs = [
    ['CPU', listing.cpu],
    ['GPU', listing.gpu],
    ['RAM', listing.ram],
    ['Storage', listing.storage],
    ['Screen', listing.screen_size ? listing.screen_size + ' in' : ''],
  ].filter(([, v]) => v);

  return (
    <div className='listing-details space-y-5'>
      <div>
        <div className='listing-detail-image aspect-[4/3]'>
          {current ? (
            <img src={current} alt={listing.title || 'Laptop photo'} className='h-full w-full object-cover' />
          ) : (
            <div className='listing-photo-placeholder'>
              <Laptop size={36} />
              <span>No photos yet</span>
            </div>
          )}
        </div>
        {photos.length > 1 && (
          <div className='mt-2 flex gap-2 overflow-x-auto'>
            {photos.map((p, i) => (
              <button key={p} type='button' aria-pressed={i === index} aria-label={`View photo ${i + 1}`} onClick={() => setIndex(i)} className={'h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 ' + (i === index ? 'border-primary' : 'border-transparent')}>
                <img src={p} alt='' className='h-full w-full object-cover' />
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <h1 className='listing-title'>{listing.title || 'Your listing title'}</h1>
        <p className='listing-detail-price'>{listing.price ? formatPrice(listing.price) : 'Price'}</p>
        <p className='text-sm text-gray-500'>
          Listed <TimeAgo timestamp={listedAt} />{listing.location ? ' in ' + listing.location : ''}
        </p>
        {listing.status === 'reserved' && <p className='status-badge status-warning mt-2'>Reserved</p>}
        {listing.status === 'sold' && <p className='status-badge status-muted mt-2'>Sold</p>}
      </div>

      {children}

      {details.length > 0 && (
        <section>
          <h2 className='mb-1 font-semibold'>Details</h2>
          <dl className='grid grid-cols-2 gap-x-4 gap-y-1 text-sm'>
            {details.map(([k, v]) => (
              <div key={k} className='contents'><dt className='text-gray-500'>{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
        </section>
      )}

      {specs.length > 0 && (
        <section>
          <h2 className='mb-1 font-semibold'>
            Specs
            {listing.specs_verified && (
              <span className='status-badge status-success ml-2'>
                <CheckCircle size={12} />
                Verified
              </span>
            )}
          </h2>
          <dl className='grid grid-cols-2 gap-x-4 gap-y-1 text-sm'>
            {specs.map(([k, v]) => (
              <div key={k} className='contents'><dt className='text-gray-500'>{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
        </section>
      )}

      {listing.description && (
        <section>
          <h2 className='mb-1 font-semibold'>Description</h2>
          <p className='whitespace-pre-wrap text-sm'>{listing.description}</p>
        </section>
      )}

      {seller && (
        <section className='rounded-2xl border border-border bg-surface p-4 text-sm'>
          <p className='text-gray-500'>Seller</p>
          <Link href={'/sellers/' + seller.id} className='font-medium underline'>{seller.name}</Link>
          {seller.seller_verified && (
            <span className='status-badge status-success ml-2'>
              <CheckCircle size={12} />
              Verified
            </span>
          )}
        </section>
      )}
    </div>
  );
}
