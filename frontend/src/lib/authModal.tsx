'use client';

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
  /**
   * Open the sign-in modal. Pass `redirectTo` to send the user to that path
   * after a successful sign-in (e.g. the tracker view they clicked while signed
   * out) — the modal consumes it on success.
   */
  open: (redirectTo?: string) => void;
  close: () => void;
  /** Where to navigate after a successful sign-in, if the opener requested it. */
  redirectTo: string | null;
}

const AuthModalContext = createContext<AuthModalValue | undefined>(undefined);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  return (
    <AuthModalContext.Provider
      value={{
        isOpen,
        redirectTo,
        open: (to?: string) => {
          setRedirectTo(to ?? null);
          setIsOpen(true);
        },
        close: () => {
          setIsOpen(false);
          setRedirectTo(null);
        },
      }}
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
