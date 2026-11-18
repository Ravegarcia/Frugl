'use client';

import type { PropsWithChildren } from 'react';
import { domAnimation, domMax, LazyMotion, MotionConfig } from 'motion/react';

const motionFeatures = { ...domAnimation, layout: domMax.layout };

export default function MotionProvider({ children }: PropsWithChildren) {
  return (
    <LazyMotion features={motionFeatures} strict>
      <MotionConfig reducedMotion='user'>{children}</MotionConfig>
    </LazyMotion>
  );
}