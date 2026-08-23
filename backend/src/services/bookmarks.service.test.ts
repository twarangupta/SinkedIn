/**
 * Tests for the bookmark service — against the isolated sinkedin_test DB.
 * Covers save/unsave, idempotency, ordering, the 404, and hydration exposure.
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { createSink } from './sinks.service.js';
import {
  addBookmark,
  getMyBookmarks,
  getMyBookmarkSinkIds,
  removeBookmark,
} from './bookmarks.service.js';
import { getMyVoteState } from './votes.service.js';

let userId: string;
let categoryId: string;

async function clearAll() {
  // Order matters for FKs: bookmarks reference sinks + users.
  await prisma.bookmark.deleteMany();
  await prisma.commentVote.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.pollOption.deleteMany();
  await prisma.sink.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();
}

beforeEach(async () => {
  await clearAll();
  const user = await prisma.user.create({
    data: { supabaseUserId: 'seed:bm', handle: 'Bookmark_User_001' },
  });
  userId = user.id;
  const category = await prisma.category.create({
    data: { name: 'Discussion', slug: 'discussion', color: '#14B8A6' },
  });
  categoryId = category.id;
});

afterAll(async () => {
  await clearAll();
  await prisma.$disconnect();
});

describe('bookmarks', () => {
  it('saves a Sink and exposes it in the saved list', async () => {
    const sink = await createSink(userId, { categoryId, title: 'save me' });
    await addBookmark(userId, sink.id);

    const saved = await getMyBookmarks(userId);
    expect(saved.map((s) => s.id)).toEqual([sink.id]);
    expect(saved[0].title).toBe('save me');
  });

  it('saving twice is idempotent (one bookmark row)', async () => {
    const sink = await createSink(userId, { categoryId, title: 't' });
    await addBookmark(userId, sink.id);
    await addBookmark(userId, sink.id);

    const count = await prisma.bookmark.count({ where: { userId, sinkId: sink.id } });
    expect(count).toBe(1);
  });

  it('lists saved Sinks newest-saved first', async () => {
    const a = await createSink(userId, { categoryId, title: 'a' });
    const b = await createSink(userId, { categoryId, title: 'b' });
    await addBookmark(userId, a.id);
    await new Promise((r) => setTimeout(r, 5));
    await addBookmark(userId, b.id);

    const ids = await getMyBookmarkSinkIds(userId);
    expect(ids).toEqual([b.id, a.id]);
  });

  it('unsaves a Sink', async () => {
    const sink = await createSink(userId, { categoryId, title: 't' });
    await addBookmark(userId, sink.id);
    await removeBookmark(userId, sink.id);

    const saved = await getMyBookmarks(userId);
    expect(saved).toHaveLength(0);
  });

  it('unsaving a Sink that was never saved is a no-op', async () => {
    const sink = await createSink(userId, { categoryId, title: 't' });
    await expect(removeBookmark(userId, sink.id)).resolves.toBeUndefined();
  });

  it('throws 404 when saving a missing Sink', async () => {
    await expect(
      addBookmark(userId, '00000000-0000-0000-0000-000000000000'),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('excludes soft-deleted Sinks from the saved list', async () => {
    const sink = await createSink(userId, { categoryId, title: 'gone' });
    await addBookmark(userId, sink.id);
    await prisma.sink.update({
      where: { id: sink.id },
      data: { deletedAt: new Date() },
    });

    const saved = await getMyBookmarks(userId);
    expect(saved).toHaveLength(0);
  });

  it('surfaces saved ids in the vote-hydration payload', async () => {
    const sink = await createSink(userId, { categoryId, title: 't' });
    await addBookmark(userId, sink.id);

    const state = await getMyVoteState(userId);
    expect(state.bookmarks).toContain(sink.id);
  });
});
