'use client';

/**
 * TrackerApp — the PRIVATE job tracker (list view). Renders only for the
 * signed-in owner; signed-out visitors get a sign-in prompt (the public hero
 * above sells the feature). All data is fetched client-side with the JWT via
 * apiFetch, so private application data never lands in server-rendered HTML and
 * is never indexed.
 *
 * Slice 1 = list + filter + add/edit/delete + inline status change. The kanban
 * board (Slice 2) is a pure UI addition over this same API.
 */

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { useAuthModal } from '../../lib/authModal';
import { apiFetch } from '../../lib/api';
import { deleteResume } from '../../lib/uploadResume';
import { shortDate } from '../../lib/format';
import { Button } from '../ui/Button';
import { ApplicationForm } from './ApplicationForm';
import { CompanyLogo } from './CompanyLogo';
import { TrackerBoard } from './TrackerBoard';
import { TrackerInsights } from './TrackerInsights';
import { STATUS_ORDER, STATUS_LABEL, STATUS_PILL } from './status';
import type { Application, ApplicationStatus } from '../../types';

export function TrackerApp() {
  const { session, loading: authLoading } = useAuth();
  const { open: openAuth } = useAuthModal();
  const searchParams = useSearchParams();
  const paramStatus = searchParams.get('status');
  const initialFilter: ApplicationStatus | 'ALL' =
    paramStatus && (STATUS_ORDER as string[]).includes(paramStatus)
      ? (paramStatus as ApplicationStatus)
      : 'ALL';
  const [apps, setApps] = useState<Application[] | null>(null);
  const [filter, setFilter] = useState<ApplicationStatus | 'ALL'>(initialFilter);
  const [view, setView] = useState<'list' | 'board' | 'insights'>('list');

  // Follow the ?status= param (sidebar "Your Tracker" links) when it changes.
  useEffect(() => {
    setFilter(initialFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramStatus]);
  const [form, setForm] = useState<null | 'new' | Application>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { applications } = await apiFetch<{ applications: Application[] }>(
        '/api/v1/applications',
      );
      setApps(applications);
    } catch {
      setApps([]);
    }
  }, []);

  useEffect(() => {
    if (session) load();
    else setApps(null);
  }, [session, load]);

  // Upsert a saved application (from the form) into local state.
  const upsert = (app: Application) =>
    setApps((prev) => {
      const list = prev ?? [];
      const i = list.findIndex((a) => a.id === app.id);
      if (i === -1) return [app, ...list];
      const next = [...list];
      next[i] = app;
      return next;
    });

  const quickStatus = async (app: Application, next: ApplicationStatus) => {
    if (next === app.status) return;
    // OTHER needs a free-text label, so route it through the edit form.
    if (next === 'OTHER') {
      setForm(app);
      return;
    }
    try {
      const { application } = await apiFetch<{ application: Application }>(
        `/api/v1/applications/${app.id}`,
        { method: 'PATCH', body: JSON.stringify({ status: next }) },
      );
      upsert(application);
    } catch {
      /* leave as-is; the select will snap back on next render */
    }
  };

  const remove = async (id: string) => {
    // Grab the resume key before we drop the row from state, so we can also
    // hard-remove the PDF from private storage (deleting the application must
    // not leave the user's resume PII orphaned in the bucket).
    const resumeFileKey = apps?.find((a) => a.id === id)?.resumeFileKey ?? null;
    try {
      await apiFetch(`/api/v1/applications/${id}`, { method: 'DELETE' });
      if (resumeFileKey) deleteResume(resumeFileKey).catch(() => {});
      setApps((prev) => (prev ? prev.filter((a) => a.id !== id) : prev));
      setConfirmId(null);
    } catch {
      setConfirmId(null);
    }
  };

  // --- Signed out: private tool, prompt sign-in (hero above did the selling).
  if (!session) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-8 text-center">
        <p className="mb-1 font-display text-lg font-medium">Your tracker is private</p>
        <p className="mx-auto mb-4 max-w-sm text-sm text-ink-3">
          Only you can ever see what you track. Sign in to start managing your
          applications.
        </p>
        <Button onClick={() => openAuth()} disabled={authLoading}>
          Sign in to start tracking
        </Button>
      </div>
    );
  }

  const filtered = (apps ?? []).filter((a) => filter === 'ALL' || a.status === filter);
  const countFor = (s: ApplicationStatus) => (apps ?? []).filter((a) => a.status === s).length;

  return (
    <div className={view === 'board' ? '' : 'mx-auto max-w-3xl'}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-medium">
          Your applications{apps ? ` (${apps.length})` : ''}
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-line p-0.5 text-xs">
            <button
              onClick={() => setView('list')}
              className={view === 'list' ? 'rounded-md bg-elevated px-2 py-1 text-ink' : 'px-2 py-1 text-ink-3 hover:text-ink'}
            >
              List
            </button>
            <button
              onClick={() => setView('board')}
              className={view === 'board' ? 'rounded-md bg-elevated px-2 py-1 text-ink' : 'px-2 py-1 text-ink-3 hover:text-ink'}
            >
              Board
            </button>
            <button
              onClick={() => setView('insights')}
              className={view === 'insights' ? 'rounded-md bg-elevated px-2 py-1 text-ink' : 'px-2 py-1 text-ink-3 hover:text-ink'}
            >
              Insights
            </button>
          </div>
          <Button size="sm" onClick={() => setForm('new')}>
            + Add application
          </Button>
        </div>
      </div>

      {view === 'insights' ? (
        <TrackerInsights />
      ) : view === 'board' ? (
        apps === null ? (
          <p className="py-8 text-center text-sm text-ink-3">Loading your tracker…</p>
        ) : apps.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface p-8 text-center">
            <p className="mb-1 font-medium">Nothing tracked yet</p>
            <p className="mb-4 text-sm text-ink-3">
              Add the first job you are chasing and watch the pipeline fill up.
            </p>
            <Button size="sm" onClick={() => setForm('new')}>+ Add application</Button>
          </div>
        ) : (
          <TrackerBoard
            applications={apps}
            onChangeStatus={quickStatus}
            onEdit={(a) => setForm(a)}
            onDelete={remove}
          />
        )
      ) : (
        <>
      {/* Status filter chips */}
      <div className="mb-4 flex flex-wrap gap-1.5 text-sm">
        <button
          onClick={() => setFilter('ALL')}
          className={`rounded-full px-3 py-1 ${filter === 'ALL' ? 'bg-primary text-white' : 'bg-elevated text-ink-2 hover:text-ink'}`}
        >
          All
        </button>
        {STATUS_ORDER.filter((s) => countFor(s) > 0).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 ${filter === s ? 'bg-primary text-white' : 'bg-elevated text-ink-2 hover:text-ink'}`}
          >
            {STATUS_LABEL[s]} {countFor(s)}
          </button>
        ))}
      </div>

      {apps === null ? (
        <p className="py-8 text-center text-sm text-ink-3">Loading your tracker…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center">
          <p className="mb-1 font-medium">
            {apps.length === 0 ? 'Nothing tracked yet' : 'Nothing in this status'}
          </p>
          <p className="mb-4 text-sm text-ink-3">
            {apps.length === 0
              ? 'Add the first job you are chasing and watch the pipeline fill up.'
              : 'Try a different filter.'}
          </p>
          {apps.length === 0 && <Button size="sm" onClick={() => setForm('new')}>+ Add application</Button>}
        </div>
      ) : (
        <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
          {filtered.map((app) => (
            <div key={app.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <CompanyLogo name={app.company} domain={app.companyRef?.domain} />
                  <span className="truncate font-medium">{app.company}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${STATUS_PILL[app.status]}`}
                  >
                    {app.status === 'OTHER' && app.statusOther
                      ? app.statusOther
                      : STATUS_LABEL[app.status]}
                  </span>
                </div>
                <div className="truncate text-sm text-ink-3">
                  {app.role}
                  {app.rounds.length > 0
                    ? ` · ${app.rounds.length} round${app.rounds.length > 1 ? 's' : ''}`
                    : ''}
                  {app.appliedAt ? ` · applied ${shortDate(app.appliedAt)}` : ''}
                  {app.jobUrl ? (
                    <>
                      {' · '}
                      <a
                        href={app.jobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        job link
                      </a>
                    </>
                  ) : null}
                </div>
                {app.notes && <div className="mt-1 truncate text-sm text-ink-2">{app.notes}</div>}
              </div>

              {/* Quick status change */}
              <select
                value={app.status}
                onChange={(e) => quickStatus(app, e.target.value as ApplicationStatus)}
                className="h-8 rounded-lg border border-line bg-elevated px-2 text-xs text-ink outline-none focus:border-primary"
                aria-label="Change status"
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>

              <button onClick={() => setForm(app)} className="text-sm text-ink-3 hover:text-ink">
                Edit
              </button>
              {confirmId === app.id ? (
                <button onClick={() => remove(app.id)} className="text-sm font-medium text-danger">
                  Confirm
                </button>
              ) : (
                <button onClick={() => setConfirmId(app.id)} className="text-sm text-ink-3 hover:text-danger">
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
        </>
      )}

      {form !== null && (
        <ApplicationForm
          existing={form === 'new' ? undefined : form}
          onClose={() => setForm(null)}
          onSaved={upsert}
          onRoundsChange={(rounds) =>
            setApps((prev) =>
              prev && form !== 'new' && form
                ? prev.map((a) => (a.id === form.id ? { ...a, rounds } : a))
                : prev,
            )
          }
        />
      )}
    </div>
  );
}
