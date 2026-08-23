/** Small shared display formatters. */

/**
 * Two-letter avatar initials from a pseudonymous handle (letters only).
 * Falls back to "::" when a handle has no letters.
 */
export function initials(handle: string): string {
  return handle.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || '::';
}

/**
 * A stable avatar tint (Tailwind classes) derived from a handle, so each
 * pseudonymous user gets a consistent, distinguishable colour instead of flat
 * grey. Full literal class strings so Tailwind's JIT keeps them.
 */
const AVATAR_TINTS = [
  'bg-indigo-500/20 text-indigo-200',
  'bg-emerald-500/20 text-emerald-200',
  'bg-amber-500/20 text-amber-200',
  'bg-rose-500/20 text-rose-200',
  'bg-sky-500/20 text-sky-200',
  'bg-violet-500/20 text-violet-200',
  'bg-teal-500/20 text-teal-200',
  'bg-orange-500/20 text-orange-200',
];

export function avatarColor(handle: string): string {
  let hash = 0;
  for (let i = 0; i < handle.length; i++) {
    hash = (hash * 31 + handle.charCodeAt(i)) >>> 0;
  }
  return AVATAR_TINTS[hash % AVATAR_TINTS.length];
}

/** Compact absolute date, e.g. "23 Aug". Empty string when there's no date. */
export function shortDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/** Compact relative time, e.g. "just now", "5m ago", "3h ago", "2d ago". */
export function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
