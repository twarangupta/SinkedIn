'use client';

/**
 * Client-side providers, mounted once in the root layout.
 *
 * Everything interactive (auth session, the sign-in modal) lives on the client,
 * so we group the providers here and render the app-wide AuthModal alongside
 * the page content. Server components (the pages) render inside this boundary.
 */

import type { ReactNode } from 'react';
import { AuthProvider } from '../lib/auth';
import { AuthModalProvider } from '../lib/authModal';
import { MeProvider } from '../lib/me';
import { MyVotesProvider } from '../lib/myVotes';
import { AuthModal } from './AuthModal';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AuthModalProvider>
        <MeProvider>
          <MyVotesProvider>
            {children}
            <AuthModal />
          </MyVotesProvider>
        </MeProvider>
      </AuthModalProvider>
    </AuthProvider>
  );
}
