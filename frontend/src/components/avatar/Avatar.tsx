/**
 * Avatar — renders a user's ocean-creature avatar in a dark circular badge.
 *
 * Data-driven: given an `avatarId` it looks up the flat SVG art in the catalog
 * (avatarArt.tsx) and draws it inside the badge, clipped to the circle so the
 * creature can reach the edge. If the id is missing/unknown (e.g. an avatar we
 * haven't drawn yet, or legacy data), it falls back to the two-letter initials
 * so the UI never breaks.
 *
 * The badge + art share one 0..100 SVG coordinate space, scaled to `size` px.
 */

import { useId } from 'react';
import { initials } from '../../lib/format';
import { AVATAR_ART } from './avatarArt';

export function Avatar({
  avatarId,
  handle,
  size = 36,
  className = '',
}: {
  avatarId?: string | null;
  handle: string;
  size?: number;
  className?: string;
}) {
  const clipId = useId();
  const art = avatarId ? AVATAR_ART[avatarId] : undefined;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`shrink-0 ${className}`}
      role="img"
      aria-label={`${handle} avatar`}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r="50" fill="var(--color-elevated)" />
      {art ? (
        <g clipPath={`url(#${clipId})`}>{art}</g>
      ) : (
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="38"
          fontWeight="500"
          fill="var(--color-ink-3)"
          fontFamily="system-ui, sans-serif"
        >
          {initials(handle)}
        </text>
      )}
    </svg>
  );
}
