'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { X } from '@/components/icons';
import Modal from '@/components/motion/Modal';

export default function ReviewModal({ children }: { children: ReactNode }) {
  const router = useRouter();

  const close = () => router.back();

  return (
    <Modal
      open
      onClose={close}
      labelledBy='review-modal-title'
      className='review-modal-panel'
    >
      <h2 id='review-modal-title' className='sr-only'>Rate the other person after your sale</h2>
      <button
        type='button'
        className='review-modal-close'
        onClick={close}
        aria-label='Close rating dialog'
      >
        <X size={18} />
      </button>
      {children}
    </Modal>
  );
}
