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
import {
  createNotifications,
  BUOY_MILESTONES,
  highestMilestone,
} from './notifications.service.js';

type Tx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/** A buoy-milestone notification to fire AFTER the vote transaction commits. */
type BuoyNotify = { ownerId: string; count: number } | null;

/**
 * Recompute buoys - anchors, cache it on the Sink, and detect a NEW buoy
 * milestone. The milestone is on the raw buoy count (upvotes), fires once per
 * threshold (tracked by `Sink.notifiedBuoyMilestone`), and returns a descriptor
 * so the caller can notify the owner outside the transaction (best-effort).
 */
async function recomputeScore(
  tx: Tx,
  sinkId: string,
  detectMilestone = true,
): Promise<{ score: number; buoyNotify: BuoyNotify }> {
  // The milestone lookup is only meaningful when the buoy count can RISE. On the
  // un-vote path it can only fall, so callers pass detectMilestone=false to skip
  // that extra read entirely.
  const [buoys, anchors, sink] = await Promise.all([
    tx.vote.count({ where: { sinkId, value: 'BUOY' } }),
    tx.vote.count({ where: { sinkId, value: 'ANCHOR' } }),
    detectMilestone
      ? tx.sink.findUnique({
          where: { id: sinkId },
          select: { userId: true, notifiedBuoyMilestone: true },
        })
      : Promise.resolve(null),
  ]);
  const score = buoys - anchors;

  let buoyNotify: BuoyNotify = null;
  const data: { score: number; notifiedBuoyMilestone?: number } = { score };
  if (sink) {
    const reached = highestMilestone(buoys, BUOY_MILESTONES);
    if (reached > sink.notifiedBuoyMilestone) {
      data.notifiedBuoyMilestone = reached;
      buoyNotify = { ownerId: sink.userId, count: reached };
    }
  }
  await tx.sink.update({ where: { id: sinkId }, data });
  return { score, buoyNotify };
}

/** Fire a pending buoy-milestone notification (best-effort; never throws). */
async function fireBuoyNotify(buoyNotify: BuoyNotify, sinkId: string): Promise<void> {
  if (!buoyNotify) return;
  try {
    await createNotifications([
      { userId: buoyNotify.ownerId, type: 'BUOY', count: buoyNotify.count, sinkId },
    ]);
  } catch {
    // Non-fatal: the vote is already saved and the milestone is marked.
  }
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
  const result = await prisma.$transaction(async (tx) => {
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

    const { score, buoyNotify } = await recomputeScore(tx, sinkId);
    return { score, myVote: value, buoyNotify };
  });
  await fireBuoyNotify(result.buoyNotify, sinkId);
  return { score: result.score, myVote: result.myVote };
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
  const result = await prisma.$transaction(async (tx) => {
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

    const { score, buoyNotify } = await recomputeScore(tx, sinkId);
    return { score, myVote: next, buoyNotify };
  });
  await fireBuoyNotify(result.buoyNotify, sinkId);
  return { score: result.score, myVote: result.myVote };
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
  reactions: { sinkId: string; kind: string }[];
}> {
  const [votes, pollVotes, commentVotes, bookmarks, reactions] = await Promise.all([
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
    prisma.reaction.findMany({
      where: { userId },
      select: { sinkId: true, kind: true },
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
    reactions,
  };
}

/** Remove the user's vote (used to un-buoy / un-anchor). */
export async function removeVote(
  userId: string,
  sinkId: string,
): Promise<{ score: number; myVote: null }> {
  return prisma.$transaction(async (tx) => {
    await tx.vote.deleteMany({ where: { sinkId, userId } });
    // Removing a vote can only lower the buoy count, so it never crosses a NEW
    // milestone; skip the milestone lookup entirely.
    const { score } = await recomputeScore(tx, sinkId, false);
    return { score, myVote: null };
  });
}
