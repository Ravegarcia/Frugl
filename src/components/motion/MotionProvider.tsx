'use client';

import type { PropsWithChildren } from 'react';
import { domAnimation, LazyMotion, MotionConfig } from 'motion/react';

export default function MotionProvider({ children }: PropsWithChildren) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion='user'>{children}</MotionConfig>
    </LazyMotion>
  );
}