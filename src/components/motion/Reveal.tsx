'use client';

import type { ReactNode } from 'react';
import { m } from 'motion/react';
import { duration, ease, fadeUp } from '@/lib/motion';

const elements = {
  article: m.article,
  div: m.div,
  nav: m.nav,
  section: m.section,
};

export default function Reveal({
  as = 'div',
  className,
  id,
  ariaLabel,
  delay = 0,
  children,
}: {
  as?: keyof typeof elements;
  className?: string;
  id?: string;
  ariaLabel?: string;
  delay?: number;
  children: ReactNode;
}) {
  const Element = elements[as];

  return (
    <Element
      className={className}
      id={id}
      aria-label={ariaLabel}
      variants={fadeUp}
      initial='hidden'
      whileInView='visible'
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: duration.slow, ease, delay }}
    >
      {children}
    </Element>
  );
}