/**
 * Home — logged-in placeholder.
 *
 * Proves the full pipeline end to end: the Supabase session's JWT is attached
 * to API calls, the backend verifies it and returns the pseudonymous handle
 * (/users/me), and we render live categories from /categories. The real feed +
 * composer come with the posting-loop slices; this is the authenticated shell.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { apiFetch } from '../lib/api';
import { Button } from '../components/ui/Button';

interface Me {
  id: string;
  handle: string;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export function HomePage() {
  const { signOut } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ user: Me }>('/api/v1/users/me')
      .then((res) => setMe(res.user))
      .catch((err) => setError(err.message));
    apiFetch<{ categories: Category[] }>('/api/v1/categories')
      .then((res) => setCategories(res.categories))
      .catch(() => undefined);
  }, []);

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <span className="font-display text-xl font-bold">
            Sinked<span className="text-violet">.in</span>
          </span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-2">{me ? me.handle : '…'}</span>
            <Button variant="ghost" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="mb-2 font-display text-2xl font-medium">
          You&apos;re in{me ? `, ${me.handle}` : ''}.
        </h1>
        <p className="mb-8 text-ink-3">
          Auth works end to end. The feed comes next — here are the live
          categories straight from the API:
        </p>

        {error && <p className="mb-4 text-danger">{error}</p>}

        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <span
              key={category.id}
              className="rounded-full border px-3 py-1 text-sm"
              style={{
                color: category.color,
                borderColor: `${category.color}55`,
                backgroundColor: `${category.color}18`,
              }}
            >
              {category.name}
            </span>
          ))}
        </div>
      </main>
    </div>
  );
}
