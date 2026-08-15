/**
 * Tests for the comment service — threaded discussion, against sinkedin_test.
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { createComment, getCommentsForSink } from './comments.service.js';

let userId: string;
let sinkId: string;
let otherSinkId: string;

async function clear() {
  await prisma.comment.deleteMany();
  await prisma.sink.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();
}

beforeEach(async () => {
  await clear();
  const category = await prisma.category.create({
    data: { name: 'Rant', slug: 'rant', color: '#F97316' },
  });
  const user = await prisma.user.create({
    data: { supabaseUserId: 'seed:c', handle: 'Commenter_001' },
  });
  userId = user.id;
  const sink = await prisma.sink.create({
    data: { userId: user.id, categoryId: category.id, title: 'x' },
  });
  sinkId = sink.id;
  const other = await prisma.sink.create({
    data: { userId: user.id, categoryId: category.id, title: 'y' },
  });
  otherSinkId = other.id;
});

afterAll(async () => {
  await clear();
  await prisma.$disconnect();
});

describe('createComment', () => {
  it('creates a top-level comment; exposes handle, not supabaseUserId', async () => {
    const comment = await createComment(userId, sinkId, 'first take');
    expect(comment.body).toBe('first take');
    expect(comment.parentId).toBeNull();
    expect(comment.user.handle).toBe('Commenter_001');
    expect(comment.user).not.toHaveProperty('supabaseUserId');
  });

  it('creates a reply under a parent on the same Sink', async () => {
    const parent = await createComment(userId, sinkId, 'parent');
    const reply = await createComment(userId, sinkId, 'reply', parent.id);
    expect(reply.parentId).toBe(parent.id);
  });

  it('rejects a reply whose parent belongs to a different Sink', async () => {
    const parent = await createComment(userId, otherSinkId, 'elsewhere');
    await expect(
      createComment(userId, sinkId, 'bad reply', parent.id),
    ).rejects.toThrow(/Parent comment not found/);
  });

  it('rejects a comment on a missing Sink', async () => {
    await expect(
      createComment(userId, '00000000-0000-0000-0000-000000000000', 'hi'),
    ).rejects.toThrow(/Sink not found/);
  });
});

describe('getCommentsForSink', () => {
  it('returns the Sink comments oldest first', async () => {
    await createComment(userId, sinkId, 'one');
    await createComment(userId, sinkId, 'two');
    await createComment(userId, otherSinkId, 'other');

    const comments = await getCommentsForSink(sinkId);
    expect(comments.map((c) => c.body)).toEqual(['one', 'two']);
  });
});
