'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { fade, modalPanel } from '@/lib/motion';

export default function Modal({
  open,
  onClose,
  labelledBy,
  className,
  onExitComplete,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  className?: string;
  onExitComplete?: () => void;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (
        document.activeElement === first ||
        document.activeElement === panelRef.current ||
        !panelRef.current.contains(document.activeElement)
      )) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (
        document.activeElement === last ||
        !panelRef.current.contains(document.activeElement)
      )) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      returnFocusRef.current?.focus();
    };
  }, [open]);

  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {open && (
        <m.div
          className='motion-modal-overlay'
          role='presentation'
          variants={fade}
          initial='hidden'
          animate='visible'
          exit='exit'
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <m.div
            ref={panelRef}
            className={className}
            role='dialog'
            aria-modal='true'
            aria-labelledby={labelledBy}
            tabIndex={-1}
            variants={modalPanel}
            initial='hidden'
            animate='visible'
            exit='exit'
          >
            {children}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
