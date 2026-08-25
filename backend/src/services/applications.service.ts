/**
 * Application service — the PRIVATE personal job tracker (Phase 2).
 *
 * PRIVACY (load-bearing): every function is scoped to the owner. An Application
 * holds real PII (real company names, dates, notes), so it is NEVER exposed in
 * any public/pseudonymous response and never indexed. All reads and writes here
 * filter by `userId`; a row that isn't the caller's is treated as 404 (we do not
 * reveal that someone else's application exists).
 *
 * The tracker is deliberately independent of Sinks. The only bridge to the
 * public side is a user-initiated "post a Sink from this" flow, built in a later
 * slice — real tracker data never auto-flows to the public feed.
 */

import { Prisma, ApplicationStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { toCsv } from '../lib/csv.js';
import { findOrCreateCompany } from './companies.service.js';

export interface CreateApplicationInput {
  company: string;
  role: string;
  status?: ApplicationStatus;
  statusOther?: string | null;
  jobUrl?: string | null;
  appliedAt?: Date | null;
  notes?: string | null;
  resumeFileKey?: string | null;
  resumeFileName?: string | null;
}

export interface UpdateApplicationInput {
  company?: string;
  role?: string;
  status?: ApplicationStatus;
  statusOther?: string | null;
  jobUrl?: string | null;
  appliedAt?: Date | null;
  notes?: string | null;
  resumeFileKey?: string | null;
  resumeFileName?: string | null;
}

/** Fields returned for an application (all owned by the caller — no PII wall to apply). */
const applicationSelect = {
  id: true,
  company: true,
  role: true,
  status: true,
  statusOther: true,
  jobUrl: true,
  appliedAt: true,
  notes: true,
  resumeFileKey: true,
  resumeFileName: true,
  createdAt: true,
  updatedAt: true,
  companyRef: { select: { domain: true } }, // for the company logo (domain only)
  rounds: {
    select: {
      id: true,
      position: true,
      type: true,
      typeOther: true,
      scheduledAt: true,
      result: true,
      notes: true,
    },
    orderBy: { position: 'asc' },
  },
} satisfies Prisma.ApplicationSelect;

/**
 * Resolve the statusOther free-text against the status: required when status is
 * OTHER, cleared otherwise (mirrors the Sink conclusion/conclusionOther rule).
 */
function resolveStatusOther(
  status: ApplicationStatus,
  statusOther: string | null | undefined,
): string | null {
  if (status === ApplicationStatus.OTHER) {
    const v = statusOther?.trim();
    if (!v) throw new AppError('statusOther is required when status is OTHER');
    return v;
  }
  return null;
}

/** Create an application for the caller. */
export async function createApplication(
  userId: string,
  input: CreateApplicationInput,
) {
  const status = input.status ?? ApplicationStatus.SAVED;
  const statusOther = resolveStatusOther(status, input.statusOther);

  // Convenience: anything past SAVED implies the user has applied, so stamp
  // appliedAt if they didn't set it themselves.
  const appliedAt =
    input.appliedAt ??
    (status !== ApplicationStatus.SAVED ? new Date() : null);

  // Resolve the typed company name to a centralized Company (create if new).
  const companyRef = await findOrCreateCompany(input.company, userId);

  // Create the application AND its first status event atomically, so the status
  // history is never missing its opening entry.
  return prisma.$transaction(async (tx) => {
    const app = await tx.application.create({
      data: {
        userId,
        company: input.company.trim(),
        companyId: companyRef?.id ?? null,
        role: input.role.trim(),
        status,
        statusOther,
        jobUrl: input.jobUrl ?? null,
        appliedAt,
        notes: input.notes ?? null,
        resumeFileKey: input.resumeFileKey ?? null,
        resumeFileName: input.resumeFileName ?? null,
      },
      select: applicationSelect,
    });
    await tx.applicationEvent.create({ data: { applicationId: app.id, status } });
    return app;
  });
}

/** List the caller's applications (optionally filtered by status), newest activity first. */
export async function listApplications(
  userId: string,
  options: { status?: ApplicationStatus } = {},
) {
  return prisma.application.findMany({
    where: {
      userId,
      deletedAt: null,
      ...(options.status ? { status: options.status } : {}),
    },
    select: applicationSelect,
    orderBy: { updatedAt: 'desc' },
  });
}

/**
 * Per-status counts for the caller's tracker (drives the sidebar "Your Tracker"
 * section). Owner-scoped; returns every status (zero-filled) plus the total.
 */
export async function summarizeApplications(userId: string) {
  const grouped = await prisma.application.groupBy({
    by: ['status'],
    where: { userId, deletedAt: null },
    _count: { _all: true },
  });
  const counts = {} as Record<ApplicationStatus, number>;
  for (const s of Object.values(ApplicationStatus)) counts[s] = 0;
  let total = 0;
  for (const g of grouped) {
    counts[g.status] = g._count._all;
    total += g._count._all;
  }
  return { counts, total };
}

/** One application the caller owns (404 if missing or not theirs). */
export async function getApplication(userId: string, id: string) {
  const app = await prisma.application.findFirst({
    where: { id, userId, deletedAt: null },
    select: applicationSelect,
  });
  if (!app) throw new AppError('Application not found', 404);
  return app;
}

/** Edit an application the caller owns. */
export async function updateApplication(
  userId: string,
  id: string,
  input: UpdateApplicationInput,
) {
  const existing = await prisma.application.findFirst({
    where: { id, userId, deletedAt: null },
    select: { status: true, appliedAt: true },
  });
  if (!existing) throw new AppError('Application not found', 404);

  const data: Prisma.ApplicationUncheckedUpdateInput = {};
  if (input.company !== undefined) {
    data.company = input.company.trim();
    const ref = await findOrCreateCompany(input.company, userId);
    data.companyId = ref?.id ?? null;
  }
  if (input.role !== undefined) data.role = input.role.trim();
  if (input.jobUrl !== undefined) data.jobUrl = input.jobUrl;
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.resumeFileKey !== undefined) data.resumeFileKey = input.resumeFileKey;
  if (input.resumeFileName !== undefined) data.resumeFileName = input.resumeFileName;

  // Status change re-resolves the OTHER free-text and back-fills appliedAt.
  let statusChanged = false;
  let newStatus = existing.status;
  if (input.status !== undefined) {
    data.status = input.status;
    data.statusOther = resolveStatusOther(input.status, input.statusOther);
    statusChanged = input.status !== existing.status;
    newStatus = input.status;
    if (
      input.status !== ApplicationStatus.SAVED &&
      existing.appliedAt === null &&
      input.appliedAt === undefined
    ) {
      data.appliedAt = new Date();
    }
  } else if (input.statusOther !== undefined) {
    // statusOther edited without changing status: only meaningful when OTHER.
    data.statusOther = resolveStatusOther(existing.status, input.statusOther);
  }
  if (input.appliedAt !== undefined) data.appliedAt = input.appliedAt;

  // Update AND log a status event (only on an actual transition) atomically.
  return prisma.$transaction(async (tx) => {
    const app = await tx.application.update({
      where: { id },
      data,
      select: applicationSelect,
    });
    if (statusChanged) {
      await tx.applicationEvent.create({
        data: { applicationId: id, status: newStatus },
      });
    }
    return app;
  });
}

