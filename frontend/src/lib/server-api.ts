/**
 * Server-side data fetching (for React Server Components).
 *
 * These run on the Next.js server and fetch PUBLIC data from the Express API,
 * so the pages can be server-rendered (real HTML → SEO + share previews). No
 * auth token here — public reads only. `cache: 'no-store'` keeps the feed fresh
 * on every request (the content changes constantly).
 */

import type { Category, Sink } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json() as Promise<T>;
}

export async function getFeedServer(): Promise<Sink[]> {
  const { sinks } = await getJson<{ sinks: Sink[] }>('/api/v1/sinks');
  return sinks;
}

export async function getCategoriesServer(): Promise<Category[]> {
  const { categories } = await getJson<{ categories: Category[] }>(
    '/api/v1/categories',
  );
  return categories;
}

/** Returns null if the Sink doesn't exist (so the page can show 404). */
export async function getSinkServer(id: string): Promise<Sink | null> {
  try {
    const { sink } = await getJson<{ sink: Sink }>(`/api/v1/sinks/${id}`);
    return sink;
  } catch {
    return null;
  }
}
