'use client';

/**
 * VoteControl — Buoy (up) / Anchor (down) with the live score.
 *
 * Logged-out users get the sign-in modal. Clicking the vote you already have
 * removes it (toggle).
 *
 * Responsiveness without lying about the count: on click we optimistically
 * flip the ARROW highlight (always safe — it just reflects the button you
 * pressed), but the NUMBER is only ever set from the server's authoritative
 * response. We can't optimistically compute the number because the public feed
 * is server-rendered WITHOUT auth (for SEO), so `myVote` arrives as null even
 * for Sinks you've already voted on — trusting it to compute a delta would
 * double-count (1 → 2 → 1). Server-truth for the number avoids that entirely.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { useAuthModal } from '../lib/authModal';
import { useMyVotes } from '../lib/myVotes';
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
  const myVotes = useMyVotes();
  const [current, setCurrent] = useState<Vote>(myVote);
  const [count, setCount] = useState(score);
  const [busy, setBusy] = useState(false);

  // Restore the caller's own highlight once their votes load (SSR sent null).
  // Runs only when the map loads/changes — not after a click — so it never
  // clobbers an in-progress vote. The count is untouched (already correct).
  useEffect(() => {
    if (!myVotes.loaded) return;
    setCurrent(myVotes.voteBySink.get(sinkId) ?? null);
  }, [myVotes.loaded, myVotes.voteBySink, sinkId]);

  const vote = async (value: 'BUOY' | 'ANCHOR') => {
    if (!session) {
      open();
      return;
    }
    if (busy) return;

    // Toggling the vote you already hold removes it.
    const removing = current === value;
    const nextVote: Vote = removing ? null : value;

    // Snapshot the highlight for revert-on-error.
    const prevVote = current;

    // Optimistically flip ONLY the arrow highlight (safe — it just reflects the
    // button pressed). The number is left untouched until the server answers.
    setCurrent(nextVote);
    setBusy(true);

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
      // Authoritative values from the server — the only source for the number.
      setCount(result.score);
      setCurrent(result.myVote);
    } catch {
      // Revert the optimistic highlight if the request failed.
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
