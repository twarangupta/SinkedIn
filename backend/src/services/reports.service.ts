/**
 * Report service — users flag a Sink or Comment for moderation.
 *
 * Phase 1 is deliberately minimal: we record the report (one per user per
 * target) and validate the target exists. Reviewing/hiding is a manual
 * soft-delete (`deletedAt`) for now; the review console is Phase 3.
 */

import { Prisma, type ReportTargetType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';

/** Confirm the reported target exists and isn't already deleted. */
async function assertTargetExists(
  targetType: ReportTargetType,
  targetId: string,
): Promise<void> {
  const exists =
    targetType === 'SINK'
      ? await prisma.sink.findFirst({
          where: { id: targetId, deletedAt: null },
          select: { id: true },
        })
      : await prisma.comment.findFirst({
          where: { id: targetId, deletedAt: null },
          select: { id: true },
        });
  if (!exists) throw new AppError('That content no longer exists', 404);
}

/**
 * File a report. Idempotent per user+target: a repeat report is treated as
 * already-filed (no error, no duplicate) so the UI can always say "reported".
 */
export async function createReport(
  reporterId: string,
  targetType: ReportTargetType,
  targetId: string,
  reason?: string,
): Promise<{ reported: true }> {
  await assertTargetExists(targetType, targetId);
  try {
    await prisma.report.create({
      data: { reporterId, targetType, targetId, reason: reason ?? null },
    });
  } catch (error) {
    // Unique violation = this user already reported this target. That's fine.
    if (
      !(
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
    ) {
      throw error;
    }
  }
  return { reported: true };
}
