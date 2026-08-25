/**
 * Application insights — a PRIVATE, single-user dashboard over the caller's own
 * tracker rows. Every number here is derived only from that one user's data
 * (their applications + their status history), so there is NO cross-user
 * aggregation and NO privacy/legal risk — this is the safe 80% of the value,
 * shipped before any community aggregate (which would be the Phase-3 Ghost Index,
 * gated behind opt-in + k-anonymity).
 *
 * The funnel and "response time" are why `ApplicationEvent` exists: current
 * status alone can't tell you an application that is now REJECTED once reached
 * INTERVIEW, or how long the reply took. We reconstruct the journey from events.
 */

import { ApplicationStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

/**
 * Ordered pipeline stages. Terminal statuses (REJECTED / GHOSTED / WITHDRAWN /
 * OTHER) are outcomes, not stages, so they have no rank — we treat the funnel as
 * "reached at least this far", the standard monotonic funnel.
 */
const STAGE_RANK: Partial<Record<ApplicationStatus, number>> = {
  SAVED: 0,
  APPLIED: 1,
  OA: 2,
  INTERVIEW: 3,
  OFFER: 4,
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Median of a numeric list (0 for empty). */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/** Whole percent of part/total (0 when total is 0), so the UI never shows NaN. */
function pct(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

export interface ApplicationInsights {
  total: number;
  funnel: { applied: number; oa: number; interview: number; offer: number };
  rates: { response: number; interview: number; offer: number; ghost: number };
  medianResponseDays: number | null;
  perResume: { name: string; applied: number; responseRate: number }[];
  cadence: { thisWeek: number; lastWeek: number };
}

/** Compute the caller's private tracker insights. Owner-scoped; excludes soft-deleted. */
export async function getInsights(userId: string): Promise<ApplicationInsights> {
  const apps = await prisma.application.findMany({
    where: { userId, deletedAt: null },
    select: {
      status: true,
      appliedAt: true,
      resumeFileName: true,
      events: { select: { status: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
    },
  });

  const total = apps.length;

  let applied = 0;
  let oa = 0;
  let interview = 0;
  let offer = 0;
  let ghosted = 0;
  let responded = 0;
  const responseDays: number[] = [];

  // Per-resume tally: applied count + responded count, keyed by filename.
  const resumeStats = new Map<string, { applied: number; responded: number }>();

  const now = Date.now();
  let thisWeek = 0;
  let lastWeek = 0;

  for (const app of apps) {
    // Highest pipeline stage this application ever reached (from its history).
    let maxRank = 0;
    let firstResponseAt: Date | null = null;
    for (const ev of app.events) {
      const rank = STAGE_RANK[ev.status];
      if (rank !== undefined && rank > maxRank) maxRank = rank;
      // First "real reply": reaching OA+ or an explicit rejection is a response;
      // silence (still APPLIED, or GHOSTED) is not.
      if (
        firstResponseAt === null &&
        ((rank !== undefined && rank >= 2) || ev.status === ApplicationStatus.REJECTED)
      ) {
        firstResponseAt = ev.createdAt;
      }
    }

    const didApply = app.appliedAt !== null || maxRank >= 1;
    if (!didApply) continue; // SAVED-only rows aren't part of the funnel

    applied++;
    if (maxRank >= 2) oa++;
    if (maxRank >= 3) interview++;
    if (maxRank >= 4) offer++;
    if (app.status === ApplicationStatus.GHOSTED) ghosted++;

    const gotResponse =
      maxRank >= 2 || app.status === ApplicationStatus.REJECTED;
    if (gotResponse) {
      responded++;
      if (app.appliedAt && firstResponseAt) {
        const days = (firstResponseAt.getTime() - app.appliedAt.getTime()) / MS_PER_DAY;
        if (days >= 0) responseDays.push(days);
      }
    }

    if (app.resumeFileName) {
      const s = resumeStats.get(app.resumeFileName) ?? { applied: 0, responded: 0 };
      s.applied++;
      if (gotResponse) s.responded++;
      resumeStats.set(app.resumeFileName, s);
    }

    // Cadence: applications applied in the last 7 vs the prior 7 days.
    if (app.appliedAt) {
      const ageDays = (now - app.appliedAt.getTime()) / MS_PER_DAY;
      if (ageDays < 7) thisWeek++;
      else if (ageDays < 14) lastWeek++;
    }
  }

  const perResume = [...resumeStats.entries()]
    .map(([name, s]) => ({
      name,
      applied: s.applied,
      responseRate: pct(s.responded, s.applied),
    }))
    .sort((a, b) => b.applied - a.applied);

  return {
    total,
    funnel: { applied, oa, interview, offer },
    rates: {
      response: pct(responded, applied),
      interview: pct(interview, applied),
      offer: pct(offer, applied),
      ghost: pct(ghosted, applied),
    },
    medianResponseDays: responseDays.length ? Math.round(median(responseDays)) : null,
    perResume,
    cadence: { thisWeek, lastWeek },
  };
}
