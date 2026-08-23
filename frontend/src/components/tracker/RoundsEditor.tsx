'use client';

/**
 * RoundsEditor — manage an application's optional interview rounds.
 *
 * Rounds are per-application, so a company can have zero or many in any shape.
 * Add / remove / reorder (up-down), each with a type dropdown, optional date,
 * result, and notes. Every change persists immediately via the owner-scoped
 * /api/v1/applications/:id/rounds endpoints and reports the new list up so the
 * card's round count stays fresh.
 */

import { useState } from 'react';
import { apiFetch } from '../../lib/api';
import type { InterviewRound, InterviewRoundResult, InterviewRoundType } from '../../types';

const TYPE_LABEL: Record<InterviewRoundType, string> = {
  PHONE_SCREEN: 'Phone screen',
  ONLINE_ASSESSMENT: 'Online assessment',
  TECHNICAL: 'Technical',
  SYSTEM_DESIGN: 'System design',
  BEHAVIORAL: 'Behavioral',
  HIRING_MANAGER: 'Hiring manager',
  HR: 'HR',
  OTHER: 'Other',
};
const TYPES = Object.keys(TYPE_LABEL) as InterviewRoundType[];

const RESULT_LABEL: Record<InterviewRoundResult, string> = {
  PENDING: 'Pending',
  CLEARED: 'Cleared',
  REJECTED: 'Rejected',
};
const RESULTS = Object.keys(RESULT_LABEL) as InterviewRoundResult[];

const fieldClass =
  'h-8 rounded-lg border border-line bg-elevated px-2 text-xs text-ink outline-none focus:border-primary';

/** ISO datetime → yyyy-mm-dd for the date input (empty if none). */
function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : '';
}

export function RoundsEditor({
  applicationId,
  initialRounds,
  onChange,
}: {
  applicationId: string;
  initialRounds: InterviewRound[];
  onChange: (rounds: InterviewRound[]) => void;
}) {
  const [rounds, setRounds] = useState<InterviewRound[]>(initialRounds);
  const base = `/api/v1/applications/${applicationId}/rounds`;

  // Commit a new list to state + parent.
  const commit = (next: InterviewRound[]) => {
    setRounds(next);
    onChange(next);
  };

  const add = async () => {
    const { round } = await apiFetch<{ round: InterviewRound }>(base, {
      method: 'POST',
      body: JSON.stringify({ type: 'TECHNICAL' }),
    });
    commit([...rounds, round]);
  };

  const patch = async (id: string, body: Partial<InterviewRound>) => {
    const { round } = await apiFetch<{ round: InterviewRound }>(`${base}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    commit(rounds.map((r) => (r.id === id ? round : r)));
  };

  const remove = async (id: string) => {
    await apiFetch(`${base}/${id}`, { method: 'DELETE' });
    commit(rounds.filter((r) => r.id !== id));
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= rounds.length) return;
    const next = [...rounds];
    [next[index], next[target]] = [next[target], next[index]];
    commit(next); // optimistic
    const { rounds: saved } = await apiFetch<{ rounds: InterviewRound[] }>(
      `${base}/reorder`,
      { method: 'POST', body: JSON.stringify({ orderedIds: next.map((r) => r.id) }) },
    );
    commit(saved);
  };

  return (
    <div className="rounded-lg border border-line bg-elevated/30 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">Interview rounds ({rounds.length})</span>
        <button type="button" onClick={add} className="text-xs font-medium text-primary hover:underline">
          + Add round
        </button>
      </div>

      {rounds.length === 0 ? (
        <p className="text-xs text-ink-3">
          No rounds yet. Add one per stage this company puts you through.
        </p>
      ) : (
        <div className="space-y-2">
          {rounds.map((r, i) => (
            <div key={r.id} className="rounded-lg border border-line bg-surface p-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-ink-3">{i + 1}.</span>
                <select
                  value={r.type}
                  onChange={(e) => patch(r.id, { type: e.target.value as InterviewRoundType })}
                  className={fieldClass}
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
                <select
                  value={r.result}
                  onChange={(e) => patch(r.id, { result: e.target.value as InterviewRoundResult })}
                  className={fieldClass}
                >
                  {RESULTS.map((res) => (
                    <option key={res} value={res}>
                      {RESULT_LABEL[res]}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  defaultValue={toDateInput(r.scheduledAt)}
                  onChange={(e) => patch(r.id, { scheduledAt: (e.target.value || null) })}
                  className={fieldClass}
                />
                <div className="ml-auto flex items-center gap-1 text-xs text-ink-3">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="px-1 hover:text-ink disabled:opacity-30" aria-label="Move up">
                    ↑
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === rounds.length - 1} className="px-1 hover:text-ink disabled:opacity-30" aria-label="Move down">
                    ↓
                  </button>
                  <button type="button" onClick={() => remove(r.id)} className="px-1 hover:text-danger" aria-label="Remove round">
                    ✕
                  </button>
                </div>
              </div>
              {r.type === 'OTHER' && (
                <input
                  placeholder="Round name"
                  defaultValue={r.typeOther ?? ''}
                  onBlur={(e) => patch(r.id, { typeOther: (e.target.value.trim() || null) })}
                  className={`${fieldClass} mt-2 w-full`}
                />
              )}
              <input
                placeholder="Notes (questions asked, interviewer, outcome…)"
                defaultValue={r.notes ?? ''}
                onBlur={(e) => patch(r.id, { notes: (e.target.value.trim() || null) })}
                className={`${fieldClass} mt-2 w-full`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
