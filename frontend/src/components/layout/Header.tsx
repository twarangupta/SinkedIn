'use client';

/**
 * Top header bar — wordmark (links home), search (stub), and the auth area.
 * Reads the current user from the shared MeProvider (fetched once app-wide).
 */

import Link from 'next/link';
import { useAuth } from '../../lib/auth';
import { useAuthModal } from '../../lib/authModal';
import { useMe } from '../../lib/me';
import { Button } from '../ui/Button';
import { BoatMark } from '../BoatMark';
import { ProfileMenu } from '../ProfileMenu';

export function Header() {
  const { session } = useAuth();
  const { open } = useAuthModal();
  const { me } = useMe();

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
          className="hidden h-10 min-w-0 max-w-2xl flex-1 rounded-lg border border-line bg-elevated px-3 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-primary md:block"
        />
        <nav className="ml-auto flex shrink-0 items-center justify-end gap-1">
          {session ? (
            me ? (
              <ProfileMenu me={me} />
            ) : (
              <span className="px-2 text-sm text-ink-3">…</span>
            )
          ) : (
            <Button onClick={open} className="!h-9">
              Sign in
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
