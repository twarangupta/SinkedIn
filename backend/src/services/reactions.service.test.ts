/**
 * Tests for the reaction service — one-per-user toggle/switch, the cached
 * per-kind counts, and the category-config validation.
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { toggleReaction, getMyReactions } from './reactions.service.js';

let userId: string;
let otherId: string;
let sinkId: string;

beforeEach(async () => {
  await prisma.reaction.deleteMany();
  await prisma.sink.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  const [u, o] = await Promise.all([
    prisma.user.create({ data: { supabaseUserId: 'seed:r1', handle: 'React_User_001' } }),
    prisma.user.create({ data: { supabaseUserId: 'seed:r2', handle: 'React_User_002' } }),
  ]);
  userId = u.id;
  otherId = o.id;

  const category = await prisma.category.create({
    data: {
      name: 'Rant',
      slug: 'rant',
      color: '#fff',
      reactions: [
        { key: 'BEEN_THERE', emoji: '🫡', label: 'Been there' },
        { key: 'IKR', emoji: '💯', label: 'IKR' },
      ],
    },
  });
  const sink = await prisma.sink.create({
    data: { title: 't', body: 'b', userId, categoryId: category.id },
  });
  sinkId = sink.id;
});

afterAll(async () => {
  await prisma.reaction.deleteMany();
  await prisma.sink.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('toggleReaction', () => {
  it('sets a reaction and caches the count', async () => {
    const res = await toggleReaction(userId, sinkId, 'BEEN_THERE');
    expect(res.myReaction).toBe('BEEN_THERE');
    expect(res.reactionCounts).toEqual({ BEEN_THERE: 1 });

    const sink = await prisma.sink.findUnique({ where: { id: sinkId } });
    expect(sink?.reactionCounts).toEqual({ BEEN_THERE: 1 });
  });

  it('removes the reaction when the same kind is tapped again', async () => {
    await toggleReaction(userId, sinkId, 'IKR');
    const res = await toggleReaction(userId, sinkId, 'IKR');
    expect(res.myReaction).toBeNull();
    expect(res.reactionCounts).toEqual({});
  });

  it('switches the reaction to a different kind (one per user)', async () => {
    await toggleReaction(userId, sinkId, 'BEEN_THERE');
    const res = await toggleReaction(userId, sinkId, 'IKR');
    expect(res.myReaction).toBe('IKR');
    expect(res.reactionCounts).toEqual({ IKR: 1 });
    expect(await prisma.reaction.count({ where: { userId, sinkId } })).toBe(1);
  });

  it('tallies distinct users on the same kind', async () => {
    await toggleReaction(userId, sinkId, 'BEEN_THERE');
    const res = await toggleReaction(otherId, sinkId, 'BEEN_THERE');
    expect(res.reactionCounts).toEqual({ BEEN_THERE: 2 });
  });

  it('rejects a kind the category does not offer', async () => {
    await expect(toggleReaction(userId, sinkId, 'NOPE')).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});

describe('getMyReactions', () => {
  it("returns the caller's reaction keyed by sink id", async () => {
    await toggleReaction(userId, sinkId, 'IKR');
    const map = await getMyReactions(userId, [sinkId]);
    expect(map.get(sinkId)).toBe('IKR');
    // Another user has none here.
    expect((await getMyReactions(otherId, [sinkId])).size).toBe(0);
  });
});
