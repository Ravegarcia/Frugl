'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from '@/components/icons';
import AuthForm from '@/components/AuthForm';

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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activeMode, setActiveMode] = useState<AuthModalMode>(mode);

  useEffect(() => {
    setActiveMode(mode);
  }, [mode]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLInputElement>('input')?.focus();
    }
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

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

  function close() {
    if (isStandalonePage || window.history.length <= 1) {
      router.push(next || '/');
    } else {
      router.back();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className='auth-modal'
      aria-labelledby='auth-title'
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          close();
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
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
    </dialog>
  );
}
