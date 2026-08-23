'use client';

/**
 * FeedFilter — the funnel icon at the top-right of the feed tabs.
 *
 * Opens a small menu of categories; picking one navigates to `/?category=slug`
 * (preserving the current sort), and "All categories" clears the filter. Each
 * item is a real <Link>, so the server re-renders the feed for that filter and
 * the URL stays shareable. Closes on outside-click or Escape.
 */

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { Category } from '../types';

export function FeedFilter({
  categories,
  activeSlug,
  sort,
  basePath = '/',
}: {
  categories: Category[];
  activeSlug?: string;
  /** Preserved in the filter links (home feed only); omit on the profile. */
  sort?: 'latest' | 'top';
  /** Where the filter links point (default the home feed; the profile passes its URL). */
  basePath?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Close on click outside or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const active = activeSlug
    ? categories.find((c) => c.slug === activeSlug)
    : undefined;

  // Build a href for a given category slug (undefined = all), keeping the sort
  // and pointing at whichever feed this filter belongs to (home or a profile).
  const hrefFor = (slug?: string) => {
    const params = new URLSearchParams();
    // Trending (top) is the default, so only Latest is carried explicitly.
    if (sort === 'latest') params.set('sort', 'latest');
    if (slug) params.set('category', slug);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Filter by category"
        aria-expanded={open}
        title="Filter by category"
        className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium ${
          active ? 'text-primary' : 'text-ink-3 hover:text-ink'
        }`}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        {active ? active.name : 'Filter'}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-1 max-h-80 w-52 overflow-auto rounded-lg border border-line bg-surface py-1 shadow-lg">
          <Link
            href={hrefFor(undefined)}
            onClick={() => setOpen(false)}
            className={`block px-3 py-1.5 text-sm hover:bg-elevated ${
              active ? 'text-ink-2' : 'font-medium text-primary'
            }`}
          >
            All categories
          </Link>
          <div className="my-1 border-t border-line" />
          {categories.map((c) => (
            <Link
              key={c.id}
              href={hrefFor(c.slug)}
              onClick={() => setOpen(false)}
              className={`block px-3 py-1.5 text-sm hover:bg-elevated ${
                c.slug === activeSlug ? 'font-medium text-primary' : 'text-ink-2'
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
