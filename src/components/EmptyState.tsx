import Link from 'next/link';
import { Laptop } from '@/components/icons';

export default function EmptyState({ title, hint, href, action }: { title: string; hint?: string; href?: string; action?: string }) {
  return (
    <div className='empty-state'>
      <span className='empty-state-icon' aria-hidden='true'><Laptop size={24} /></span>
      <h2 className='empty-state-title'>{title}</h2>
      {hint && <p className='empty-state-hint'>{hint}</p>}
      {href && action && <Link href={href} className='empty-state-action'>{action}</Link>}
    </div>
  );
}
