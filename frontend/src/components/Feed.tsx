'use client';

/**
 * Feed — the infinite-scroll list of Sinks.
 *
 * The first page is server-rendered (real HTML for SEO) and handed in as
 * `initialSinks` + `initialNextCursor`. This client component then appends the
 * next pages as the user scrolls: an IntersectionObserver watches a sentinel
 * near the bottom and, when it comes into view, fetches the next page via the
 * cursor. Client fetches go through apiFetch (with the Supabase JWT), so newly
 * loaded pages already carry the caller's own vote state.
 *
 * If the user posts a Sink, the page's server component re-renders (router
 * .refresh) with fresh props — the effect below resets the list to that fresh
 * first page so the new Sink appears at the top.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/api';
import { SinkCard } from './SinkCard';
import type { FeedPage } from '../lib/server-api';
import type { Sink } from '../types';

export function Feed({
  initialSinks,
  initialNextCursor,
}: {
  initialSinks: Sink[];
  initialNextCursor: string | null;
}) {
  const [sinks, setSinks] = useState(initialSinks);
  const [cursor, setCursor] = useState(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset to the fresh server-rendered first page whenever it changes
  // (e.g. after posting a Sink triggers router.refresh()).
  useEffect(() => {
    setSinks(initialSinks);
    setCursor(initialNextCursor);
  }, [initialSinks, initialNextCursor]);

  const loadMore = useCallback(async () => {
    if (loading || !cursor) return;
    setLoading(true);
    try {
      const page = await apiFetch<FeedPage>(
        `/api/v1/sinks?cursor=${encodeURIComponent(cursor)}`,
      );
      // De-dupe defensively in case a Sink was posted mid-scroll.
      setSinks((prev) => {
        const seen = new Set(prev.map((s) => s.id));
        return [...prev, ...page.sinks.filter((s) => !seen.has(s.id))];
      });
      setCursor(page.nextCursor);
    } catch {
      // Leave the cursor in place; scrolling again retries.
    } finally {
      setLoading(false);
    }
  }, [cursor, loading]);

  // Observe the sentinel; load the next page a little before it's fully visible.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '300px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  if (sinks.length === 0) {
    return (
      <p className="py-8 text-center text-ink-3">
        Nothing&apos;s sunk yet. Be the first to overshare.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {sinks.map((sink) => (
        <SinkCard key={sink.id} sink={sink} />
      ))}
      {/* Sentinel + status; only present while there may be more to load. */}
      {cursor && <div ref={sentinelRef} aria-hidden className="h-px" />}
      {loading && (
        <p className="py-4 text-center text-sm text-ink-3">Loading more…</p>
      )}
      {!cursor && (
        <p className="py-4 text-center text-sm text-ink-3">
          You&apos;ve reached the bottom.
        </p>
      )}
    </div>
  );
}
