'use client';

/**
 * TopLoader — a thin blue progress bar under the navbar that runs left to right
 * on EVERY route change (YouTube style). App Router exposes no router events, so
 * we START the bar on any client navigation and COMPLETE it when the
 * pathname/query actually change.
 *
 * We catch all three ways a route changes:
 *  - internal-link clicks (an <a> to an in-app path),
 *  - programmatic navigation (router.push, which calls history.pushState under
 *    the hood — we patch that to notice),
 *  - back/forward (the popstate event).
 * Plus a brief flash on the first mount, so a fresh page visit shows the bar too.
 *
 * A safety timeout completes the bar if a start is ever not followed by a route
 * change (e.g. a download click, or a same-URL navigation), so it can never hang.
 * Self-contained: no dependency, no NProgress.
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
  const safety = useRef<number | null>(null);
  const first = useRef(true);

  const clearTimers = useCallback(() => {
    if (crawl.current) window.clearInterval(crawl.current);
    if (doneTimer.current) window.clearTimeout(doneTimer.current);
    if (safety.current) window.clearTimeout(safety.current);
    crawl.current = null;
    doneTimer.current = null;
    safety.current = null;
  }, []);

  const done = useCallback(() => {
    clearTimers();
    setWidth(100);
    doneTimer.current = window.setTimeout(() => {
      setVisible(false);
      window.setTimeout(() => setWidth(0), 250); // reset once faded out
    }, 250);
  }, [clearTimers]);

  const start = useCallback(() => {
    clearTimers();
    setVisible(true);
    setWidth(8);
    // Crawl toward ~90% and wait there until navigation completes.
    crawl.current = window.setInterval(() => {
      setWidth((w) => (w < 90 ? w + Math.max(0.5, (90 - w) * 0.08) : w));
    }, 200);
    // Never hang: if no route change lands within 10s, finish anyway.
    safety.current = window.setTimeout(done, 10_000);
  }, [clearTimers, done]);

  // Start on any left-click of an internal link (but not downloads / new tabs).
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
        anchor.hasAttribute('download') || // file download, not a navigation
        href.startsWith('#') ||
        href.startsWith('http') ||
        href.startsWith('blob:') || // programmatic download anchors
        href.startsWith('data:') ||
        href.startsWith('mailto:') ||
        href === pathname
      )
        return;
      start();
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [pathname, start]);

  // Catch programmatic navigation (router.push → history.pushState) and
  // back/forward (popstate), which never fire a link click. We deliberately do
  // NOT patch replaceState: Next calls it internally on its own, which would
  // flash the bar spuriously.
  useEffect(() => {
    const origPush = window.history.pushState;
    window.history.pushState = function (this: History, ...args) {
      start();
      return origPush.apply(this, args as Parameters<typeof origPush>);
    };
    window.addEventListener('popstate', start);
    return () => {
      window.history.pushState = origPush;
      window.removeEventListener('popstate', start);
    };
  }, [start]);

  // Complete when the route finishes changing. On the very first mount there is
  // no navigation to complete, so instead give a brief flash for the fresh page
  // visit, then finish.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      start();
      const t = window.setTimeout(done, 600); // visible sweep on fresh visit
      return () => window.clearTimeout(t);
    }
    done();
    return clearTimers;
  }, [pathname, searchParams, start, done, clearTimers]);

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
