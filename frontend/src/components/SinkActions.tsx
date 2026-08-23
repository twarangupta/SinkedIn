'use client';

/**
 * SinkActions — the vertical "⋮" options menu at a Sink card's top-right.
 *
 * Shown on EVERY post (owner and non-owner, signed-in or out):
 *   - Owner: Edit (opens SinkEditor) + Delete (themed confirm dialog → soft-delete).
 *   - Everyone else: Report (two-step; signed-out opens the sign-in modal).
 * Kept out of SinkCard's server component so the card stays server-renderable.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMe } from '../lib/me';
import { useAuth } from '../lib/auth';
import { useAuthModal } from '../lib/authModal';
import { apiFetch } from '../lib/api';
import { SinkEditor } from './SinkEditor';
import { Button } from './ui/Button';
import type { Sink } from '../types';

export function SinkActions({ sink }: { sink: Sink }) {
  const { me } = useMe();
  const { session } = useAuth();
  const { open: openAuth } = useAuthModal();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false); // delete dialog
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportStage, setReportStage] = useState<'idle' | 'confirm' | 'done'>('idle');
  const [reportBusy, setReportBusy] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const isOwner = !!me && me.id === sink.user.id;

  const closeMenu = () => {
    setOpen(false);
    setReportStage('idle');
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) closeMenu();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Escape closes the delete dialog (unless a delete is mid-flight).
  useEffect(() => {
    if (!confirming) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deleting) setConfirming(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirming, deleting]);

  const del = async () => {
    setDeleting(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/sinks/${sink.id}`, { method: 'DELETE' });
      setConfirming(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setDeleting(false);
    }
  };

  const report = async () => {
    setReportBusy(true);
    try {
      await apiFetch('/api/v1/reports', {
        method: 'POST',
        body: JSON.stringify({ targetType: 'SINK', targetId: sink.id }),
      });
      setReportStage('done');
    } catch {
      setReportStage('idle');
    } finally {
      setReportBusy(false);
    }
  };

  const itemCls =
    'block w-full px-3 py-1.5 text-left text-sm text-ink-2 hover:bg-elevated';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setReportStage('idle');
        }}
        aria-label="Post options"
        aria-expanded={open}
        className="flex h-7 w-7 items-center justify-center rounded-full text-ink-3 hover:bg-elevated hover:text-ink"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-line bg-surface py-1 shadow-lg"
        >
          {isOwner ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditing(true);
                  setOpen(false);
                }}
                className={itemCls}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setConfirming(true);
                  setOpen(false);
                }}
                className="block w-full px-3 py-1.5 text-left text-sm text-danger hover:bg-elevated"
              >
                Delete
              </button>
            </>
          ) : reportStage === 'done' ? (
            <span className="block px-3 py-1.5 text-sm text-ink-3">
              Reported. Thanks.
            </span>
          ) : reportStage === 'confirm' ? (
            <button
              type="button"
              onClick={report}
              disabled={reportBusy}
              className="block w-full px-3 py-1.5 text-left text-sm font-medium text-danger hover:bg-elevated"
            >
              {reportBusy ? 'Reporting…' : 'Confirm report'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!session) {
                  openAuth();
                  setOpen(false);
                } else {
                  setReportStage('confirm');
                }
              }}
              className="block w-full px-3 py-1.5 text-left text-sm text-danger hover:bg-elevated"
            >
              Report
            </button>
          )}
        </div>
      )}

      {editing && <SinkEditor sink={sink} onClose={() => setEditing(false)} />}

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => !deleting && setConfirming(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 font-display text-lg font-medium">
              Drown this Sink for good?
            </h2>
            <p className="mb-5 text-sm text-ink-3">
              It slips beneath the waves and won&apos;t resurface. Comments and
              votes go down with it. This can&apos;t be undone.
            </p>
            {error && <p className="mb-3 text-sm text-danger">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirming(false)}
                disabled={deleting}
              >
                Keep it
              </Button>
              <Button size="sm" variant="danger" onClick={del} disabled={deleting}>
                {deleting ? 'Drowning…' : 'Drown it'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
