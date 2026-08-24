'use client';

/**
 * TrackerNav — the "Your Tracker" section in the left sidebar. Shows the
 * signed-in user's per-status counts at a glance; each row links to the tracker
 * filtered to that status (categorized view). Renders nothing when signed out.
 *
 * Owner-only data via the auth-gated /summary endpoint (JWT attached), so no
 * private numbers appear in server HTML.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth';
import { apiFetch } from '../../lib/api';
import type { ApplicationStatus } from '../../types';

const ROWS: { label: string; status: ApplicationStatus }[] = [
  { label: 'Saved Jobs', status: 'SAVED' },
  { label: 'Applications', status: 'APPLIED' },
  { label: 'Interviews', status: 'INTERVIEW' },
  { label: 'Offers', status: 'OFFER' },
  { label: 'Ghosted', status: 'GHOSTED' },
  { label: 'Rejections', status: 'REJECTED' },
];

type Summary = { counts: Record<ApplicationStatus, number>; total: number };

export function TrackerNav({ rowClassName = '' }: { rowClassName?: string }) {
  const { session } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    if (!session) {
      setSummary(null);
      return;
    }
    let cancelled = false;
    apiFetch<Summary>('/api/v1/applications/summary')
      .then((s) => !cancelled && setSummary(s))
      .catch(() => !cancelled && setSummary(null));
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (!session) return null;

  return (
    <div>
      <div className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-ink-3">
        Your Tracker
      </div>
      <div className="space-y-0.5">
        <Link href="/tracker/app" className={`flex items-center justify-between ${rowClassName}`}>
          <span>All applications</span>
          <span className="text-xs text-ink-3">{summary?.total ?? 0}</span>
        </Link>
        {ROWS.map(({ label, status }) => (
          <Link
            key={status}
            href={`/tracker/app?status=${status}`}
            className={`flex items-center justify-between ${rowClassName}`}
          >
            <span>{label}</span>
            <span className="text-xs text-ink-3">{summary?.counts[status] ?? 0}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
