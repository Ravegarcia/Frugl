'use client';

import type { ReactNode } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { staggerContainer } from '@/lib/motion';

export default function Stagger({
  as = 'div',
  className,
  children,
  stagger = 0.06,
  role,
  'aria-label': ariaLabel,
}: {
  as?: 'div' | 'ul';
  className?: string;
  children: ReactNode;
  stagger?: number;
  role?: string;
  'aria-label'?: string;
}) {
  const Element = as === 'ul' ? m.ul : m.div;

  return (
    <Element
      className={className}
      role={role}
      aria-label={ariaLabel}
      variants={staggerContainer(stagger)}
      initial='hidden'
      whileInView='visible'
      viewport={{ once: true, margin: '-80px' }}
    >
      <AnimatePresence mode='popLayout'>{children}</AnimatePresence>
    </Element>
  );
}