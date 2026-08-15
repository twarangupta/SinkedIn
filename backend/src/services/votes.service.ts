/**
 * Vote service — Buoys (up) and Anchors (down).
 *
 * One vote per user per Sink (enforced by the @@unique([sinkId, userId]) in the
 * schema). After any change we recompute and cache `score` = buoys - anchors on
 * the Sink, inside a transaction so the vote and the cached score stay
 * consistent.
 */

import type { PrismaClient, VoteValue } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';

type Tx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/** Recompute buoys - anchors and cache it on the Sink. Returns the new score. */
async function recomputeScore(tx: Tx, sinkId: string): Promise<number> {
  const [buoys, anchors] = await Promise.all([
    tx.vote.count({ where: { sinkId, value: 'BUOY' } }),
    tx.vote.count({ where: { sinkId, value: 'ANCHOR' } }),
  ]);
  const score = buoys - anchors;
  await tx.sink.update({ where: { id: sinkId }, data: { score } });
  return score;
}

/**
 * Cast (or change) a vote. Upserts the user's single vote for the Sink, then
 * refreshes the cached score.
 */
export async function castVote(
  userId: string,
  sinkId: string,
  value: VoteValue,
): Promise<{ score: number; myVote: VoteValue }> {
  return prisma.$transaction(async (tx) => {
    const sink = await tx.sink.findFirst({
      where: { id: sinkId, deletedAt: null },
      select: { id: true },
    });
    if (!sink) throw new AppError('Sink not found', 404);

    await tx.vote.upsert({
      where: { sinkId_userId: { sinkId, userId } },
      update: { value },
      create: { sinkId, userId, value },
    });

    const score = await recomputeScore(tx, sinkId);
    return { score, myVote: value };
  });
}

/** Remove the user's vote (used to un-buoy / un-anchor). */
export async function removeVote(
  userId: string,
  sinkId: string,
): Promise<{ score: number; myVote: null }> {
  return prisma.$transaction(async (tx) => {
    await tx.vote.deleteMany({ where: { sinkId, userId } });
    const score = await recomputeScore(tx, sinkId);
    return { score, myVote: null };
  });
}
