import Link from 'next/link';

export default function EmptyState({ title, hint, href, action }: { title: string; hint?: string; href?: string; action?: string }) {
  return (
    <div className='rounded-xl border border-dashed bg-white py-12 text-center'>
      <p className='font-medium'>{title}</p>
      {hint && <p className='mt-1 text-sm text-gray-500'>{hint}</p>}
      {href && action && <Link href={href} className='mt-3 inline-block underline'>{action}</Link>}
    </div>
  );
}
