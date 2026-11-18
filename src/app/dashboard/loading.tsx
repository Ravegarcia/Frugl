import Skeleton from '@/components/motion/Skeleton';

export default function DashboardLoading() {
  return (
    <div className='grid gap-5' role='status' aria-label='Loading your listings'>
      <Skeleton className='h-24 w-full' />
      <Skeleton className='h-12 w-full' />
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className='h-52' />
        ))}
      </div>
    </div>
  );
}