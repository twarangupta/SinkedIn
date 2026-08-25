'use client';

/**
 * DeleteTrackerData — the "danger zone" in Settings: permanently erase the
 * user's entire private tracker (applications, interview rounds, status
 * history) AND the resume PDFs in private storage.
 *
 * A PII obligation (India DPDP / GDPR right-to-erasure): the user must be able
 * to make us forget their tracker data. Unlike the per-application delete (a
 * soft-delete), this is a true, irreversible purge, so it is two-step confirmed.
 *
 * The backend hard-deletes the DB rows and returns the affected resume keys; the
 * private bucket is client-side (RLS), so we delete those objects here. Only
 * when both halves succeed is nothing left behind.
 */

import { useState } from 'react';
import { apiFetch } from '../../lib/api';
import { deleteResume } from '../../lib/uploadResume';
import { Button } from '../ui/Button';

type PurgeResult = { deletedCount: number; resumeKeys: string[] };

export function DeleteTrackerData() {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const purge = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { deletedCount, resumeKeys } = await apiFetch<PurgeResult>(
        '/api/v1/applications',
        { method: 'DELETE' },
      );
      // Remove the resume PDFs from private storage (best-effort per file).
      await Promise.all(resumeKeys.map((k) => deleteResume(k).catch(() => {})));
      setDone(deletedCount);
      setConfirming(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3 rounded-xl border border-danger/40 bg-surface p-5">
      <div>
        <h2 className="text-sm font-medium text-ink">Delete tracker data</h2>
        <p className="mt-1 text-xs text-ink-3">
          Permanently erase every application, interview round, status history
          entry, and uploaded resume. This cannot be undone. Your posts, comments,
          and votes are not affected.
        </p>
      </div>

      {done !== null ? (
        <p className="text-xs text-ink-2">
          Deleted {done} {done === 1 ? 'application' : 'applications'} and all
          associated data.
        </p>
      ) : confirming ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-ink-2">
            Are you sure? This is permanent.
          </span>
          <Button size="sm" variant="danger" onClick={purge} disabled={busy}>
            {busy ? 'Deleting…' : 'Yes, delete everything'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="border border-line"
            onClick={() => setConfirming(false)}
            disabled={busy}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          className="border border-danger/50 text-danger hover:bg-danger/10"
          onClick={() => setConfirming(true)}
        >
          Delete all tracker data
        </Button>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}
    </section>
  );
}
