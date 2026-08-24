'use client';

/**
 * ApplicationForm — add or edit a tracked application (modal).
 *
 * Private: talks only to the auth-gated /api/v1/applications endpoints via
 * apiFetch (JWT attached). On success it hands the saved application back to the
 * parent, which updates the list in place (no full refetch).
 */

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { apiFetch } from '../../lib/api';
import { uploadResume, resumeSignedUrl, deleteResume } from '../../lib/uploadResume';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { DownloadIcon, EditIcon, TrashIcon } from '../ui/icons';
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

  // Resume: the currently-saved key (for download / replace-cleanup), a freshly
  // picked file (uploaded on save, so cancelling never orphans a PII file), and
  // a "remove on save" flag. `resumeError` surfaces PDF/size validation issues.
  const savedResumeKey = existing?.resumeFileKey ?? null;
  const savedResumeName = existing?.resumeFileName ?? null;
  const [pendingResume, setPendingResume] = useState<File | null>(null);
  const [removeResume, setRemoveResume] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Validate a picked PDF locally (mirrors the storage/backend limits) and stage
  // it for upload-on-save. Reset the input so the same file can be re-picked.
  const pickResume = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setResumeError(null);
    if (file.type !== 'application/pdf') {
      setResumeError('Resume must be a PDF file.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setResumeError('Resume is too big (max 3 MB).');
      return;
    }
    setPendingResume(file);
    setRemoveResume(false);
  };

  // Open the saved resume via a short-lived signed URL, with a friendly filename.
  const downloadResume = async () => {
    if (!savedResumeKey) return;
    setResumeError(null);
    try {
      // Prefer the original filename; fall back to a company-role name.
      const fallback =
        `${company.trim() || 'resume'}-${role.trim()}`
          .replace(/[^a-z0-9]+/gi, '-')
          .replace(/(^-|-$)/g, '') || 'resume';
      const name = savedResumeName ?? `${fallback}.pdf`;
      const url = await resumeSignedUrl(savedResumeKey, name);
      window.open(url, '_blank', 'noopener');
    } catch (err) {
      setResumeError(err instanceof Error ? err.message : 'Could not open the resume.');
    }
  };

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

      // Resolve the resume: upload a newly picked PDF now (only reached on save,
      // so a cancel never leaves an orphan), or clear it, or leave it untouched.
      if (pendingResume) {
        payload.resumeFileKey = await uploadResume(pendingResume);
        payload.resumeFileName = pendingResume.name;
      } else if (removeResume) {
        payload.resumeFileKey = null;
        payload.resumeFileName = null;
      }

      const path = existing
        ? `/api/v1/applications/${existing.id}`
        : '/api/v1/applications';
      const { application } = await apiFetch<{ application: Application }>(path, {
        method: existing ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });

      // The DB now points at the new key (or none), so the old object is safe to
      // delete. Best-effort: a failed cleanup only leaves a harmless orphan.
      if ((pendingResume || removeResume) && savedResumeKey) {
        deleteResume(savedResumeKey).catch(() => {});
      }

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

          {/* Resume used (optional). Uploaded to the private `resumes` bucket on
              save; only the object key is stored on the application. */}
          <div className="space-y-1">
            <div className="px-1 text-xs font-medium text-ink-3">Resume used (optional)</div>
            <input
              ref={resumeInputRef}
              type="file"
              accept="application/pdf"
              onChange={pickResume}
              className="hidden"
            />
            {pendingResume ? (
              // A new PDF is staged; it uploads when the form is saved.
              <div className="flex items-center gap-2 rounded-lg border border-line bg-elevated px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-ink">📄 {pendingResume.name}</span>
                <span className="shrink-0 text-xs text-ink-3">uploads on save</span>
                <button
                  type="button"
                  onClick={() => setPendingResume(null)}
                  className="shrink-0 text-xs text-ink-3 hover:text-danger"
                >
                  Clear
                </button>
              </div>
            ) : savedResumeKey && !removeResume ? (
              // An already-saved resume: view, replace, or mark for removal.
              <div className="flex items-center gap-2 rounded-lg border border-line bg-elevated px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-ink" title={savedResumeName ?? undefined}>
                  📄 {savedResumeName ?? 'Resume attached'}
                </span>
                <button
                  type="button"
                  onClick={downloadResume}
                  title="Download"
                  aria-label="Download resume"
                  className="shrink-0 rounded p-1 text-primary hover:bg-surface"
                >
                  <DownloadIcon />
                </button>
                <button
                  type="button"
                  onClick={() => resumeInputRef.current?.click()}
                  title="Replace"
                  aria-label="Replace resume"
                  className="shrink-0 rounded p-1 text-ink-3 hover:bg-surface hover:text-ink"
                >
                  <EditIcon />
                </button>
                <button
                  type="button"
                  onClick={() => setRemoveResume(true)}
                  title="Remove"
                  aria-label="Remove resume"
                  className="shrink-0 rounded p-1 text-ink-3 hover:bg-surface hover:text-danger"
                >
                  <TrashIcon />
                </button>
              </div>
            ) : savedResumeKey && removeResume ? (
              // Removal staged; nothing is deleted until the form is saved.
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-line px-3 py-2 text-sm text-ink-3">
                <span className="min-w-0 flex-1 truncate">Resume will be removed on save</span>
                <button type="button" onClick={() => setRemoveResume(false)} className="shrink-0 text-xs text-primary hover:underline">
                  Undo
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => resumeInputRef.current?.click()}
                className="w-full rounded-lg border border-dashed border-line px-3 py-2 text-left text-sm text-ink-3 hover:border-line-strong hover:text-ink"
              >
                Upload a PDF (max 3 MB)
              </button>
            )}
            {resumeError && <p className="px-1 text-xs text-danger">{resumeError}</p>}
          </div>

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
