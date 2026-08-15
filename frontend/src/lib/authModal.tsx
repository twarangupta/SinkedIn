/* eslint-disable react-refresh/only-export-components */
/**
 * Auth-modal context — powers the "public-first, sign-in on action" model.
 *
 * The app renders for everyone; when a logged-out user triggers a gated action
 * (post, vote, comment), we `open()` the sign-in modal instead of gating the
 * whole app. `requireAuth(action)` runs the action if signed in, else opens it.
 */

import { createContext, useContext, useState, type ReactNode } from 'react';
import { useAuth } from './auth';

interface AuthModalValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const AuthModalContext = createContext<AuthModalValue | undefined>(undefined);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <AuthModalContext.Provider
      value={{ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }}
    >
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal(): AuthModalValue {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error('useAuthModal must be used within AuthModalProvider');
  return ctx;
}

/** Returns a guard: run `action` if signed in, otherwise open the sign-in modal. */
export function useRequireAuth() {
  const { session } = useAuth();
  const { open } = useAuthModal();
  return (action: () => void) => {
    if (session) action();
    else open();
  };
}
