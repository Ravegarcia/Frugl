'use client';

import Skeleton from '@/components/motion/Skeleton';

export default function ListingCardSkeleton() {
  return (
    <article className='overflow-hidden rounded-2xl border border-border bg-card'>
      <Skeleton className='aspect-[4/3] w-full rounded-none' />
      <div className='grid gap-3 p-4'>
        <Skeleton className='h-4 w-2/5' />
        <Skeleton className='h-4 w-4/5' />
        <Skeleton className='h-3 w-3/5' />
        <Skeleton className='mt-2 h-4 w-1/3' />
      </div>
    </article>
  );
}