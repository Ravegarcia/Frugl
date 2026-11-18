'use client';

import type { ReactNode } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { toast as toastVariants } from '@/lib/motion';

export default function Toast({
  open,
  className,
  toastKey,
  children,
}: {
  open: boolean;
  className?: string;
  toastKey?: string | number;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <m.div
          key={toastKey ?? 'toast'}
          className={className}
          role='status'
          aria-live='polite'
          variants={toastVariants}
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
