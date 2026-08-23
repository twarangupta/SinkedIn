'use client';

/**
 * ReportButton — a quiet "Report" action for a Sink or Comment. Signed-out users
 * get the sign-in modal; otherwise it files the report and confirms. Hiding the
 * content is a manual moderator step for now (Phase 1); this just flags it.
 */

import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useAuthModal } from '../lib/authModal';
import { apiFetch } from '../lib/api';

export function ReportButton({
  targetType,
  targetId,
}: {
  targetType: 'SINK' | 'COMMENT';
  targetId: string;
}) {
  const { session } = useAuth();
  const { open } = useAuthModal();
  const [state, setState] = useState<'idle' | 'confirm' | 'busy' | 'done'>(
    'idle',
  );

  if (state === 'done') {
    return <span className="text-xs text-ink-3">Reported. Thanks.</span>;
  }

  const report = async () => {
    setState('busy');
    try {
      await apiFetch('/api/v1/reports', {
        method: 'POST',
        body: JSON.stringify({ targetType, targetId }),
      });
      setState('done');
    } catch {
      setState('idle');
    }
  };

  // Two-step so a stray tap doesn't file a report.
  if (state === 'confirm') {
    return (
      <span className="flex items-center gap-2 text-xs text-ink-3">
        Report this?
        <button onClick={report} className="font-medium text-danger hover:underline">
          Yes
        </button>
        <button onClick={() => setState('idle')} className="hover:text-ink">
          No
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => (session ? setState('confirm') : open())}
      disabled={state === 'busy'}
      aria-label="Report"
      title="Report"
      className="text-ink-3 transition-colors hover:text-danger"
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    </button>
  );
}
