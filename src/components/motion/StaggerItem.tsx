'use client';

import type { ReactNode } from 'react';
import { m } from 'motion/react';
import { fadeUp } from '@/lib/motion';

export default function StaggerItem({
  as = 'div',
  className,
  children,
  index,
  initiallyVisible = false,
  role,
  layout = false,
}: {
  as?: 'article' | 'div' | 'li';
  className?: string;
  children: ReactNode;
  index: number;
  initiallyVisible?: boolean;
  role?: string;
  layout?: boolean;
}) {
  const elements = { article: m.article, div: m.div, li: m.li };
  const Element = elements[as];
  const beyondStaggerLimit = index >= 12 || initiallyVisible;

  return (
    <Element
      className={className}
      role={role}
      layout={layout}
      variants={beyondStaggerLimit ? undefined : fadeUp}
      initial={beyondStaggerLimit ? false : 'hidden'}
    >
      {children}
    </Element>
  );
}
