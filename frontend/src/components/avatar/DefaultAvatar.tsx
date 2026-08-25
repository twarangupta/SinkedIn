/**
 * DefaultAvatar — the generic grey "person" placeholder (Instagram-style) shown
 * where there is no user yet: e.g. the composer while signed out. Signed-in
 * users get their ocean-creature <Avatar> instead.
 *
 * Presentational, theme-aware (uses design tokens), sizeable. The silhouette is
 * clipped to the circle so the shoulders never spill past the edge.
 */

import { useId } from 'react';

export function DefaultAvatar({
  size = 36,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  const clipId = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`shrink-0 ${className}`}
      role="img"
      aria-label="Guest avatar"
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>
      {/* Grey badge */}
      <circle cx="50" cy="50" r="50" fill="var(--color-elevated)" />
      {/* Person silhouette (head + shoulders), clipped to the circle */}
      <g clipPath={`url(#${clipId})`} fill="var(--color-ink-3)">
        <circle cx="50" cy="40" r="16" />
        <ellipse cx="50" cy="88" rx="26" ry="20" />
      </g>
    </svg>
  );
}
