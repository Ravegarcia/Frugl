'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from '@/components/icons';
import AuthForm from '@/components/AuthForm';
import Modal from '@/components/motion/Modal';

export type AuthModalMode = 'login' | 'register' | 'forgot';

export default function AuthModalDialog({
  mode,
  next,
  isStandalonePage = false,
}: {
  mode: AuthModalMode;
  next: string;
  isStandalonePage?: boolean;
}) {
  const router = useRouter();
  const [activeMode, setActiveMode] = useState<AuthModalMode>(mode);
  const [isVisible, setIsVisible] = useState(true);
  const closeAfterExitRef = useRef(false);

  function handleModeChange(nextMode: AuthModalMode) {
    setActiveMode(nextMode);
    const path =
      nextMode === 'login'
        ? '/login'
        : nextMode === 'register'
          ? '/register'
          : '/forgot-password';
    const url = next && next !== '/' ? `${path}?next=${encodeURIComponent(next)}` : path;
    window.history.replaceState(window.history.state, '', url);
  }

  function finishClose() {
    if (isStandalonePage || window.history.length <= 1) {
      router.push(next || '/');
    } else {
      router.back();
    }
  }

  function close() {
    if (!isVisible) return;
    closeAfterExitRef.current = true;
    setIsVisible(false);
  }

  return (
    <Modal
      open={isVisible}
      onClose={close}
      labelledBy='auth-title'
      className='auth-modal'
      onExitComplete={() => {
        if (closeAfterExitRef.current) finishClose();
      }}
    >
      <div className='auth-modal-header'>
        <button
          type='button'
          className='auth-modal-close'
          onClick={close}
          aria-label='Close sign-in dialog'
        >
          <X size={18} />
        </button>
      </div>
      <div className='auth-modal-body'>
        <AuthForm
          mode={activeMode}
          next={next}
          presentation='modal'
          onModeChange={handleModeChange}
        />
      </div>
    </Modal>
  );
}
