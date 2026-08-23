'use client';

/**
 * ShareButton — copy or share a Sink's permalink.
 *
 * On devices with the Web Share API (mostly mobile) it opens the native share
 * sheet; everywhere else it copies the absolute `/s/:id` URL to the clipboard
 * and flashes a "Copied" confirmation. No backend, no schema, no auth: a Sink
 * permalink is public, so anyone can share it. Distinct from the branded card
 * export (a later, heavier feature) — this is just the link.
 */

import { useState } from 'react';

export function ShareButton({
  sinkId,
  title,
  size = 'md',
}: {
  sinkId: string;
  /** Used as the share-sheet title on platforms that support it. */
  title?: string;
  size?: 'sm' | 'md';
}) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    // window is only available at click time (client), so build the URL here.
    const url = `${window.location.origin}/s/${sinkId}`;

    // Prefer the native share sheet where available (mobile).
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: title ?? 'SinkedIn', url });
        return;
      } catch {
        // User dismissed the sheet, or it failed — fall through to copy.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked (rare) — nothing else to do; stay silent.
    }
  };

  const textCls = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <button
      type="button"
      onClick={share}
      aria-label="Share this Sink"
      className={`inline-flex items-center gap-1.5 text-ink-3 hover:text-ink ${textCls}`}
    >
      <svg
        width={size === 'sm' ? 14 : 16}
        height={size === 'sm' ? 14 : 16}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {/* A simple up-right share arrow (matches the cleaner mockup). */}
        <line x1="7" y1="17" x2="17" y2="7" />
        <polyline points="8 7 17 7 17 16" />
      </svg>
      {copied ? 'Copied' : 'Share'}
    </button>
  );
}
