/**
 * PageHeader — a consistent page title + "Back to feed" link, reused across
 * secondary pages (Settings, Profile, and future ones). Renders a fragment (no
 * wrapper) so it slots into the parent's `space-y-*` rhythm exactly like the
 * loose elements it replaces. Server-safe (no client hooks).
 */

import Link from 'next/link';

export function PageHeader({ title }: { title: string }) {
  return (
    <>
      <h1 className="text-xl font-semibold text-ink">{title}</h1>
      <Link href="/" className="text-sm text-ink-3 hover:text-ink">
        ← Back to feed
      </Link>
    </>
  );
}
