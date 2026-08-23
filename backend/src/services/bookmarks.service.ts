/**
 * Bookmark service — a user privately saves a Sink to read later.
 *
 * Bookmarks are owner-only and never touch a Sink's public score. Saving is
 * idempotent (one row per user per Sink, enforced by the schema's unique
 * constraint); unsaving is a plain delete. The "Saved" list reuses the sink
 * service's public projection so saved Sinks render exactly like the feed.
 */

import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { getPublicSinksByIds } from './sinks.service.js';

/** Save a Sink for the user. Idempotent — re-saving is a no-op. 404 if gone. */
export async function addBookmark(userId: string, sinkId: string): Promise<void> {
  const sink = await prisma.sink.findFirst({
    where: { id: sinkId, deletedAt: null },
    select: { id: true },
  });
  if (!sink) throw new AppError('Sink not found', 404);

  await prisma.bookmark.upsert({
    where: { userId_sinkId: { userId, sinkId } },
    update: {},
    create: { userId, sinkId },
  });
}

/** Unsave a Sink for the user. Idempotent — removing a missing bookmark is fine. */
export async function removeBookmark(
  userId: string,
  sinkId: string,
): Promise<void> {
  await prisma.bookmark.deleteMany({ where: { userId, sinkId } });
}

/** The ids of the Sinks the user has saved, newest-saved first. */
export async function getMyBookmarkSinkIds(userId: string): Promise<string[]> {
  const rows = await prisma.bookmark.findMany({
    where: { userId },
    select: { sinkId: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => r.sinkId);
}

/** The user's saved Sinks as public feed rows, newest-saved first. */
export async function getMyBookmarks(userId: string) {
  const ids = await getMyBookmarkSinkIds(userId);
  return getPublicSinksByIds(ids, userId);
}
