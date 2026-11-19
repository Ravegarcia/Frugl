import Skeleton from '@/components/motion/Skeleton';

export default function AdminLoading() {
  return (
    <div className='admin-dashboard-content-loading grid gap-5' role='status' aria-label='Loading admin page'>
      <Skeleton className='h-10 w-1/3' />
      <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className='h-28' />
        ))}
      </div>
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className='h-20' />
      ))}
    </div>
  );
}
