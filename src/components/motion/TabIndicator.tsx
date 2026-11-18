'use client';

import type { CSSProperties } from 'react';
import { m } from 'motion/react';
import { spring } from '@/lib/motion';

export default function TabIndicator({
  groupId,
  className,
  style,
}: {
  groupId: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <m.span
      aria-hidden='true'
      className={className}
      layoutId={`tab-indicator-${groupId}`}
      transition={spring}
      style={style}
    />
  );
}
