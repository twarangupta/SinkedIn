/**
 * Comment service — threaded discussion on a Sink.
 *
 * Comments are threaded via an optional self-referential parentId (top-level
 * when null, a reply when set). Privacy: the public projection exposes only the
 * author's handle, never supabaseUserId.
 */

import { Prisma, type PrismaClient, type VoteValue } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import {
  createNotifications,
  type NotificationInput,
} from './notifications.service.js';

/** Fields safe to return for a comment (author reduced to id + handle). */
const commentPublicSelect = {
  id: true,
  body: true,
  parentId: true,
  score: true,
  createdAt: true,
  user: { select: { id: true, handle: true, avatarId: true } },
} satisfies Prisma.CommentSelect;

/**
 * Add a comment to a Sink. If parentId is given it must be an existing,
 * non-deleted comment ON THE SAME Sink (so replies can't cross threads).
 */
export async function createComment(
  userId: string,
  sinkId: string,
  body: string,
  parentId?: string,
) {
  const sink = await prisma.sink.findFirst({
    where: { id: sinkId, deletedAt: null },
    select: { id: true, userId: true },
  });
  if (!sink) throw new AppError('Sink not found', 404);

  let parentAuthorId: string | null = null;
  if (parentId) {
    const parent = await prisma.comment.findFirst({
      where: { id: parentId, sinkId, deletedAt: null },
      select: { id: true, userId: true },
    });
    if (!parent) {
      throw new AppError('Parent comment not found on this Sink');
    }
    parentAuthorId = parent.userId;
  }

  const comment = await prisma.comment.create({
    data: { userId, sinkId, body, parentId: parentId ?? null },
    select: commentPublicSelect,
  });

  // Notify the people whose content was replied to (best-effort — a
  // notification failure must never fail the comment). Keyed by recipient so a
  // person who owns both the Sink and the parent comment gets a single, more
  // specific "reply to your comment" notification (it overwrites the Sink one).
  const recipients = new Map<string, NotificationInput>();
  if (sink.userId !== userId) {
    recipients.set(sink.userId, {
      userId: sink.userId,
      type: 'REPLY',
      actorId: userId,
      sinkId,
      commentId: null,
    });
  }
  if (parentAuthorId && parentAuthorId !== userId) {
    recipients.set(parentAuthorId, {
      userId: parentAuthorId,
      type: 'REPLY',
      actorId: userId,
      sinkId,
      commentId: parentId,
    });
  }
  if (recipients.size > 0) {
    try {
      await createNotifications([...recipients.values()]);
    } catch {
      // Non-fatal: the comment is already saved.
    }
  }

  return comment;
}

/** All non-deleted comments for a Sink, oldest first (frontend builds the tree). */
export async function getCommentsForSink(sinkId: string) {
  return prisma.comment.findMany({
    where: { sinkId, deletedAt: null },
    select: commentPublicSelect,
    orderBy: { createdAt: 'asc' },
  });
}

// --- Comment voting: Buoys/Anchors on a Comment — mirrors votes.service.ts. ---

type Tx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/** Recompute buoys - anchors for a Comment and cache it. Returns the new score. */
async function recomputeCommentScore(tx: Tx, commentId: string): Promise<number> {
  const [buoys, anchors] = await Promise.all([
    tx.commentVote.count({ where: { commentId, value: 'BUOY' } }),
    tx.commentVote.count({ where: { commentId, value: 'ANCHOR' } }),
  ]);
  const score = buoys - anchors;
  await tx.comment.update({ where: { id: commentId }, data: { score } });
  return score;
}

/**
 * Step a user's Comment vote UP or DOWN, clamped to [-1, +1] — the authoritative
 * stepper, identical to stepVote for Sinks. The client sends only a direction;
 * the SERVER reads the user's real vote and moves it exactly one step, so a
 * stale/unhydrated client can never cause a 2-point swing.
 */
export async function stepCommentVote(
  userId: string,
  commentId: string,
  direction: 'UP' | 'DOWN',
): Promise<{ score: number; myVote: VoteValue | null }> {
  return prisma.$transaction(async (tx) => {
    const comment = await tx.comment.findFirst({
      where: { id: commentId, deletedAt: null },
      select: { id: true },
    });
    if (!comment) throw new AppError('Comment not found', 404);

    const existing = await tx.commentVote.findUnique({
      where: { commentId_userId: { commentId, userId } },
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
        await tx.commentVote.deleteMany({ where: { commentId, userId } });
      } else {
        await tx.commentVote.upsert({
          where: { commentId_userId: { commentId, userId } },
          update: { value: next },
          create: { commentId, userId, value: next },
        });
      }
    }

    const score = await recomputeCommentScore(tx, commentId);
    return { score, myVote: next };
  });
}
