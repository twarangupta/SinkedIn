'use client';

/**
 * PollBlock — an interactive poll on a Sink.
 *
 * Click an option to vote; click your current choice again to remove it; click
 * a different one to move your vote (one vote per poll — enforced server-side).
 * Logged-out users get the sign-in modal.
 *
 * Like VoteControl, the highlight is optimistic (instant) but the COUNTS come
 * only from the server's response. The public feed is SSR'd without auth, so
 * `myPollVote` is null on first load even for polls you've voted in; computing
 * percentages optimistically from that would be wrong, so we let the server be
 * the source of truth for the numbers.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { useAuthModal } from '../lib/authModal';
import { useMyVotes } from '../lib/myVotes';
import { apiFetch } from '../lib/api';
import type { PollOption } from '../types';

export function PollBlock({
  sinkId,
  options,
  myPollVote,
}: {
  sinkId: string;
  options: PollOption[];
  myPollVote: string | null;
}) {
  const { session } = useAuth();
  const { open } = useAuthModal();
  const myVotes = useMyVotes();
  const [opts, setOpts] = useState(options);
  const [current, setCurrent] = useState<string | null>(myPollVote);
  const [busy, setBusy] = useState(false);

  // Restore the caller's poll choice once their votes load (SSR sent null).
  // Only the highlight is hydrated; the counts are global and already correct.
  useEffect(() => {
    if (!myVotes.loaded) return;
    setCurrent(myVotes.pollVoteBySink.get(sinkId) ?? null);
  }, [myVotes.loaded, myVotes.pollVoteBySink, sinkId]);

  const total = opts.reduce((sum, o) => sum + o._count.votes, 0);

  const choose = async (pollOptionId: string) => {
    if (!session) {
      open();
      return;
    }
    if (busy) return;

    const prevCurrent = current;
    const nextCurrent = current === pollOptionId ? null : pollOptionId; // toggle off
    const prevOpts = opts;

    // Optimistic highlight (always safe).
    setCurrent(nextCurrent);
    // Optimistically move the bar counts too — but only once the caller's own
    // votes have hydrated (#3), so `current` is accurate and we don't miscount
    // a Sink they'd already voted on. Each change is +1 to the new option and
    // -1 from the previous.
    if (myVotes.loaded) {
      setOpts((prev) =>
        prev.map((o) => ({
          ...o,
          _count: {
            votes:
              o._count.votes +
              (o.id === nextCurrent ? 1 : 0) -
              (o.id === prevCurrent ? 1 : 0),
          },
        })),
      );
    }
    setBusy(true);
    try {
      const result = await apiFetch<{
        pollOptions: PollOption[];
        myPollVote: string | null;
      }>(`/api/v1/sinks/${sinkId}/poll-vote`, {
        method: 'POST',
        body: JSON.stringify({ pollOptionId }),
      });
      // Reconcile with the server's authoritative counts + selection.
      setOpts(result.pollOptions);
      setCurrent(result.myPollVote);
    } catch {
      // Revert both highlight and counts on failure.
      setCurrent(prevCurrent);
      setOpts(prevOpts);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-3 space-y-2">
      {opts.map((option) => {
        const pct = total ? Math.round((option._count.votes / total) * 100) : 0;
        const mine = current === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => choose(option.id)}
            disabled={busy}
            aria-pressed={mine}
            className={`relative w-full overflow-hidden rounded-lg border text-left transition-colors disabled:cursor-default ${
              mine ? 'border-primary' : 'border-line hover:border-line-strong'
            } bg-elevated`}
          >
            <div
              className={`absolute inset-y-0 left-0 ${mine ? 'bg-primary/35' : 'bg-primary/20'}`}
              style={{ width: `${pct}%` }}
            />
            <div className="relative flex justify-between px-3 py-2 text-sm">
              <span className={mine ? 'font-medium text-ink' : 'text-ink'}>
                {mine ? '✓ ' : ''}
                {option.label}
              </span>
              <span className="font-mono text-ink-3">{pct}%</span>
            </div>
          </button>
        );
      })}
      <div className="text-xs text-ink-3">
        {total} {total === 1 ? 'vote' : 'votes'}
      </div>
    </div>
  );
}
