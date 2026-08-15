'use client';

/**
 * Sign-in modal — shown on demand (public-first). Closes on success, on the
 * backdrop click, or Escape.
 */

import { useEffect } from 'react';
import { useAuthModal } from '../lib/authModal';
import { AuthForm } from './AuthForm';

export function AuthModal() {
  const { isOpen, close } = useAuthModal();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={close}
    >
      <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="rounded-2xl border border-line bg-surface p-6">
          <AuthForm onSuccess={close} />
        </div>
      </div>
    </div>
  );
}
