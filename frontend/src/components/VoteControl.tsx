'use client';

/**
 * VoteControl — Buoy (up) / Anchor (down) with the live score.
 *
 * The arrows are a STEPPER clamped to [-1, +1]: ▲ moves the caller's vote one
 * step up (Anchor → none → Buoy), ▼ one step down (Buoy → none → Anchor), and
 * pressing past an end does nothing. A single user can therefore only ever
 * shift a Sink's score by 1. Logged-out users get the sign-in modal.
 *
 * The highlight updates optimistically (instant); the number also updates
 * optimistically once the caller's own votes have hydrated (see lib/myVotes),
 * then reconciles to the server's authoritative score.
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

  const vote = async (direction: 'UP' | 'DOWN') => {
    if (!session) {
      open();
      return;
    }
    if (busy) return;

    const weight = (v: Vote) => (v === 'BUOY' ? 1 : v === 'ANCHOR' ? -1 : 0);

    // Best-effort optimistic guess for instant feedback. We only send the
    // DIRECTION — the SERVER reads the caller's real vote and clamps the step to
    // [-1, +1] (see stepVote), so a stale/unhydrated guess can never cause a
    // 2-point swing; it just reconciles to the server's answer.
    const guess: Vote =
      direction === 'UP'
        ? current === 'ANCHOR'
          ? null
          : (current ?? 'BUOY')
        : current === 'BUOY'
          ? null
          : (current ?? 'ANCHOR');

    const prevVote = current;
    const prevCount = count;

    setCurrent(guess);
    // Only nudge the number optimistically once votes have hydrated, so the
    // guess is accurate; otherwise wait for the server's authoritative score.
    if (myVotes.loaded) setCount((c) => c + weight(guess) - weight(prevVote));
    setBusy(true);

    try {
      const result = await apiFetch<{ score: number; myVote: Vote }>(
        `/api/v1/sinks/${sinkId}/vote`,
        { method: 'POST', body: JSON.stringify({ direction }) },
      );
      // Server truth — clamped, so at most a 1-point move.
      setCount(result.score);
      setCurrent(result.myVote);
    } catch {
      setCurrent(prevVote);
      setCount(prevCount);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-line px-2 py-1">
      <button
        onClick={() => vote('UP')}
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
        onClick={() => vote('DOWN')}
        aria-label="Anchor (downvote)"
        className={`leading-none ${current === 'ANCHOR' ? 'text-anchor' : 'text-ink-3 hover:text-anchor'}`}
      >
        ▼
      </button>
    </div>
  );
}
