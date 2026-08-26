'use client';

/**
 * NotificationBell — the in-app bell (Phase 2 retention). Shows the signed-in
 * user's recent notifications with an unread count; opening the panel marks them
 * read. Rendered only for signed-in users (the Header gates it).
 *
 * Data is JWT-fetched from the owner-scoped /notifications endpoint, so nothing
 * private lands in server HTML. Polls lightly so the badge stays fresh.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../lib/api';
import { timeAgo } from '../lib/format';

interface Notification {
  id: string;
  type: 'REPLY' | 'BUOY' | 'POLL';
  actor: { handle: string; avatarId: string } | null;
  count: number | null;
  sinkId: string | null;
  commentId: string | null;
  readAt: string | null;
  createdAt: string;
}

/** Human sentence for a notification. */
function label(n: Notification): string {
  switch (n.type) {
    case 'REPLY': {
      const who = n.actor?.handle ?? 'Someone';
      return n.commentId
        ? `${who} replied to your comment`
        : `${who} commented on your Sink`;
    }
    case 'BUOY':
      return `Your Sink hit ${n.count ?? 0} buoys 🌊`;
    case 'POLL':
      return `Your poll passed ${n.count ?? 0} votes`;
    default:
      return 'New activity';
  }
}

/** Where a notification links to (the Sink, anchored to the comment if any). */
function href(n: Notification): string {
  if (!n.sinkId) return '#';
  return n.commentId ? `/s/${n.sinkId}#c-${n.commentId}` : `/s/${n.sinkId}`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ notifications: Notification[]; unreadCount: number }>(
        '/api/v1/notifications',
      );
      setItems(data.notifications);
      setUnread(data.unreadCount);
    } catch {
      /* leave prior state */
    }
  }, []);

  // Fetch on mount, then poll gently so the badge stays fresh.
  useEffect(() => {
    load();
    const id = window.setInterval(load, 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    // Opening with unread items marks them read (optimistically clear the badge).
    if (next && unread > 0) {
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
      try {
        await apiFetch('/api/v1/notifications/read', { method: 'POST' });
      } catch {
        /* badge will re-sync on next poll */
      }
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : 'Notifications'}
        onClick={toggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-elevated hover:text-ink"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-line bg-surface shadow-2xl">
          <div className="border-b border-line px-4 py-2.5 text-sm font-medium text-ink">
            Notifications
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink-3">
                Nothing yet. Post a Sink and the ripples will show up here.
              </p>
            ) : (
              items.map((n) => (
                <Link
                  key={n.id}
                  href={href(n)}
                  onClick={() => setOpen(false)}
                  className={`block border-b border-line/60 px-4 py-3 text-sm transition-colors last:border-0 hover:bg-elevated ${
                    n.readAt ? 'text-ink-2' : 'bg-primary/5 text-ink'
                  }`}
                >
                  <div>{label(n)}</div>
                  <div className="mt-0.5 text-xs text-ink-3">{timeAgo(n.createdAt)}</div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
