'use client';

/**
 * MobileMenu — the hamburger drawer shown below `lg` in place of the profile
 * icon (the sidebar is desktop-only, so on mobile this is the single entry point
 * to everything: the main nav, the signed-in user's tracker counts, and the
 * profile/auth actions).
 *
 * Closes on backdrop click, Escape, or selecting an item.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth';
import { useAuthModal } from '../../lib/authModal';
import { useMe } from '../../lib/me';
import { TrackerNav } from '../tracker/TrackerNav';

const STUBS = ['Companies', 'Interviews', 'Salaries', 'Leaderboard'];

export function MobileMenu() {
  const { session, signOut } = useAuth();
  const { open: openAuth } = useAuthModal();
  const { me } = useMe();
  const [open, setOpen] = useState(false);

  // Lock body scroll + close on Escape while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const close = () => setOpen(false);
  const rowCls =
    'block w-full rounded-lg px-3 py-2.5 text-left text-sm text-ink-2 transition-colors hover:bg-elevated hover:text-ink';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-2 hover:bg-elevated hover:text-ink"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={close} />
          <div className="absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto border-l border-line bg-surface p-3 shadow-xl">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="font-display text-lg font-semibold">Menu</span>
              <button onClick={close} aria-label="Close menu" className="text-ink-3 hover:text-ink">
                ✕
              </button>
            </div>

            <nav className="space-y-0.5">
              <Link href="/" onClick={close} className={rowCls}>
                Home
              </Link>
              <Link href="/tracker" onClick={close} className={rowCls}>
                Tracker
              </Link>
              {STUBS.map((label) => (
                <button key={label} onClick={close} className={rowCls}>
                  {label}
                </button>
              ))}
            </nav>

            {/* Signed-in: tracker counts (returns null when signed out). */}
            <div className="mt-4">
              <TrackerNav rowClassName={rowCls} />
            </div>

            <div className="my-3 border-t border-line" />

            {session ? (
              <div className="space-y-0.5">
                {me && (
                  <Link href={`/u/${me.handle}`} onClick={close} className={rowCls}>
                    View profile
                  </Link>
                )}
                <Link href="/tracker/app" onClick={close} className={rowCls}>
                  Job Tracker
                </Link>
                <Link href="/saved" onClick={close} className={rowCls}>
                  Saved
                </Link>
                <Link href="/settings" onClick={close} className={rowCls}>
                  Settings
                </Link>
                <button
                  onClick={() => {
                    close();
                    signOut();
                  }}
                  className={rowCls}
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  close();
                  openAuth();
                }}
                className="w-full rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
