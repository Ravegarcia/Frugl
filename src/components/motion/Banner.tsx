'use client';

import type { ReactNode } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { banner } from '@/lib/motion';

export default function Banner({
  open,
  className,
  role = 'status',
  children,
}: {
  open: boolean;
  className?: string;
  role?: 'alert' | 'status';
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <m.div
          className={className}
          role={role}
          variants={banner}
          initial='hidden'
          animate='visible'
          exit='exit'
        >
          {children}
        </m.div>
      )}
    </AnimatePresence>
  );
}
