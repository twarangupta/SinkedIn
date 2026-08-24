'use client';

/**
 * TrackerBoard — the kanban view of the tracker. One column per status; drag a
 * card into another column to change its status (same PATCH the list uses).
 *
 * Drag-and-drop is native HTML5 (draggable + dragover/drop) — no dependency.
 * That is desktop-oriented; on touch, the list view's inline status select is
 * the equivalent. All data + mutations are owned by the parent (TrackerApp).
 */

import { useState } from 'react';
import { shortDate } from '../../lib/format';
import { CompanyLogo } from './CompanyLogo';
import { BOARD_PRIMARY, BOARD_TERMINAL, STATUS_LABEL, STATUS_ORDER } from './status';
import type { Application, ApplicationStatus } from '../../types';

export function TrackerBoard({
  applications,
  onChangeStatus,
  onEdit,
  onDelete,
}: {
  applications: Application[];
  onChangeStatus: (app: Application, next: ApplicationStatus) => void;
  onEdit: (app: Application) => void;
  onDelete: (id: string) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<ApplicationStatus | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const drop = (status: ApplicationStatus) => {
    const app = applications.find((a) => a.id === draggingId);
    setDraggingId(null);
    setOverStatus(null);
    if (app && app.status !== status) onChangeStatus(app, status);
  };

  // Default columns are the 6 primary stages; a terminal status (Ghosted /
  // Withdrawn / Other) only gets a column when something is actually in it.
  const columns = [
    ...BOARD_PRIMARY,
    ...BOARD_TERMINAL.filter((s) => applications.some((a) => a.status === s)),
  ];

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {columns.map((status) => {
        const cards = applications.filter((a) => a.status === status);
        return (
          <div
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              setOverStatus(status);
            }}
            onDragLeave={() => setOverStatus((s) => (s === status ? null : s))}
            onDrop={() => drop(status)}
            className={`flex w-52 shrink-0 flex-col rounded-xl border p-1.5 ${
              overStatus === status ? 'border-primary bg-elevated/60' : 'border-line bg-elevated/30'
            }`}
          >
            <div className="mb-2 flex items-center justify-between px-1 text-sm font-medium">
              <span>{STATUS_LABEL[status]}</span>
              <span className="text-xs text-ink-3">{cards.length}</span>
            </div>

            <div className="space-y-2">
              {cards.map((app) => (
                <div
                  key={app.id}
                  draggable
                  onDragStart={() => setDraggingId(app.id)}
                  onDragEnd={() => setDraggingId(null)}
                  className={`cursor-grab rounded-lg border border-line bg-surface p-2.5 active:cursor-grabbing ${
                    draggingId === app.id ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <CompanyLogo name={app.company} domain={app.companyRef?.domain} size={18} />
                    <div className="truncate text-sm font-medium">{app.company}</div>
                  </div>
                  <div className="truncate text-xs text-ink-3">{app.role}</div>
                  {app.rounds.length > 0 && (
                    <div className="mt-0.5 text-xs text-ink-3">
                      {app.rounds.length} round{app.rounds.length > 1 ? 's' : ''}
                    </div>
                  )}
                  {app.status === 'OTHER' && app.statusOther && (
                    <div className="mt-1 truncate text-xs text-ink-2">{app.statusOther}</div>
                  )}
                  {(app.appliedAt || app.jobUrl) && (
                    <div className="mt-1 flex items-center gap-2 text-xs text-ink-3">
                      {app.appliedAt && <span>{shortDate(app.appliedAt)}</span>}
                      {app.jobUrl && (
                        <a
                          href={app.jobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          link
                        </a>
                      )}
                    </div>
                  )}
                  {/* Touch devices can't drag between columns, so below lg a
                      status dropdown moves the card instead. */}
                  <select
                    value={app.status}
                    onChange={(e) => onChangeStatus(app, e.target.value as ApplicationStatus)}
                    aria-label="Change status"
                    className="mt-2 h-7 w-full rounded-lg border border-line bg-elevated px-1.5 text-xs text-ink outline-none focus:border-primary lg:hidden"
                  >
                    {STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    <button onClick={() => onEdit(app)} className="text-ink-3 hover:text-ink">
                      Edit
                    </button>
                    {confirmId === app.id ? (
                      <button
                        onClick={() => {
                          onDelete(app.id);
                          setConfirmId(null);
                        }}
                        className="font-medium text-danger"
                      >
                        Confirm
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmId(app.id)}
                        className="text-ink-3 hover:text-danger"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {cards.length === 0 && (
                <div className="rounded-lg border border-dashed border-line py-3 text-center text-xs text-ink-3">
                  Drop here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
