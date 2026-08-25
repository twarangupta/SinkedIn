'use client';

/**
 * useRotating — cycle through a list on an interval, for the rotating composer
 * prompt and welcome line. Starts at a random index so different visits/pages
 * differ, and returns a `key` (the index) so the caller can re-trigger a fade
 * animation on each change.
 *
 * SSR-safe: the first render (server + hydration) always uses index 0 so the
 * markup matches; the random start and rotation kick in after mount.
 */

import { useEffect, useRef, useState } from 'react';

export function useRotating<T>(
  items: T[],
  intervalMs = 6000,
): { item: T; key: number } {
  const [index, setIndex] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (items.length <= 1) return;
    // Random first line after mount (avoids an SSR hydration mismatch).
    if (!started.current) {
      started.current = true;
      setIndex(Math.floor(Math.random() * items.length));
    }
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % items.length),
      intervalMs,
    );
    return () => window.clearInterval(id);
  }, [items.length, intervalMs]);

  return { item: items[index] ?? items[0], key: index };
}
