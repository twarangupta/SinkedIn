/**
 * Tests for the poll-vote service — casting, moving, toggling off, and the
 * "one vote per poll (not per option)" rule. Against the isolated sinkedin_test DB.
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { castPollVote } from './pollVotes.service.js';

let userA: string;
let userB: string;
let sinkId: string;
let optA: string; // option 0
let optB: string; // option 1

async function clear() {
  await prisma.pollVote.deleteMany();
  await prisma.pollOption.deleteMany();
  await prisma.sink.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();
}

/** Current vote count for an option. */
async function votes(optionId: string): Promise<number> {
  return prisma.pollVote.count({ where: { pollOptionId: optionId } });
}

beforeEach(async () => {
  await clear();
  const category = await prisma.category.create({
    data: { name: 'Poll', slug: 'poll', color: '#8B5CF6', allowsPoll: true, requiresPoll: true },
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
    data: {
      userId: a.id,
      categoryId: category.id,
      title: 'Best/worst part of the hunt?',
      pollOptions: {
        create: [
          { label: 'The ghosting', position: 0 },
          { label: 'The take-homes', position: 1 },
        ],
      },
    },
    select: { id: true, pollOptions: { select: { id: true, position: true } } },
  });
  sinkId = sink.id;
  optA = sink.pollOptions.find((o) => o.position === 0)!.id;
  optB = sink.pollOptions.find((o) => o.position === 1)!.id;
});

afterAll(async () => {
  await clear();
  await prisma.$disconnect();
});

describe('castPollVote', () => {
  it('casts a vote and reports it as the caller’s choice', async () => {
    const result = await castPollVote(userA, sinkId, optA);
    expect(result.myPollVote).toBe(optA);
    expect(await votes(optA)).toBe(1);
    expect(await votes(optB)).toBe(0);
  });

  it('moves the vote to another option (one vote per poll)', async () => {
    await castPollVote(userA, sinkId, optA);
    const result = await castPollVote(userA, sinkId, optB);
    expect(result.myPollVote).toBe(optB);
    expect(await votes(optA)).toBe(0);
    expect(await votes(optB)).toBe(1);
    // Exactly one row for this user across the whole poll.
    expect(await prisma.pollVote.count({ where: { userId: userA } })).toBe(1);
  });

  it('toggles off when re-voting the option already held', async () => {
    await castPollVote(userA, sinkId, optA);
    const result = await castPollVote(userA, sinkId, optA);
    expect(result.myPollVote).toBeNull();
    expect(await votes(optA)).toBe(0);
    expect(await prisma.pollVote.count({ where: { userId: userA } })).toBe(0);
  });

  it('counts votes from two different users independently', async () => {
    await castPollVote(userA, sinkId, optA);
    await castPollVote(userB, sinkId, optA);
    const result = await castPollVote(userB, sinkId, optB); // B moves to optB
    expect(await votes(optA)).toBe(1); // only A left
    expect(await votes(optB)).toBe(1); // B now here
    expect(result.myPollVote).toBe(optB);
  });

  it('returns fresh option counts in position order', async () => {
    await castPollVote(userA, sinkId, optA);
    const result = await castPollVote(userB, sinkId, optA);
    const counts = result.pollOptions.map((o) => o._count.votes);
    expect(result.pollOptions.map((o) => o.position)).toEqual([0, 1]);
    expect(counts).toEqual([2, 0]);
  });

  it('rejects an option that is not part of this Sink’s poll', async () => {
    // Make a second sink with its own option.
    const category = await prisma.category.findFirstOrThrow();
    const other = await prisma.sink.create({
      data: {
        userId: userA,
        categoryId: category.id,
        title: 'other',
        pollOptions: { create: [{ label: 'x', position: 0 }] },
      },
      select: { pollOptions: { select: { id: true } } },
    });
    const foreignOption = other.pollOptions[0].id;
    await expect(castPollVote(userA, sinkId, foreignOption)).rejects.toThrow(
      /does not belong/,
    );
  });

  it('throws on a missing sink', async () => {
    await expect(
      castPollVote(userA, '00000000-0000-0000-0000-000000000000', optA),
    ).rejects.toThrow(/not found/);
  });
});
