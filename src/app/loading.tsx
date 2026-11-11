export default function Loading() {
  return (
    <div className='grid animate-pulse grid-cols-2 gap-4 md:grid-cols-4'>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className='h-56 rounded-xl bg-gray-200' />
      ))}
    </div>
  );
}
