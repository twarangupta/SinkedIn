/**
 * Right rail — trending categories (live) + the pseudonymity note. Top
 * contributors / Auras come later (gamification is a later phase).
 */

import type { Category } from '../../types';

export function RightSidebar({ categories }: { categories: Category[] }) {
  return (
    <aside className="hidden w-72 shrink-0 space-y-4 xl:block">
      <div className="sticky top-20 space-y-4">
        <div className="rounded-xl border border-line bg-surface p-4">
          <h3 className="mb-3 font-medium">Trending categories</h3>
          <ul className="space-y-2.5">
            {categories.slice(0, 7).map((category) => (
              <li key={category.id} className="flex items-center gap-2 text-sm">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-ink-2">{category.name}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="px-2 text-xs leading-relaxed text-ink-3">
          Pseudonymity is permanent. Your handle is anonymous. No real names, no
          company emails.
        </p>
      </div>
    </aside>
  );
}
