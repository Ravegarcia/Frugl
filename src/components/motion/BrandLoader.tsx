'use client';

import { m, useReducedMotion } from 'motion/react';
import { Laptop } from '@/components/icons';

export default function BrandLoader() {
  const reduceMotion = useReducedMotion();

  return (
    <div className='brand-loader' role='status' aria-label='Loading Frugl marketplace' aria-live='polite'>
      <div className='brand-loader-content'>
        <div className='brand-loader-art' aria-hidden='true'>
          <m.div
            className='brand-loader-orbit'
            animate={reduceMotion ? { rotate: 0 } : { rotate: 360 }}
            transition={reduceMotion ? undefined : { duration: 12, repeat: Infinity, ease: 'linear' }}
          >
            <span className='brand-loader-orbit-dot' />
          </m.div>
          <m.div
            className='brand-loader-device'
            animate={reduceMotion ? { y: 0 } : { y: [0, -5, 0] }}
            transition={reduceMotion ? undefined : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Laptop size={42} />
          </m.div>
          <span className='brand-loader-spark' />
        </div>
        <p className='brand-loader-wordmark'>Frugl</p>
        <p className='brand-loader-message'>Good finds take a moment.</p>
        <div className='brand-loader-progress' aria-hidden='true'>
          <m.span
            animate={reduceMotion ? { x: 0 } : { x: ['-110%', '210%'] }}
            transition={reduceMotion ? undefined : { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </div>
    </div>
  );
}
