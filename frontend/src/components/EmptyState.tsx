/**
 * EmptyState — a friendly, on-brand empty placeholder.
 *
 * Ships with a flat "boat hitting an iceberg" illustration drawn in the same
 * simple, token-coloured style as the avatars (no external image, theme-aware
 * via CSS variables). Used for the empty feed / no-results / nothing-saved
 * states. Pass your own `title`/`subtitle`; the art is shared.
 */

import type { ReactNode } from 'react';

/** The flat boat-and-iceberg scene. Inline SVG so it themes with the app. */
export function IcebergArt({ size = 180 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={(size * 140) / 200}
      viewBox="0 0 200 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Water */}
      <path
        d="M0 104 Q 50 96 100 104 T 200 104 V140 H0 Z"
        fill="var(--color-elevated)"
      />
      {/* Iceberg — the hidden mass below the surface */}
      <path
        d="M96 104 L120 104 L150 140 L72 140 Z"
        fill="var(--color-elevated)"
        opacity="0.7"
      />
      {/* Iceberg — the jagged peak above the surface */}
      <path d="M90 104 L118 58 L138 104 Z" fill="var(--color-ink-3)" />
      <path d="M118 58 L118 104 L138 104 Z" fill="var(--color-ink-2)" opacity="0.4" />
      {/* Boat, tilted as it strikes the ice */}
      <g transform="rotate(-13 70 98)">
        <path d="M38 98 L92 98 L84 113 L46 113 Z" fill="var(--color-buoy)" />
        <line
          x1="65"
          y1="98"
          x2="65"
          y2="62"
          stroke="var(--color-ink-2)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path d="M65 64 L65 96 L42 96 Z" fill="var(--color-ink-2)" />
      </g>
      {/* Impact sparks */}
      <g stroke="var(--color-danger)" strokeWidth="2.5" strokeLinecap="round">
        <line x1="94" y1="92" x2="103" y2="85" />
        <line x1="96" y1="99" x2="106" y2="98" />
        <line x1="92" y1="85" x2="98" y2="78" />
      </g>
    </svg>
  );
}

export function EmptyState({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Optional action (e.g. a button) rendered under the copy. */
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <IcebergArt />
      <div>
        <p className="font-display text-base font-medium text-ink">{title}</p>
        {subtitle && <p className="mx-auto mt-1 max-w-xs text-sm text-ink-3">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
