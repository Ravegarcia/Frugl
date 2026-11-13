import Link from 'next/link';
import { Search } from '@/components/icons';

export default function NotFound() {
  return (
    <div className='empty-state'>
      <span className='empty-state-icon'><Search size={24} /></span>
      <h1>Page not found</h1>
      <p className='empty-state-hint'>That page may have moved or no longer exists.</p>
      <Link href='/' className='empty-state-action'>Go home</Link>
    </div>
  );
}
