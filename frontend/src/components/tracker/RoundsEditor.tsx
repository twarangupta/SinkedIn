'use client';

/**
 * RoundsEditor — manage an application's optional interview rounds, kept light.
 *
 * Each round is a COMPACT one-line row ("1 · Technical · Pending · 24 Aug"); tap
 * a row to expand its editor (type, result, date, notes) only when needed. Add /
 * remove / reorder any number. Every change persists immediately via the
 * owner-scoped /api/v1/applications/:id/rounds endpoints and reports the new list
 * up so the card's round count stays fresh.
 */

import { useState } from 'react';
import { apiFetch } from '../../lib/api';
import { shortDate } from '../../lib/format';
import { ROUND_TYPE_LABEL as TYPE_LABEL } from './status';
import type { InterviewRound, InterviewRoundResult, InterviewRoundType } from '../../types';

const TYPES = Object.keys(TYPE_LABEL) as InterviewRoundType[];

const RESULT_LABEL: Record<InterviewRoundResult, string> = {
  PENDING: 'Pending',
  CLEARED: 'Cleared',
  REJECTED: 'Rejected',
};
const RESULTS = Object.keys(RESULT_LABEL) as InterviewRoundResult[];
const RESULT_CLASS: Record<InterviewRoundResult, string> = {
  PENDING: 'text-ink-3',
  CLEARED: 'text-green-500',
  REJECTED: 'text-danger',
};

const fieldClass =
  'h-8 rounded-lg border border-line bg-elevated px-2 text-xs text-ink outline-none focus:border-primary';

const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '');
const roundLabel = (r: InterviewRound) =>
  r.type === 'OTHER' && r.typeOther ? r.typeOther : TYPE_LABEL[r.type];

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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const base = `/api/v1/applications/${applicationId}/rounds`;

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
    setExpandedId(round.id); // open the new round for immediate editing
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
    if (expandedId === id) setExpandedId(null);
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
    <div className="rounded-lg border border-line bg-elevated/30 p-2.5">
      <div className="mb-1.5 flex items-center justify-between">
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
        <div className="space-y-1.5">
          {rounds.map((r, i) => {
            const open = expandedId === r.id;
            return (
              <div key={r.id} className="rounded-lg border border-line bg-surface">
                {/* Compact one-line row. */}
                <div className="flex items-center gap-2 px-2.5 py-1.5 text-xs">
                  <span className="text-ink-3">{i + 1}</span>
                  <button
                    type="button"
                    onClick={() => setExpandedId(open ? null : r.id)}
                    className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                  >
                    <span className="truncate font-medium text-ink-2">{roundLabel(r)}</span>
                    <span className={RESULT_CLASS[r.result]}>· {RESULT_LABEL[r.result]}</span>
                    {r.scheduledAt && <span className="text-ink-3">· {shortDate(r.scheduledAt)}</span>}
                  </button>
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="px-1 text-ink-3 hover:text-ink disabled:opacity-30" aria-label="Move up">
                    ↑
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === rounds.length - 1} className="px-1 text-ink-3 hover:text-ink disabled:opacity-30" aria-label="Move down">
                    ↓
                  </button>
                  <button type="button" onClick={() => setExpandedId(open ? null : r.id)} className="px-1 text-ink-3 hover:text-ink" aria-label={open ? 'Collapse' : 'Edit'}>
                    {open ? '▲' : '▾'}
                  </button>
                </div>

                {/* Expanded editor (only when needed). */}
                {open && (
                  <div className="space-y-2 border-t border-line px-2.5 py-2">
                    <div className="flex flex-wrap gap-2">
                      <select value={r.type} onChange={(e) => patch(r.id, { type: e.target.value as InterviewRoundType })} className={fieldClass}>
                        {TYPES.map((t) => (
                          <option key={t} value={t}>
                            {TYPE_LABEL[t]}
                          </option>
                        ))}
                      </select>
                      <select value={r.result} onChange={(e) => patch(r.id, { result: e.target.value as InterviewRoundResult })} className={fieldClass}>
                        {RESULTS.map((res) => (
                          <option key={res} value={res}>
                            {RESULT_LABEL[res]}
                          </option>
                        ))}
                      </select>
                      <input type="date" defaultValue={toDateInput(r.scheduledAt)} onChange={(e) => patch(r.id, { scheduledAt: e.target.value || null })} className={fieldClass} />
                    </div>
                    {r.type === 'OTHER' && (
                      <input placeholder="Round name" defaultValue={r.typeOther ?? ''} onBlur={(e) => patch(r.id, { typeOther: e.target.value.trim() || null })} className={`${fieldClass} w-full`} />
                    )}
                    <input placeholder="Notes (questions asked, interviewer, outcome…)" defaultValue={r.notes ?? ''} onBlur={(e) => patch(r.id, { notes: e.target.value.trim() || null })} className={`${fieldClass} w-full`} />
                    <button type="button" onClick={() => remove(r.id)} className="text-xs text-ink-3 hover:text-danger">
                      Remove round
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
