/**
 * Tracker data export — download the signed-in user's entire private tracker as
 * a file. A PII obligation (India DPDP / GDPR "right to access"): once we store
 * real application history + resumes, the user must be able to get a copy.
 *
 * Separate from `apiFetch` because that helper always parses JSON; here we need
 * the raw response as a Blob and to trigger a browser download. The JWT is
 * attached the same way so the owner-scoped endpoint knows who is asking.
 */

import { supabase } from './supabase';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Fetch the export in the requested format and save it to the user's device. */
export async function downloadTrackerExport(format: 'csv' | 'json'): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('You need to be signed in to export your data.');

  const res = await fetch(
    `${API_BASE}/api/v1/applications/export?format=${format}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Export failed (${res.status})`);
  }

  // Save the blob via a temporary object URL. The suggested filename comes from
  // the response's Content-Disposition; we mirror it as a sensible fallback.
  const blob = await res.blob();
  const stamp = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sinkedin-tracker-${stamp}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
