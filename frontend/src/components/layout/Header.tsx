'use client';

/**
 * Top header bar — wordmark (links home), search (stub), and the auth area.
 * Fetches the current user's handle itself, so any page can just render <Header/>.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth';
import { useAuthModal } from '../../lib/authModal';
import { apiFetch } from '../../lib/api';
import { Button } from '../ui/Button';
import { BoatMark } from '../BoatMark';

export function Header() {
  const { session, signOut } = useAuth();
  const { open } = useAuthModal();
  const [handle, setHandle] = useState<string>();

  useEffect(() => {
    if (!session) {
      setHandle(undefined);
      return;
    }
    apiFetch<{ user: { handle: string } }>('/api/v1/users/me')
      .then((res) => setHandle(res.user.handle))
      .catch(() => undefined);
  }, [session]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 lg:w-52"
        >
          <BoatMark size={36} />
          <span className="min-w-0 leading-tight">
            <span className="block font-display text-xl font-bold">
              SinkedIn<span className="text-violet">.in</span>
            </span>
            <span className="block whitespace-nowrap text-xs text-ink-2">
              The real side of the job market
            </span>
          </span>
        </Link>
        <input
          placeholder="Search Sinks, categories, people…"
          className="hidden h-10 min-w-0 flex-1 rounded-lg border border-line bg-elevated px-3 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-primary md:block"
        />
        <div className="flex shrink-0 items-center justify-end gap-3 xl:w-72">
          {session ? (
            <>
              {handle ? (
                <Link
                  href={`/u/${handle}`}
                  className="text-sm text-ink-2 hover:text-ink hover:underline"
                  title="Your profile"
                >
                  {handle}
                </Link>
              ) : (
                <span className="text-sm text-ink-3">…</span>
              )}
              <Button variant="ghost" onClick={signOut}>
                Sign out
              </Button>
            </>
          ) : (
            <Button onClick={open}>Sign in</Button>
          )}
        </div>
      </div>
    </header>
  );
}
