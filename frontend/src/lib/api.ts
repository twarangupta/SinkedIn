/**
 * API client — a thin fetch wrapper around the backend.
 *
 * Attaches the current Supabase JWT as a Bearer token so protected endpoints
 * (like /users/me) know who's calling. Throws on non-2xx with the backend's
 * error message. All data-fetching hooks go through this.
 */

import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  // Grab the current access token (if signed in) to authenticate the request.
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(body.error ?? `Request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}
