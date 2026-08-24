'use client';

/**
 * ApplicationForm — add or edit a tracked application (modal).
 *
 * Private: talks only to the auth-gated /api/v1/applications endpoints via
 * apiFetch (JWT attached). On success it hands the saved application back to the
 * parent, which updates the list in place (no full refetch).
 */

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { CompanyLogo } from './CompanyLogo';
import { CompanySelect } from './CompanySelect';
import { RoundsEditor } from './RoundsEditor';
import { STATUS_ORDER, STATUS_LABEL } from './status';
import type { Application, ApplicationStatus, InterviewRound } from '../../types';

const fieldClass =
  'h-10 w-full rounded-lg border border-line bg-elevated px-3 text-sm text-ink outline-none focus:border-primary';

export function ApplicationForm({
  existing,
  onClose,
  onSaved,
  onRoundsChange,
}: {
  existing?: Application;
  onClose: () => void;
  onSaved: (app: Application) => void;
  /** Fires when interview rounds change (edit mode), so the card count updates. */
  onRoundsChange?: (rounds: InterviewRound[]) => void;
}) {
  const [company, setCompany] = useState(existing?.company ?? '');
  const [companyDomain, setCompanyDomain] = useState<string | null>(
    existing?.companyRef?.domain ?? null,
  );
  const [role, setRole] = useState(existing?.role ?? '');
  const [status, setStatus] = useState<ApplicationStatus>(existing?.status ?? 'SAVED');
  const [statusOther, setStatusOther] = useState(existing?.statusOther ?? '');
  const [jobUrl, setJobUrl] = useState(existing?.jobUrl ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = async () => {
    setError(null);
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        company: company.trim(),
        role: role.trim(),
        status,
        statusOther: status === 'OTHER' ? statusOther.trim() || null : null,
        jobUrl: jobUrl.trim() || null,
        notes: notes.trim() || null,
      };
      const path = existing
        ? `/api/v1/applications/${existing.id}`
        : '/api/v1/applications';
      const { application } = await apiFetch<{ application: Application }>(path, {
        method: existing ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });
      onSaved(application);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3 rounded-2xl border border-line bg-surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-medium">
              {existing ? 'Edit application' : 'Track a new application'}
            </h2>
            <button onClick={onClose} className="text-ink-3 hover:text-ink" aria-label="Close">
              ✕
            </button>
          </div>

          <div className="flex items-center gap-2">
            <CompanyLogo name={company || '?'} domain={companyDomain} size={28} />
            <CompanySelect
              value={company}
              onChange={(name, domain) => {
                setCompany(name);
                setCompanyDomain(domain);
              }}
            />
          </div>
          <Input placeholder="Role / title" value={role} onChange={(e) => setRole(e.target.value)} maxLength={200} />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
            className={fieldClass}
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          {status === 'OTHER' && (
            <Input
              placeholder="Describe the status"
              value={statusOther}
              onChange={(e) => setStatusOther(e.target.value)}
              maxLength={100}
            />
          )}

          <Input placeholder="Job URL (optional)" value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} maxLength={2048} />
          <textarea
            placeholder="Notes (optional): recruiter, referral, follow-up date…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-line bg-elevated px-3 py-2 text-sm text-ink outline-none focus:border-primary"
          />

          {/* Interview rounds are per-application, so they need a saved id first
              (edit mode). New applications add rounds after the first save. */}
          {existing ? (
            <RoundsEditor
              applicationId={existing.id}
              initialRounds={existing.rounds}
              onChange={(rounds) => onRoundsChange?.(rounds)}
            />
          ) : (
            <p className="text-xs text-ink-3">
              Save this application, then reopen it to add interview rounds.
            </p>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={busy || !company.trim() || !role.trim()}>
              {busy ? 'Saving…' : existing ? 'Save changes' : 'Add to tracker'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
