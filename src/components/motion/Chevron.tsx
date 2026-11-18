'use client';

import type { ReactNode } from 'react';
import { m } from 'motion/react';
import { duration, ease } from '@/lib/motion';

export default function Chevron({
  open,
  className,
  children,
}: {
  open: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <m.span
      aria-hidden='true'
      className={`inline-flex ${className ?? ''}`}
      animate={{ rotate: open ? 180 : 0 }}
      transition={{ duration: duration.fast, ease }}
    >
      {children}
    </m.span>
  );
}
