'use client';

/**
 * TrackerNav — the "Your Tracker" section in the left sidebar.
 *
 * Signed in: shows the user's per-status counts at a glance; each row deep-links
 * to the tracker filtered to that status. Owner-only data via the auth-gated
 * /summary endpoint (JWT attached), so no private numbers ever appear in server
 * HTML.
 *
 * Signed out: still renders the section (so the keyword-rich tracker links are
 * present in the server HTML for SEO) but without the private counts. Each row
 * keeps a crawlable href to the public /tracker landing (also the no-JS
 * fallback), but a real click opens the sign-in modal and, on success, sends the
 * user to the exact tracker view they clicked.
 */

import { useEffect, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth';
import { useAuthModal } from '../../lib/authModal';
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
  const { open } = useAuthModal();
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

  const signedIn = !!session;

  // The deep tracker view each row represents. Signed in, this is the row's
  // href (direct navigation). Signed out, it becomes the post-sign-in redirect
  // target while the visible href stays the crawlable public landing.
  const appHref = (status?: ApplicationStatus) =>
    status ? `/tracker/app?status=${status}` : '/tracker/app';

  // Signed-out click: don't navigate to the noindex private app; open the
  // sign-in modal and remember where to land once the user is in.
  const onGuardedClick = (target: string) => (e: MouseEvent) => {
    if (signedIn) return; // let the Link navigate normally
    e.preventDefault();
    open(target);
  };

  const renderRow = (label: string, count: number, status?: ApplicationStatus) => {
    const target = appHref(status);
    return (
      <Link
        key={label}
        href={signedIn ? target : '/tracker'}
        onClick={onGuardedClick(target)}
        className={`flex items-center justify-between ${rowClassName}`}
      >
        <span>{label}</span>
        {signedIn && <span className="text-xs text-ink-3">{count}</span>}
      </Link>
    );
  };

  return (
    <div>
      <div className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-ink-3">
        Your Tracker
      </div>
      <div className="space-y-0.5">
        {renderRow('All applications', summary?.total ?? 0)}
        {ROWS.map(({ label, status }) =>
          renderRow(label, summary?.counts[status] ?? 0, status),
        )}
      </div>
    </div>
  );
}
