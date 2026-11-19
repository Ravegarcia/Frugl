'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { dropdown } from '@/lib/motion';

export default function Popover({
  open,
  onClose,
  align = 'right',
  className,
  id,
  role,
  ariaLabel,
  anchorRef,
  children,
}: {
  open: boolean;
  onClose: () => void;
  align?: 'left' | 'right';
  className?: string;
  id?: string;
  role?: string;
  ariaLabel?: string;
  anchorRef?: { current: HTMLElement | null };
  children: ReactNode;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const activeElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    triggerRef.current = activeElement && (
      !anchorRef?.current || anchorRef.current.contains(activeElement)
    )
      ? activeElement
      : anchorRef?.current?.querySelector<HTMLElement>(
        'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ) ?? activeElement;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !popoverRef.current?.contains(target) &&
        !anchorRef?.current?.contains(target)
      ) {
        onCloseRef.current();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onCloseRef.current();
      triggerRef.current?.focus();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, anchorRef]);

  return (
    <AnimatePresence>
      {open && (
        <m.div
          ref={popoverRef}
          id={id}
          role={role}
          aria-label={ariaLabel}
          className={className}
          style={{ transformOrigin: align === 'right' ? 'top right' : 'top left' }}
          variants={dropdown}
          initial='hidden'
          animate='visible'
          exit='exit'
        >
          {children}
        </m.div>
      )}
    </AnimatePresence>
  );
}
