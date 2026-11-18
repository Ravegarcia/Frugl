'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';

export default function AuthModalLink({
  mode,
  className,
  children,
  next,
}: {
  mode: 'login' | 'register';
  className?: string;
  children: ReactNode;
  next?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const returnTo = next ?? `${pathname || '/'}${query ? `?${query}` : ''}`;

  return (
    <Link href={`/${mode}?next=${encodeURIComponent(returnTo)}`} className={className}>
      {children}
    </Link>
  );
}