// --- Data export (Phase 2 "export my data" — a PII obligation once we store
// real tracker data + resumes). Owner-scoped; returns EVERYTHING we hold for the
// user, including soft-deleted rows (we still hold that PII), so the export is a
// truthful copy of their data. ---

/**
 * The full private tracker for one user, shaped for export: every application
 * (soft-deleted included) with its interview rounds and status history. No PII
 * wall to apply here — it is all the caller's own data, handed back to them.
 */
export async function exportApplications(userId: string) {
  const applications = await prisma.application.findMany({
    where: { userId }, // note: no deletedAt filter — export includes deleted rows
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      company: true,
      role: true,
      status: true,
      statusOther: true,
      jobUrl: true,
      appliedAt: true,
      notes: true,
      resumeFileName: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      rounds: {
        orderBy: { position: 'asc' },
        select: {
          position: true,
          type: true,
          typeOther: true,
          scheduledAt: true,
          result: true,
          notes: true,
        },
      },
      events: {
        orderBy: { createdAt: 'asc' },
        select: { status: true, note: true, createdAt: true },
      },
    },
  });

  return { exportedAt: new Date().toISOString(), applications };
}

export type ApplicationsExport = Awaited<ReturnType<typeof exportApplications>>;

/**
 * Flatten an export into a spreadsheet-friendly CSV: one row per application
 * (the primary table people want in Excel). Interview rounds are summarized into
 * a single readable column; the JSON export carries the fully structured rounds
 * + status history for anyone who needs them.
 */
