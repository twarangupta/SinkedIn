/**
 * Colored category label. Color comes from the Category record. When a `slug`
 * is provided it becomes a link to that category's filtered feed.
 */

import Link from 'next/link';

export function CategoryPill({
  name,
  color,
  slug,
}: {
  name: string;
  color: string;
  /** When set, the pill links to `/?category=<slug>` (the filtered feed). */
  slug?: string;
}) {
  const pill = (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        color,
        backgroundColor: `${color}22`,
        border: `1px solid ${color}44`,
      }}
    >
      {name}
    </span>
  );

  if (!slug) return pill;
  return (
    <Link
      href={`/?category=${slug}`}
      className="inline-block transition-opacity hover:opacity-80"
      aria-label={`See ${name} Sinks`}
    >
      {pill}
    </Link>
  );
}
