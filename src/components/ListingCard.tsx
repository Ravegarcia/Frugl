/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { conditionLabel, formatPrice } from '@/lib/constants';
import { coverUrl } from '@/lib/queries';

export default function ListingCard({ listing }: { listing: any }) {
  const img = coverUrl(listing);
  return (
    <Link href={'/laptops/' + listing.id} className='block overflow-hidden rounded-xl border bg-white hover:shadow'>
      <div className='aspect-[4/3] bg-gray-100'>
        {img ? (
          <img src={img} alt={listing.title} className='h-full w-full object-cover' />
        ) : (
          <div className='flex h-full items-center justify-center text-sm text-gray-400'>No photo</div>
        )}
      </div>
      <div className='space-y-1 p-3'>
        <p className='text-lg font-semibold'>{formatPrice(listing.price)}</p>
        <p className='line-clamp-2 text-sm'>{listing.title}</p>
        <p className='text-xs text-gray-500'>{conditionLabel(listing.condition)} · {listing.location}</p>
        {listing.status === 'reserved' && <span className='text-xs font-medium text-amber-600'>Reserved</span>}
      </div>
    </Link>
  );
}
