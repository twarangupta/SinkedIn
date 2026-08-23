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

/**
 * Step a user's vote UP or DOWN, clamped to [-1, +1] — the authoritative source
 * of the stepper rule. The client only sends a direction; the SERVER reads the
 * user's actual current vote and moves it exactly one step:
 *   UP:   Anchor -> none -> Buoy   (Buoy stays Buoy)
 *   DOWN: Buoy   -> none -> Anchor (Anchor stays Anchor)
 * Because the clamp lives here, a stale/unhydrated client can never cause a
 * 2-point swing (the bug where a Buoy flipped straight to Anchor).
 */
export async function stepVote(
  userId: string,
  sinkId: string,
  direction: 'UP' | 'DOWN',
): Promise<{ score: number; myVote: VoteValue | null }> {
  return prisma.$transaction(async (tx) => {
    const sink = await tx.sink.findFirst({
      where: { id: sinkId, deletedAt: null },
      select: { id: true },
    });
    if (!sink) throw new AppError('Sink not found', 404);

    const existing = await tx.vote.findUnique({
      where: { sinkId_userId: { sinkId, userId } },
      select: { value: true },
    });
    const current: VoteValue | null = existing?.value ?? null;

    const next: VoteValue | null =
      direction === 'UP'
        ? current === 'ANCHOR'
          ? null
          : current === null
            ? 'BUOY'
            : current // already BUOY — clamp
        : current === 'BUOY'
          ? null
          : current === null
            ? 'ANCHOR'
            : current; // already ANCHOR — clamp

    if (next !== current) {
      if (next === null) {
        await tx.vote.deleteMany({ where: { sinkId, userId } });
      } else {
        await tx.vote.upsert({
          where: { sinkId_userId: { sinkId, userId } },
          update: { value: next },
          create: { sinkId, userId, value: next },
        });
      }
    }

    const score = await recomputeScore(tx, sinkId);
    return { score, myVote: next };
  });
}

/**
 * All of a user's own vote state, for client-side hydration.
 *
 * The public feed/profile/Sink pages are SSR'd WITHOUT auth (for SEO), so they
 * can't include the caller's own votes — every card arrives as "not voted".
 * The client calls this once after sign-in to learn which Sinks it has voted on
 * (Buoy/Anchor) and which poll option it picked, and highlights them. Scores
 * are unaffected (they're global and already correct from SSR); this only
 * restores the caller's own highlights.
 */
export async function getMyVoteState(userId: string): Promise<{
  votes: { sinkId: string; value: VoteValue }[];
  pollVotes: { sinkId: string; pollOptionId: string }[];
  commentVotes: { commentId: string; value: VoteValue }[];
  bookmarks: string[];
}> {
  const [votes, pollVotes, commentVotes, bookmarks] = await Promise.all([
    prisma.vote.findMany({
      where: { userId },
      select: { sinkId: true, value: true },
    }),
    prisma.pollVote.findMany({
      where: { userId },
      select: { pollOptionId: true, option: { select: { sinkId: true } } },
    }),
    prisma.commentVote.findMany({
      where: { userId },
      select: { commentId: true, value: true },
    }),
    prisma.bookmark.findMany({
      where: { userId },
      select: { sinkId: true },
    }),
  ]);
  return {
    votes,
    pollVotes: pollVotes.map((pv) => ({
      sinkId: pv.option.sinkId,
      pollOptionId: pv.pollOptionId,
    })),
    commentVotes,
    bookmarks: bookmarks.map((b) => b.sinkId),
  };
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
