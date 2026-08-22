/**
 * Tests for the comment service — threaded discussion, against sinkedin_test.
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import {
  createComment,
  getCommentsForSink,
  stepCommentVote,
} from './comments.service.js';

let userId: string;
let voterId: string;
let sinkId: string;
let otherSinkId: string;

async function clear() {
  await prisma.commentVote.deleteMany(); // children before parents (FK order)
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
  const voter = await prisma.user.create({
    data: { supabaseUserId: 'seed:v', handle: 'Voter_002' },
  });
  voterId = voter.id;
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

  it('exposes the cached comment score', async () => {
    const c = await createComment(userId, sinkId, 'scored');
    await stepCommentVote(voterId, c.id, 'UP');
    const [fetched] = await getCommentsForSink(sinkId);
    expect(fetched.score).toBe(1);
  });
});

describe('stepCommentVote', () => {
  it('buoys a comment: score 1, myVote BUOY', async () => {
    const c = await createComment(userId, sinkId, 'vote me');
    const res = await stepCommentVote(voterId, c.id, 'UP');
    expect(res).toEqual({ score: 1, myVote: 'BUOY' });
  });

  it('clamps: a second UP on an existing Buoy is a no-op (stays +1)', async () => {
    const c = await createComment(userId, sinkId, 'clamp');
    await stepCommentVote(voterId, c.id, 'UP');
    const res = await stepCommentVote(voterId, c.id, 'UP');
    expect(res).toEqual({ score: 1, myVote: 'BUOY' });
  });

  it('steps one at a time: Buoy → none → Anchor (never a 2-swing)', async () => {
    const c = await createComment(userId, sinkId, 'stepper');
    await stepCommentVote(voterId, c.id, 'UP'); // → BUOY (+1)
    const off = await stepCommentVote(voterId, c.id, 'DOWN'); // → none (0)
    expect(off).toEqual({ score: 0, myVote: null });
    const anchor = await stepCommentVote(voterId, c.id, 'DOWN'); // → ANCHOR (-1)
    expect(anchor).toEqual({ score: -1, myVote: 'ANCHOR' });
  });

  it('counts one vote per user per comment (two users → +2)', async () => {
    const c = await createComment(userId, sinkId, 'popular');
    await stepCommentVote(voterId, c.id, 'UP');
    const res = await stepCommentVote(userId, c.id, 'UP');
    expect(res.score).toBe(2);
  });

  it('rejects a vote on a missing comment', async () => {
    await expect(
      stepCommentVote(voterId, '00000000-0000-0000-0000-000000000000', 'UP'),
    ).rejects.toThrow(/Comment not found/);
  });
});
