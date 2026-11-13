import Link from 'next/link';
import { Laptop } from '@/components/icons';

export default function EmptyState({ title, hint, href, action }: { title: string; hint?: string; href?: string; action?: string }) {
  return (
    <div className='empty-state'>
      <span className='empty-state-icon'><Laptop size={24} /></span>
      <p className='font-semibold'>{title}</p>
      {hint && <p className='empty-state-hint'>{hint}</p>}
      {href && action && <Link href={href} className='empty-state-action'>{action}</Link>}
    </div>
  );
}
