/**
 * Interview-round service — optional, per-application rounds (Phase 2 audit).
 *
 * A company may have zero or many rounds, in any shape; users add / remove /
 * reorder them, so the count varies per company. Private: every function is
 * scoped through the parent Application's owner (a round the caller doesn't own,
 * or on someone else's application, is a 404).
 */

import { Prisma, InterviewRoundType, InterviewRoundResult } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';

export interface RoundInput {
  type?: InterviewRoundType;
  typeOther?: string | null;
  scheduledAt?: Date | null;
  result?: InterviewRoundResult;
  notes?: string | null;
}

const roundSelect = {
  id: true,
  position: true,
  type: true,
  typeOther: true,
  scheduledAt: true,
  result: true,
  notes: true,
} satisfies Prisma.InterviewRoundSelect;

/** Throw 404 unless the caller owns the parent application. */
async function assertOwnsApplication(userId: string, applicationId: string) {
  const app = await prisma.application.findFirst({
    where: { id: applicationId, userId, deletedAt: null },
    select: { id: true },
  });
  if (!app) throw new AppError('Application not found', 404);
}

/** OTHER carries a free-text label; every other type clears it. */
function resolveTypeOther(
  type: InterviewRoundType,
  typeOther: string | null | undefined,
): string | null {
  return type === InterviewRoundType.OTHER ? typeOther?.trim() || null : null;
}

/** Append a round to the application (position after the current last). */
export async function addRound(
  userId: string,
  applicationId: string,
  input: RoundInput,
) {
  await assertOwnsApplication(userId, applicationId);
  const last = await prisma.interviewRound.findFirst({
    where: { applicationId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });
  const type = input.type ?? InterviewRoundType.TECHNICAL;
  return prisma.interviewRound.create({
    data: {
      applicationId,
      position: (last?.position ?? -1) + 1,
      type,
      typeOther: resolveTypeOther(type, input.typeOther),
      scheduledAt: input.scheduledAt ?? null,
      result: input.result ?? InterviewRoundResult.PENDING,
      notes: input.notes ?? null,
    },
    select: roundSelect,
  });
}

/** Edit a round the caller owns. */
export async function updateRound(
  userId: string,
  applicationId: string,
  roundId: string,
  input: RoundInput,
) {
  await assertOwnsApplication(userId, applicationId);
  const existing = await prisma.interviewRound.findFirst({
    where: { id: roundId, applicationId },
    select: { type: true },
  });
  if (!existing) throw new AppError('Round not found', 404);

  const data: Prisma.InterviewRoundUpdateInput = {};
  if (input.type !== undefined) {
    data.type = input.type;
    data.typeOther = resolveTypeOther(input.type, input.typeOther);
  } else if (input.typeOther !== undefined) {
    data.typeOther = resolveTypeOther(existing.type, input.typeOther);
  }
  if (input.scheduledAt !== undefined) data.scheduledAt = input.scheduledAt;
  if (input.result !== undefined) data.result = input.result;
  if (input.notes !== undefined) data.notes = input.notes;

  return prisma.interviewRound.update({
    where: { id: roundId },
    data,
    select: roundSelect,
  });
}

/** Remove a round the caller owns (rounds are private management data). */
export async function deleteRound(
  userId: string,
  applicationId: string,
  roundId: string,
) {
  await assertOwnsApplication(userId, applicationId);
  const existing = await prisma.interviewRound.findFirst({
    where: { id: roundId, applicationId },
    select: { id: true },
  });
  if (!existing) throw new AppError('Round not found', 404);
  await prisma.interviewRound.delete({ where: { id: roundId } });
}

/** Reorder all of an application's rounds to match the given id order. */
export async function reorderRounds(
  userId: string,
  applicationId: string,
  orderedIds: string[],
) {
  await assertOwnsApplication(userId, applicationId);
  const rounds = await prisma.interviewRound.findMany({
    where: { applicationId },
    select: { id: true },
  });
  const ids = new Set(rounds.map((r) => r.id));
  if (orderedIds.length !== ids.size || !orderedIds.every((id) => ids.has(id))) {
    throw new AppError('orderedIds must be exactly this application\'s rounds');
  }
  await prisma.$transaction(
    orderedIds.map((id, i) =>
      prisma.interviewRound.update({ where: { id }, data: { position: i } }),
    ),
  );
  return prisma.interviewRound.findMany({
    where: { applicationId },
    orderBy: { position: 'asc' },
    select: roundSelect,
  });
}
