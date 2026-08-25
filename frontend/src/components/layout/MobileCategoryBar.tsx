/**
 * MobileCategoryBar — a horizontally-scrolling row of category chips shown below
 * the composer on small/medium screens, since the right-rail "Trending
 * categories" list is desktop-only (xl+). Each chip links to the filtered feed,
 * exactly like the right-rail list and the filter menu. Hidden at xl, where the
 * right sidebar already shows the categories.
 */

import Link from 'next/link';
import type { Category } from '../../types';

export function MobileCategoryBar({
  categories,
  activeSlug,
}: {
  categories: Category[];
  activeSlug?: string;
}) {
  if (categories.length === 0) return null;

  return (
    // Bleed to the screen edges so the row can scroll fully on a phone.
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 xl:hidden">
      <div className="flex w-max gap-2">
        {categories.slice(0, 12).map((category) => {
          const active = category.slug === activeSlug;
          return (
            <Link
              key={category.id}
              href={`/?category=${category.slug}`}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition-colors ${
                active
                  ? 'border-primary bg-primary/15 text-ink'
                  : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink'
              }`}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              {category.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
