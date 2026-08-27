'use client';

/**
 * ReactionBar — one-tap solidarity reactions on a Sink (Rant → "Been there",
 * Ghosted → "Same"). Config-driven: it renders whatever reactions the Sink's
 * category offers, so adding/altering reactions is a pure data change.
 *
 * Separate from Buoy/Anchor voting (that's ranking; this is solidarity). One
 * reaction per user per Sink: tapping toggles/switches it. Signed-out taps open
 * the sign-in modal. Counts come from SSR; the caller's own highlight hydrates
 * from the MyVotes provider (public pages render without auth).
 */

import { useState } from 'react';
import { useRequireAuth } from '../lib/authModal';
import { useMyVotes } from '../lib/myVotes';
import { apiFetch } from '../lib/api';
import type { ReactionOption } from '../types';

export function ReactionBar({
  sinkId,
  options,
  initialCounts,
  initialMine,
}: {
  sinkId: string;
  options: ReactionOption[] | null | undefined;
  initialCounts: Record<string, number> | undefined;
  initialMine: string | null | undefined;
}) {
  const requireAuth = useRequireAuth();
  const { reactionBySink, loaded } = useMyVotes();
  const [counts, setCounts] = useState<Record<string, number>>(initialCounts ?? {});
  const [mine, setMine] = useState<string | null>(initialMine ?? null);
  const [touched, setTouched] = useState(false);

  if (!options || options.length === 0) return null;

  // SSR renders `initialMine` (null on public pages); once the client hydrates,
  // show the caller's real reaction — unless they've since tapped one here.
  const current = touched ? mine : loaded ? reactionBySink.get(sinkId) ?? null : mine;

  const react = (kind: string) =>
    requireAuth(async () => {
      // Optimistic: flip the highlight + adjust the counts immediately, then
      // reconcile from the server (revert on failure). Tapping your current
      // reaction toggles it off; tapping another switches to it.
      const prevMine = current;
      const prevCounts = counts;
      const nextMine = prevMine === kind ? null : kind;
      const nextCounts = { ...counts };
      if (prevMine) nextCounts[prevMine] = Math.max(0, (nextCounts[prevMine] ?? 0) - 1);
      if (nextMine) nextCounts[nextMine] = (nextCounts[nextMine] ?? 0) + 1;

      setTouched(true);
      setMine(nextMine);
      setCounts(nextCounts);

      try {
        const res = await apiFetch<{
          reactionCounts: Record<string, number>;
          myReaction: string | null;
        }>(`/api/v1/sinks/${sinkId}/reaction`, {
          method: 'POST',
          body: JSON.stringify({ kind }),
        });
        setCounts(res.reactionCounts);
        setMine(res.myReaction);
      } catch {
        // Revert the optimistic change; a failed tap leaves things as they were.
        setMine(prevMine);
        setCounts(prevCounts);
      }
    });

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {options.map((o) => {
        const count = counts[o.key] ?? 0;
        const active = current === o.key;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => react(o.key)}
            aria-pressed={active}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${
              active
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-line text-ink-2 hover:border-line-strong hover:text-ink'
            }`}
          >
            <span aria-hidden>{o.emoji}</span>
            <span>{o.label}</span>
            {count > 0 && <span className="tabular-nums text-ink-3">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
