/**
 * Tests for the vote service — Buoys/Anchors and the cached score.
 * Against the isolated sinkedin_test DB.
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import {
  castVote,
  getMyVoteState,
  removeVote,
  stepVote,
} from './votes.service.js';

let userA: string;
let userB: string;
let sinkId: string;

async function clear() {
  // Children before parents (FK-safe): poll votes/options depend on sinks.
  await prisma.pollVote.deleteMany();
  await prisma.pollOption.deleteMany();
  await prisma.vote.deleteMany();
  await prisma.sink.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();
}

beforeEach(async () => {
  await clear();
  const category = await prisma.category.create({
    data: { name: 'Rant', slug: 'rant', color: '#F97316' },
  });
  const a = await prisma.user.create({
    data: { supabaseUserId: 'seed:a', handle: 'User_A_001' },
  });
  const b = await prisma.user.create({
    data: { supabaseUserId: 'seed:b', handle: 'User_B_002' },
  });
  userA = a.id;
  userB = b.id;
  const sink = await prisma.sink.create({
    data: { userId: a.id, categoryId: category.id, title: 'x' },
  });
  sinkId = sink.id;
});

afterAll(async () => {
  await clear();
  await prisma.$disconnect();
});

describe('castVote / removeVote', () => {
  it('a buoy sets the cached score to +1', async () => {
    const result = await castVote(userA, sinkId, 'BUOY');
    expect(result).toEqual({ score: 1, myVote: 'BUOY' });
    const sink = await prisma.sink.findUnique({ where: { id: sinkId } });
    expect(sink?.score).toBe(1);
  });

  it('a buoy and an anchor from two users net to 0', async () => {
    await castVote(userA, sinkId, 'BUOY');
    const result = await castVote(userB, sinkId, 'ANCHOR');
    expect(result.score).toBe(0);
  });

  it('changing your own vote does not double count (one per user)', async () => {
    await castVote(userA, sinkId, 'BUOY'); // +1
    const result = await castVote(userA, sinkId, 'ANCHOR'); // flips to -1
    expect(result.score).toBe(-1);
    expect(await prisma.vote.count({ where: { sinkId } })).toBe(1);
  });

  it('removing a vote restores the score', async () => {
    await castVote(userA, sinkId, 'BUOY');
    const result = await removeVote(userA, sinkId);
    expect(result).toEqual({ score: 0, myVote: null });
  });

  it('voting on a missing sink throws', async () => {
    await expect(
      castVote(userA, '00000000-0000-0000-0000-000000000000', 'BUOY'),
    ).rejects.toThrow(/not found/);
  });
});

describe('stepVote (clamped to [-1, +1])', () => {
  it('UP from none casts a Buoy (+1)', async () => {
    expect(await stepVote(userA, sinkId, 'UP')).toEqual({
      score: 1,
      myVote: 'BUOY',
    });
  });

  it('DOWN from none casts an Anchor (-1)', async () => {
    expect(await stepVote(userA, sinkId, 'DOWN')).toEqual({
      score: -1,
      myVote: 'ANCHOR',
    });
  });

  it('DOWN from a Buoy lands on 0, never -1 (the reported bug)', async () => {
    await stepVote(userA, sinkId, 'UP'); // Buoy → score 1
    const result = await stepVote(userA, sinkId, 'DOWN');
    expect(result).toEqual({ score: 0, myVote: null }); // 1 → 0, NOT 1 → -1
    expect(await prisma.vote.count({ where: { sinkId, userId: userA } })).toBe(0);
  });

  it('UP from an Anchor lands on 0', async () => {
    await stepVote(userA, sinkId, 'DOWN'); // Anchor
    expect(await stepVote(userA, sinkId, 'UP')).toEqual({
      score: 0,
      myVote: null,
    });
  });

  it('UP clamps at Buoy, DOWN clamps at Anchor (no wrap)', async () => {
    await stepVote(userA, sinkId, 'UP'); // Buoy
    expect(await stepVote(userA, sinkId, 'UP')).toEqual({
      score: 1,
      myVote: 'BUOY',
    }); // stays Buoy
    await stepVote(userA, sinkId, 'DOWN'); // → none
    await stepVote(userA, sinkId, 'DOWN'); // → Anchor
    expect(await stepVote(userA, sinkId, 'DOWN')).toEqual({
      score: -1,
      myVote: 'ANCHOR',
    }); // stays Anchor
  });

  it('a single user never shifts the score by more than 1 per click', async () => {
    await castVote(userB, sinkId, 'BUOY'); // someone else already buoyed → score 1
    const a1 = await stepVote(userA, sinkId, 'UP'); // score 2
    expect(a1.score).toBe(2);
    const a2 = await stepVote(userA, sinkId, 'DOWN'); // 2 → 1 (A back to none), not 2 → 0
    expect(a2.score).toBe(1);
    expect(a2.myVote).toBeNull();
  });
});

describe('getMyVoteState', () => {
  it('returns the user’s own buoy/anchor votes (and nothing for others)', async () => {
    await castVote(userA, sinkId, 'BUOY');

    const mine = await getMyVoteState(userA);
    expect(mine.votes).toEqual([{ sinkId, value: 'BUOY' }]);
    expect(mine.pollVotes).toEqual([]);

    const theirs = await getMyVoteState(userB);
    expect(theirs.votes).toEqual([]);
  });

  it('maps poll votes back to their Sink id', async () => {
    // A poll Sink with one option, voted by userA.
    const poll = await prisma.sink.create({
      data: {
        userId: userA,
        categoryId: (await prisma.category.findFirstOrThrow()).id,
        title: 'poll',
        pollOptions: { create: [{ label: 'a', position: 0 }] },
      },
      select: { id: true, pollOptions: { select: { id: true } } },
    });
    const optionId = poll.pollOptions[0].id;
    await prisma.pollVote.create({ data: { userId: userA, pollOptionId: optionId } });

    const mine = await getMyVoteState(userA);
    expect(mine.pollVotes).toEqual([{ sinkId: poll.id, pollOptionId: optionId }]);
  });
});
