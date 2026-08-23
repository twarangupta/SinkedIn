/**
 * Server-side data fetching (for React Server Components).
 *
 * These run on the Next.js server and fetch PUBLIC data from the Express API,
 * so the pages can be server-rendered (real HTML → SEO + share previews). No
 * auth token here — public reads only. `cache: 'no-store'` keeps the feed fresh
 * on every request (the content changes constantly).
 */

import type { Category, Comment, Sink, UserProfile } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json() as Promise<T>;
}

/** One page of the feed: the Sinks plus the cursor for the next page (or null). */
export interface FeedPage {
  sinks: Sink[];
  nextCursor: string | null;
}

/** First feed page, server-rendered. `sort` picks the tab; `category` filters. */
export async function getFeedServer(opts?: {
  sort?: 'latest' | 'top';
  category?: string;
}): Promise<FeedPage> {
  const params = new URLSearchParams();
  if (opts?.sort && opts.sort !== 'latest') params.set('sort', opts.sort);
  if (opts?.category) params.set('category', opts.category);
  const qs = params.toString();
  return getJson<FeedPage>(`/api/v1/sinks${qs ? `?${qs}` : ''}`);
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

export async function getCommentsServer(sinkId: string): Promise<Comment[]> {
  const { comments } = await getJson<{ comments: Comment[] }>(
    `/api/v1/sinks/${sinkId}/comments`,
  );
  return comments;
}

/** A public profile by handle (for /u/:handle). Null if the user doesn't exist. */
export async function getUserProfileServer(
  handle: string,
): Promise<UserProfile | null> {
  try {
    const { user } = await getJson<{ user: UserProfile }>(
      `/api/v1/users/${encodeURIComponent(handle)}`,
    );
    return user;
  } catch {
    return null;
  }
}

/**
 * A user's own Sinks (post history) as a paginated feed page, newest first —
 * reuses the feed's author filter, and supports the same category filter so the
 * profile can drop in the shared Feed + FeedFilter components.
 */
export async function getUserFeedServer(
  handle: string,
  opts?: { category?: string },
): Promise<FeedPage> {
  const params = new URLSearchParams({ author: handle });
  if (opts?.category) params.set('category', opts.category);
  return getJson<FeedPage>(`/api/v1/sinks?${params.toString()}`);
}