export function applicationsExportToCsv(data: ApplicationsExport): string {
  const headers = [
    'Company',
    'Role',
    'Status',
    'Status (other)',
    'Job URL',
    'Applied at',
    'Notes',
    'Resume file',
    'Interview rounds',
    'Created at',
    'Updated at',
    'Deleted at',
  ];

  const rows = data.applications.map((a) => {
    const rounds = a.rounds
      .map((r) => {
        const type = r.type === 'OTHER' ? r.typeOther || 'Other' : r.type;
        const when = r.scheduledAt ? ` (${r.scheduledAt.toISOString().slice(0, 10)})` : '';
        return `${r.position}. ${type}${when} — ${r.result}`;
      })
      .join(' | ');

    return [
      a.company,
      a.role,
      a.status,
      a.statusOther ?? '',
      a.jobUrl ?? '',
      a.appliedAt,
      a.notes ?? '',
      a.resumeFileName ?? '',
      rounds,
      a.createdAt,
      a.updatedAt,
      a.deletedAt ?? '',
    ];
  });

  return toCsv(headers, rows);
}

/** Soft-delete an application the caller owns. */
export async function deleteApplication(userId: string, id: string) {
  const existing = await prisma.application.findFirst({
    where: { id, userId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) throw new AppError('Application not found', 404);
  await prisma.application.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

/**
 * Hard-delete ALL of the caller's tracker data (the "delete my data" control —
 * a PII obligation). Unlike per-row delete, this is a true purge: interview
 * rounds, status history, and applications are physically removed, including
 * already soft-deleted rows.
 *
 * Resume PDFs live in a private Storage bucket the backend does not talk to
 * (client-side RLS), so we return the affected `resumeFileKey`s for the caller
 * to delete from storage — the DB purge and the storage purge together leave
 * nothing behind.
 */
export async function purgeTrackerData(userId: string) {
  return prisma.$transaction(async (tx) => {
    // One read gets everything we need: the ids drive the cascade delete, and
    // the resume keys are returned so the client can remove the matching PDFs
    // from the private bucket.
    const apps = await tx.application.findMany({
      where: { userId },
      select: { id: true, resumeFileKey: true },
    });
    const ids = apps.map((a) => a.id);
    const resumeKeys = apps
      .map((a) => a.resumeFileKey)
      .filter((k): k is string => !!k);

    if (ids.length > 0) {
      // Delete children first (FKs point at Application), then the applications.
      await tx.interviewRound.deleteMany({ where: { applicationId: { in: ids } } });
      await tx.applicationEvent.deleteMany({ where: { applicationId: { in: ids } } });
      await tx.application.deleteMany({ where: { id: { in: ids } } });
    }

    return { deletedCount: ids.length, resumeKeys };
  });
}
