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
import { Avatar } from '../avatar/Avatar';
import type { PublicUser } from '../../types';

export function Header() {
  const { session, signOut } = useAuth();
  const { open } = useAuthModal();
  const [me, setMe] = useState<PublicUser>();

  useEffect(() => {
    if (!session) {
      setMe(undefined);
      return;
    }
    apiFetch<{ user: PublicUser }>('/api/v1/users/me')
      .then((res) => setMe(res.user))
      .catch(() => undefined);
  }, [session]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
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
        <nav className="flex shrink-0 items-center justify-end gap-1">
          {session ? (
            <>
              {me ? (
                <Link
                  href={`/u/${me.handle}`}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:bg-elevated hover:text-ink"
                  title="Your profile"
                >
                  <Avatar avatarId={me.avatarId} handle={me.handle} size={28} />
                  <span className="hidden max-w-[12rem] truncate sm:inline">
                    {me.handle}
                  </span>
                </Link>
              ) : (
                <span className="px-2 text-sm text-ink-3">…</span>
              )}
              <Link
                href="/settings"
                className="hidden h-9 items-center rounded-lg px-3 text-sm font-medium text-ink-2 transition-colors hover:bg-elevated hover:text-ink sm:inline-flex"
                title="Settings"
              >
                Settings
              </Link>
              <Button
                variant="ghost"
                onClick={signOut}
                className="whitespace-nowrap"
              >
                Sign out
              </Button>
            </>
          ) : (
            <Button onClick={open}>Sign in</Button>
          )}
        </nav>
      </div>
    </header>
  );
}
