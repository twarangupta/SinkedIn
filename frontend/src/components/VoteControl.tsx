'use client';

/**
 * VoteControl — Buoy (up) / Anchor (down) with the live score.
 *
 * Logged-out users get the sign-in modal. Clicking the vote you already have
 * removes it (toggle). Updates optimistically from the API's returned score.
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
    setBusy(true);
    try {
      const result =
        current === value
          ? await apiFetch<{ score: number; myVote: Vote }>(
              `/api/v1/sinks/${sinkId}/vote`,
              { method: 'DELETE' },
            )
          : await apiFetch<{ score: number; myVote: Vote }>(
              `/api/v1/sinks/${sinkId}/vote`,
              { method: 'POST', body: JSON.stringify({ value }) },
            );
      setCount(result.score);
      setCurrent(result.myVote);
    } catch {
      // ignore transient vote errors
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
