'use client';

/**
 * MyVotes — the signed-in user's own vote highlights, for client hydration.
 *
 * WHY: public pages (feed, profile, single Sink) are server-rendered WITHOUT
 * auth (for SEO), so `myVote`/`myPollVote` always arrive null — the user's own
 * votes don't show highlighted on load. Once signed in on the client, we fetch
 * their votes ONCE from GET /users/me/votes and expose lookup maps by Sink id.
 * VoteControl / PollBlock read their entry to restore the highlight. Scores and
 * poll counts are global and already correct from SSR, so this only affects the
 * caller's own highlight — never the numbers.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './auth';
import { apiFetch } from './api';

type Vote = 'BUOY' | 'ANCHOR';

interface MyVotesValue {
  /** sinkId → the caller's Buoy/Anchor on that Sink. */
  voteBySink: Map<string, Vote>;
  /** commentId → the caller's Buoy/Anchor on that Comment. */
  voteByComment: Map<string, Vote>;
  /** sinkId → the poll option id the caller chose. */
  pollVoteBySink: Map<string, string>;
  /** Ids of the Sinks the caller has bookmarked. */
  bookmarkedSinks: Set<string>;
  /** sinkId → the reaction kind the caller tapped on that Sink. */
  reactionBySink: Map<string, string>;
  /** True once the fetch has completed, so consumers only hydrate real data. */
  loaded: boolean;
}

const EMPTY: MyVotesValue = {
  voteBySink: new Map(),
  voteByComment: new Map(),
  pollVoteBySink: new Map(),
  bookmarkedSinks: new Set(),
  reactionBySink: new Map(),
  loaded: false,
};

const MyVotesContext = createContext<MyVotesValue>(EMPTY);

export function MyVotesProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [state, setState] = useState<MyVotesValue>(EMPTY);

  useEffect(() => {
    // Signed out: nothing to hydrate.
    if (!session) {
      setState(EMPTY);
      return;
    }
    let cancelled = false;
    apiFetch<{
      votes: { sinkId: string; value: Vote }[];
      pollVotes: { sinkId: string; pollOptionId: string }[];
      commentVotes: { commentId: string; value: Vote }[];
      bookmarks?: string[];
      reactions?: { sinkId: string; kind: string }[];
    }>('/api/v1/users/me/votes')
      .then((res) => {
        if (cancelled) return;
        setState({
          voteBySink: new Map(res.votes.map((v) => [v.sinkId, v.value])),
          voteByComment: new Map(
            res.commentVotes.map((v) => [v.commentId, v.value]),
          ),
          pollVoteBySink: new Map(
            res.pollVotes.map((pv) => [pv.sinkId, pv.pollOptionId]),
          ),
          bookmarkedSinks: new Set(res.bookmarks ?? []),
          reactionBySink: new Map(
            (res.reactions ?? []).map((r) => [r.sinkId, r.kind]),
          ),
          loaded: true,
        });
      })
      .catch(() => {
        // A failed hydration just means highlights stay as SSR left them.
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  return (
    <MyVotesContext.Provider value={state}>{children}</MyVotesContext.Provider>
  );
}

export function useMyVotes(): MyVotesValue {
  return useContext(MyVotesContext);
}
