export default function Loading() {
  return (
    <div role='status' aria-label='Loading listings' className='grid animate-pulse grid-cols-2 gap-4 md:grid-cols-4'>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className='h-72 rounded-2xl border border-border bg-muted' />
      ))}
    </div>
  );
}
