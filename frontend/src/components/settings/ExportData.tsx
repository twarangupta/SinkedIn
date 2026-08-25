'use client';

/**
 * ExportData — the "Your data" section in Settings: download a full copy of
 * the private job tracker (applications, interview rounds, status history).
 *
 * A PII obligation once the tracker stores real application data + resumes
 * (India DPDP / GDPR right-to-access). CSV opens in Excel/Sheets for the common
 * "see my applications in a spreadsheet" case; JSON is the complete, structured
 * copy. Owner-scoped on the backend — a user only ever exports their own rows.
 */

import { useState } from 'react';
import { downloadTrackerExport } from '../../lib/exportData';
import { Button } from '../ui/Button';

export function ExportData() {
  const [busy, setBusy] = useState<'csv' | 'json' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (format: 'csv' | 'json') => {
    if (busy) return;
    setBusy(format);
    setError(null);
    try {
      await downloadTrackerExport(format);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed. Try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="space-y-3 rounded-xl border border-line bg-surface p-5">
      <div>
        <h2 className="text-sm font-medium text-ink">Your data</h2>
        <p className="mt-1 text-xs text-ink-3">
          Download everything in your private tracker: every application, its
          interview rounds, and its status history. CSV opens in a spreadsheet;
          JSON is the complete copy. Resume PDFs stay in your tracker, download
          each from its application.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          size="sm"
          variant="ghost"
          className="border border-line"
          onClick={() => run('csv')}
          disabled={!!busy}
        >
          {busy === 'csv' ? 'Preparing…' : 'Export as CSV'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="border border-line"
          onClick={() => run('json')}
          disabled={!!busy}
        >
          {busy === 'json' ? 'Preparing…' : 'Export as JSON'}
        </Button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </section>
  );
}
