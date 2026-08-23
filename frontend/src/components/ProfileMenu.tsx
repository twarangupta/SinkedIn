'use client';

/**
 * ProfileMenu — the signed-in user's avatar + handle in the header, which opens
 * a small dropdown (View profile, Settings, Sign out). Closes on outside click,
 * Escape, or selecting an item. This is the single auth control in the navbar —
 * there is no separate Sign out button.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../lib/auth';
import { Avatar } from './avatar/Avatar';
import type { PublicUser } from '../types';

export function ProfileMenu({ me }: { me: PublicUser }) {
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const itemCls =
    'block px-3 py-2 text-sm text-ink-2 transition-colors hover:bg-elevated hover:text-ink';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Your profile"
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:bg-elevated hover:text-ink"
      >
        <Avatar avatarId={me.avatarId} handle={me.handle} size={36} />
        <span className="hidden max-w-[12rem] truncate sm:inline">
          {me.handle}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-lg"
        >
          <Link
            href={`/u/${me.handle}`}
            role="menuitem"
            onClick={() => setOpen(false)}
            className={itemCls}
          >
            View profile
          </Link>
          <Link
            href="/saved"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={itemCls}
          >
            Saved
          </Link>
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={itemCls}
          >
            Settings
          </Link>
          <div className="my-1 border-t border-line" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className={`${itemCls} w-full text-left`}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
