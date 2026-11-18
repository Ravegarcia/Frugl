'use client';

import { useEffect } from 'react';

export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error('Admin page failed to load:', error);
  }, [error]);

  return (
    <main className='admin-route-error' role='alert'>
      <p className='admin-eyebrow'>Admin workspace</p>
      <h1>We couldn&apos;t load this page</h1>
      <p>There was a problem loading the latest admin data. Please try again.</p>
      <button type='button' onClick={() => retry()} className='admin-route-error-retry'>
        Try again
      </button>
    </main>
  );
}
