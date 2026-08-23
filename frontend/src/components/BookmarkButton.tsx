'use client';

/**
 * BookmarkButton — save / unsave a Sink to the caller's private bookmarks.
 *
 * Signed-out clicks open the sign-in modal (public-first). The saved state is
 * hydrated once from the shared MyVotes provider (which also carries the
 * caller's bookmark ids), then toggled optimistically against
 * POST/DELETE /api/v1/sinks/:id/bookmark. Bookmarks are private to the user and
 * never affect a Sink's public score.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { useAuthModal } from '../lib/authModal';
import { useMe } from '../lib/me';
import { useMyVotes } from '../lib/myVotes';
import { apiFetch } from '../lib/api';

export function BookmarkButton({
  sinkId,
  size = 'md',
  showLabel = true,
  count = 0,
  authorId,
}: {
  sinkId: string;
  size?: 'sm' | 'md';
  /** When false, render just the ribbon icon (used at the card's top-right). */
  showLabel?: boolean;
  /** Total number of users who saved this Sink (public count). */
  count?: number;
  /** The Sink author's id; when it's the caller, we hide Save (no self-bookmark). */
  authorId?: string;
}) {
  const { session } = useAuth();
  const { open } = useAuthModal();
  const { me } = useMe();
  const my = useMyVotes();
  const [saved, setSaved] = useState(false);
  // Public count from SSR already includes this user's own save (if any), so we
  // only adjust it on a user-initiated toggle, never on hydration.
  const [saves, setSaves] = useState(count);
  const [busy, setBusy] = useState(false);

  // Restore the caller's own saved state once hydration lands (SSR can't know it).
  useEffect(() => {
    if (my.loaded) setSaved(my.bookmarkedSinks.has(sinkId));
  }, [my.loaded, my.bookmarkedSinks, sinkId]);

  // No bookmarking your own Sink — hide Save on the author's own posts.
  if (authorId && me?.id === authorId) return null;

  const toggle = async () => {
    if (!session) {
      open();
      return;
    }
    if (busy) return;
    const next = !saved;
    setSaved(next); // optimistic
    setSaves((c) => Math.max(0, c + (next ? 1 : -1)));
    setBusy(true);
    try {
      await apiFetch(`/api/v1/sinks/${sinkId}/bookmark`, {
        method: next ? 'POST' : 'DELETE',
      });
    } catch {
      setSaved(!next); // revert on failure
      setSaves((c) => Math.max(0, c + (next ? -1 : 1)));
    } finally {
      setBusy(false);
    }
  };

  const textCls = size === 'sm' ? 'text-xs' : 'text-sm';

  const ribbon = (
    <svg
      width={size === 'sm' ? 14 : 16}
      height={size === 'sm' ? 14 : 16}
      viewBox="0 0 24 24"
      fill={saved ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );

  // Icon-only variant (card top-right): the ribbon plus the save count.
  if (!showLabel) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={saved}
        aria-label={saved ? 'Remove bookmark' : 'Save this Sink'}
        title={saved ? 'Saved' : 'Save'}
        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs hover:bg-elevated ${
          saved ? 'text-buoy' : 'text-ink-3 hover:text-ink'
        }`}
      >
        {ribbon}
        {saves > 0 && <span className="tabular-nums">{saves}</span>}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? 'Remove bookmark' : 'Save this Sink'}
      className={`inline-flex items-center gap-1.5 ${
        saved ? 'text-buoy' : 'text-ink-3 hover:text-ink'
      } ${textCls}`}
    >
      {ribbon}
      {saved ? 'Saved' : 'Save'}
      {saves > 0 && <span className="tabular-nums">{saves}</span>}
    </button>
  );
}
