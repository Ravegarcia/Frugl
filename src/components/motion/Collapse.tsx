'use client';

import type { ReactNode } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { duration, ease } from '@/lib/motion';

export default function Collapse({
  open,
  children,
  className,
  id,
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <m.div
          id={id}
          className={className}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: duration.base, ease }}
          style={{ overflow: 'hidden' }}
        >
          {children}
        </m.div>
      )}
    </AnimatePresence>
  );
}
