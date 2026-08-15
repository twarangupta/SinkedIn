/** Fetches the category list (public) once. Drives the composer + filters. */

import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import type { Category } from '../types';

export function useCategories(): Category[] {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    apiFetch<{ categories: Category[] }>('/api/v1/categories')
      .then((res) => setCategories(res.categories))
      .catch(() => undefined);
  }, []);

  return categories;
}
