'use client';

/**
 * VoteControl — Buoy (up) / Anchor (down) with the live score.
 *
 * Logged-out users get the sign-in modal. Clicking the vote you already have
 * removes it (toggle).
 *
 * TRUE optimistic update: the score + highlight change the INSTANT you click,
 * before the network call. The API runs in the background; when it returns we
 * reconcile to the server's authoritative score, and if it fails we revert.
 * This is what makes voting feel instant even though the round-trip to the
 * backend (and its DB in Mumbai) takes a beat.
 */

import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useAuthModal } from '../lib/authModal';
import { apiFetch } from '../lib/api';

type Vote = 'BUOY' | 'ANCHOR' | null;

export function VoteControl({
  sinkId,
  score,
  myVote,
}: {
  sinkId: string;
  score: number;
  myVote: Vote;
}) {
  const { session } = useAuth();
  const { open } = useAuthModal();
  const [current, setCurrent] = useState<Vote>(myVote);
  const [count, setCount] = useState(score);
  const [busy, setBusy] = useState(false);

  const vote = async (value: 'BUOY' | 'ANCHOR') => {
    if (!session) {
      open();
      return;
    }
    if (busy) return;

    // Toggling the vote you already hold removes it.
    const removing = current === value;
    const nextVote: Vote = removing ? null : value;

    // Compute the score delta THIS click causes, so we can apply it instantly.
    // A vote contributes +1 (BUOY) or -1 (ANCHOR) to the score; switching sides
    // therefore moves the score by 2.
    const weight = (v: Vote) => (v === 'BUOY' ? 1 : v === 'ANCHOR' ? -1 : 0);
    const delta = weight(nextVote) - weight(current);

    // Snapshot for revert-on-error.
    const prevVote = current;
    const prevCount = count;

    // 1) Optimistic: update the UI immediately, before any network call.
    setCurrent(nextVote);
    setCount((c) => c + delta);
    setBusy(true);

    // 2) Fire the request in the background; reconcile or revert when it returns.
    try {
      const result = removing
        ? await apiFetch<{ score: number; myVote: Vote }>(
            `/api/v1/sinks/${sinkId}/vote`,
            { method: 'DELETE' },
          )
        : await apiFetch<{ score: number; myVote: Vote }>(
            `/api/v1/sinks/${sinkId}/vote`,
            { method: 'POST', body: JSON.stringify({ value }) },
          );
      // Reconcile with the server's authoritative values (also picks up other
      // users' votes since the page loaded).
      setCount(result.score);
      setCurrent(result.myVote);
    } catch {
      // Revert the optimistic change if the request failed.
      setCount(prevCount);
      setCurrent(prevVote);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-line px-2 py-1">
      <button
        onClick={() => vote('BUOY')}
        aria-label="Buoy (upvote)"
        className={`leading-none ${current === 'BUOY' ? 'text-buoy' : 'text-ink-3 hover:text-buoy'}`}
      >
        ▲
      </button>
      <span
        className={`font-mono ${
          current === 'BUOY'
            ? 'text-buoy'
            : current === 'ANCHOR'
              ? 'text-anchor'
              : 'text-ink'
        }`}
      >
        {count}
      </span>
      <button
        onClick={() => vote('ANCHOR')}
        aria-label="Anchor (downvote)"
        className={`leading-none ${current === 'ANCHOR' ? 'text-anchor' : 'text-ink-3 hover:text-anchor'}`}
      >
        ▼
      </button>
    </div>
  );
}
