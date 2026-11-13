'use client';

import { AlertCircle } from '@/components/icons';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className='empty-state'>
      <span className='empty-state-icon'><AlertCircle size={24} /></span>
      <h1>Something went wrong</h1>
      <p className='empty-state-hint'>The page could not be loaded. Try again.</p>
      <button onClick={reset} className='empty-state-action'>Try again</button>
    </div>
  );
}
