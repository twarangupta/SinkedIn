/**
 * Comment service — threaded discussion on a Sink.
 *
 * Comments are threaded via an optional self-referential parentId (top-level
 * when null, a reply when set). Privacy: the public projection exposes only the
 * author's handle, never supabaseUserId.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';

/** Fields safe to return for a comment (author reduced to id + handle). */
const commentPublicSelect = {
  id: true,
  body: true,
  parentId: true,
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
    select: { id: true },
  });
  if (!sink) throw new AppError('Sink not found', 404);

  if (parentId) {
    const parent = await prisma.comment.findFirst({
      where: { id: parentId, sinkId, deletedAt: null },
      select: { id: true },
    });
    if (!parent) {
      throw new AppError('Parent comment not found on this Sink');
    }
  }

  return prisma.comment.create({
    data: { userId, sinkId, body, parentId: parentId ?? null },
    select: commentPublicSelect,
  });
}

/** All non-deleted comments for a Sink, oldest first (frontend builds the tree). */
export async function getCommentsForSink(sinkId: string) {
  return prisma.comment.findMany({
    where: { sinkId, deletedAt: null },
    select: commentPublicSelect,
    orderBy: { createdAt: 'asc' },
  });
}
