'use client';

import { m, useReducedMotion } from 'motion/react';

export default function BrandLoader() {
  const reduceMotion = useReducedMotion();

  return (
    <div className='brand-loader' role='status' aria-label='Loading Frugl'>
      <div className='brand-loader-mark' aria-hidden='true'>
        <m.span
          className='brand-loader-ring brand-loader-ring-outer'
          animate={reduceMotion ? { opacity: 0.35, scale: 1 } : { opacity: [0.55, 0], scale: [0.9, 1.65] }}
          transition={reduceMotion ? undefined : { duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
        />
        <m.span
          className='brand-loader-ring brand-loader-ring-inner'
          animate={reduceMotion ? { opacity: 0.45, scale: 1 } : { opacity: [0.55, 0], scale: [0.9, 1.4] }}
          transition={reduceMotion ? undefined : { duration: 1.8, delay: 0.55, repeat: Infinity, ease: 'easeOut' }}
        />
        <m.span
          className='brand-loader-orb'
          animate={reduceMotion ? { scale: 1 } : { scale: [1, 1.08, 1] }}
          transition={reduceMotion ? undefined : { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      <m.span
        className='brand-loader-wordmark'
        animate={reduceMotion ? { opacity: 1 } : { opacity: [0.65, 1] }}
        transition={reduceMotion ? undefined : { duration: 1.1, repeat: Infinity, repeatType: 'reverse' }}
      >
        Frugl
      </m.span>
      <div className='brand-loader-progress' aria-hidden='true'>
        <m.span
          animate={reduceMotion ? { x: 0 } : { x: ['-100%', '100%'] }}
          transition={reduceMotion ? undefined : { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
}
