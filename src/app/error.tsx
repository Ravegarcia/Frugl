'use client';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className='py-20 text-center'>
      <h1 className='text-xl font-semibold'>Something went wrong</h1>
      <button onClick={reset} className='mt-4 rounded-md border px-4 py-2'>Try again</button>
    </div>
  );
}
