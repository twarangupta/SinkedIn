'use client';

/**
 * Category guide modal — the "i" hint next to the composer's category picker.
 * Explains what each category is for. Content is data-driven (category.description
 * from the API), so adding a category adds its hint automatically.
 */

import { useEffect } from 'react';
import type { Category } from '../types';

export function CategoryInfoModal({
  categories,
  onClose,
}: {
  categories: Category[];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-2xl border border-line bg-surface p-6">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-display text-lg font-medium">What goes where</h2>
            <button
              onClick={onClose}
              className="text-ink-3 hover:text-ink"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <p className="mb-4 text-sm text-ink-3">
            Pick the category that fits your Sink. Here is what each one is for.
          </p>
          <ul className="space-y-3">
            {categories.map((category) => (
              <li key={category.id} className="flex gap-3">
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <div>
                  <div
                    className="text-sm font-medium"
                    style={{ color: category.color }}
                  >
                    {category.name}
                  </div>
                  {category.description && (
                    <div className="text-sm text-ink-2">{category.description}</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
