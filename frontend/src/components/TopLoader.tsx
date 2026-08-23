'use client';

/**
 * TopLoader — a thin blue progress bar under the navbar that runs left to right
 * on route navigation (YouTube style). App Router has no router events, so we
 * START it on internal-link clicks and COMPLETE it when the pathname/query
 * actually changes. Self-contained: no dependency, no NProgress.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function TopLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const crawl = useRef<number | null>(null);
  const doneTimer = useRef<number | null>(null);
  const first = useRef(true);

  const clearTimers = useCallback(() => {
    if (crawl.current) window.clearInterval(crawl.current);
    if (doneTimer.current) window.clearTimeout(doneTimer.current);
    crawl.current = null;
    doneTimer.current = null;
  }, []);

  const start = useCallback(() => {
    clearTimers();
    setVisible(true);
    setWidth(8);
    // Crawl toward ~90% and wait there until navigation completes.
    crawl.current = window.setInterval(() => {
      setWidth((w) => (w < 90 ? w + Math.max(0.5, (90 - w) * 0.08) : w));
    }, 200);
  }, [clearTimers]);

  const done = useCallback(() => {
    clearTimers();
    setWidth(100);
    doneTimer.current = window.setTimeout(() => {
      setVisible(false);
      window.setTimeout(() => setWidth(0), 250); // reset once faded out
    }, 250);
  }, [clearTimers]);

  // Start on any left-click of an internal link.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      const anchor = (e.target as HTMLElement)?.closest?.('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      const target = anchor.getAttribute('target');
      if (
        !href ||
        target === '_blank' ||
        href.startsWith('#') ||
        href.startsWith('http') ||
        href.startsWith('mailto:') ||
        href === pathname
      )
        return;
      start();
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [pathname, start]);

  // Complete when the route finishes changing (skip the initial mount).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    done();
    return clearTimers;
  }, [pathname, searchParams, done, clearTimers]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 top-16 z-50 h-0.5 w-full"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 250ms ease' }}
    >
      <div
        style={{
          height: '100%',
          width: `${width}%`,
          background: '#3B82F6',
          boxShadow: '0 0 8px #3B82F6, 0 0 4px #3B82F6',
          transition: 'width 200ms ease',
        }}
      />
    </div>
  );
}
