import ListingCardSkeleton from '@/components/ListingCardSkeleton';

export default function Loading() {
  return (
    <div role='status' aria-label='Loading listings' className='grid grid-cols-2 gap-4 md:grid-cols-4'>
      {Array.from({ length: 8 }, (_, index) => (
        <ListingCardSkeleton key={index} />
      ))}
    </div>
  );
}
