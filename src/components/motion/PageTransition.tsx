'use client';

import type { ReactNode } from 'react';
import { m } from 'motion/react';
import { duration, ease } from '@/lib/motion';

export default function PageTransition({ children }: { children: ReactNode }) {
  return (
    <m.div
      initial={{ opacity: 0.92, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration.base, ease }}
    >
      {children}
    </m.div>
  );
}
