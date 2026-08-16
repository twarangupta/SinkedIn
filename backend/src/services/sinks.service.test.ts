/**
 * Tests for the sink service — against the isolated sinkedin_test DB.
 * Covers creation, the category-conditional rules, privacy, and the feed.
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { createSink, getFeed } from './sinks.service.js';

// Test fixtures created in beforeEach.
let userId: string;
let discussionId: string; // allowsPoll, no company/conclusion
let interviewId: string; // showsCompany + showsConclusion
let pollId: string; // requiresPoll

beforeEach(async () => {
  // Order matters for FKs: clear children before parents.
  await prisma.pollOption.deleteMany();
  await prisma.sink.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();

  const user = await prisma.user.create({
    data: { supabaseUserId: 'seed:test', handle: 'Test_User_001' },
  });
  userId = user.id;

  const [discussion, interview, poll] = await Promise.all([
    prisma.category.create({
      data: { name: 'Discussion', slug: 'discussion', color: '#14B8A6', allowsPoll: true },
    }),
    prisma.category.create({
      data: {
        name: 'Interview Experience',
        slug: 'interview-experience',
        color: '#6366F1',
        showsCompany: true,
        showsConclusion: true,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Poll',
        slug: 'poll',
        color: '#8B5CF6',
        allowsPoll: true,
        requiresPoll: true,
      },
    }),
  ]);
  discussionId = discussion.id;
  interviewId = interview.id;
  pollId = poll.id;
});

afterAll(async () => {
  await prisma.pollOption.deleteMany();
  await prisma.sink.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();
  await prisma.$disconnect();
});

describe('createSink', () => {
  it('creates a basic Sink and exposes the author handle (not supabaseUserId)', async () => {
    const sink = await createSink(userId, {
      categoryId: discussionId,
      title: 'How many applications did it take?',
      body: 'Curious what normal looks like.',
    });

    expect(sink.title).toBe('How many applications did it take?');
    expect(sink.user.handle).toBe('Test_User_001');
    expect(sink.user).not.toHaveProperty('supabaseUserId');
    expect(sink.category.slug).toBe('discussion');
  });

  it('strips company/conclusion when the category does not show them', async () => {
    const sink = await createSink(userId, {
      categoryId: discussionId, // no company, no conclusion
      title: 'Discussion post',
      company: 'ShouldBeStripped',
      conclusion: 'REJECTED',
    });

    expect(sink.company).toBeNull();
    expect(sink.conclusion).toBeNull();
  });

  it('keeps company/conclusion when the category shows them', async () => {
    const sink = await createSink(userId, {
      categoryId: interviewId,
      title: 'Onsite loop',
      company: 'Globex',
      conclusion: 'GHOSTED',
    });

    expect(sink.company).toBe('Globex');
    expect(sink.conclusion).toBe('GHOSTED');
  });

  it('requires conclusionOther when conclusion is OTHER', async () => {
    await expect(
      createSink(userId, {
        categoryId: interviewId,
        title: 'Weird outcome',
        conclusion: 'OTHER',
      }),
    ).rejects.toThrow(/conclusionOther/);
  });

  it('requires a poll for a requiresPoll category', async () => {
    await expect(
      createSink(userId, { categoryId: pollId, title: 'Best/worst?' }),
    ).rejects.toThrow(/requires a poll/);
  });

  it('creates poll options for a poll category', async () => {
    const sink = await createSink(userId, {
      categoryId: pollId,
      title: 'Worst part of the hunt?',
      pollOptions: ['Ghosting', 'Take-homes', 'Endless rounds'],
    });

    expect(sink.pollOptions).toHaveLength(3);
    expect(sink.pollOptions.map((o) => o.label)).toEqual([
      'Ghosting',
      'Take-homes',
      'Endless rounds',
    ]);
  });

  it('rejects an unknown category', async () => {
    await expect(
      createSink(userId, {
        categoryId: '00000000-0000-0000-0000-000000000000',
        title: 'x',
      }),
    ).rejects.toThrow(/Category not found/);
  });
});

describe('getFeed', () => {
  it('returns newest first and can filter by category', async () => {
    await createSink(userId, { categoryId: discussionId, title: 'first' });
    await createSink(userId, { categoryId: interviewId, title: 'second' });

    const { sinks: all } = await getFeed({});
    expect(all.map((s) => s.title)).toEqual(['second', 'first']);

    const { sinks: onlyInterview } = await getFeed({
      categorySlug: 'interview-experience',
    });
    expect(onlyInterview.map((s) => s.title)).toEqual(['second']);
  });

  it('filters by author handle (for the profile page)', async () => {
    const other = await prisma.user.create({
      data: { supabaseUserId: 'seed:other', handle: 'Other_User_002' },
    });
    await createSink(userId, { categoryId: discussionId, title: 'mine-1' });
    await createSink(other.id, { categoryId: discussionId, title: 'theirs' });
    await createSink(userId, { categoryId: discussionId, title: 'mine-2' });

    const { sinks: mine } = await getFeed({ authorHandle: 'Test_User_001' });
    expect(mine.map((s) => s.title)).toEqual(['mine-2', 'mine-1']);

    const { sinks: theirs } = await getFeed({ authorHandle: 'Other_User_002' });
    expect(theirs.map((s) => s.title)).toEqual(['theirs']);
  });

  it('paginates with a cursor and stops when there are no more', async () => {
    await createSink(userId, { categoryId: discussionId, title: 'p1' });
    await createSink(userId, { categoryId: discussionId, title: 'p2' });
    await createSink(userId, { categoryId: discussionId, title: 'p3' });

    // Page 1 (size 2): newest two, plus a cursor pointing past them.
    const page1 = await getFeed({ limit: 2 });
    expect(page1.sinks.map((s) => s.title)).toEqual(['p3', 'p2']);
    expect(page1.nextCursor).toBe(page1.sinks[1].id);

    // Page 2: the remaining one, no further cursor.
    const page2 = await getFeed({ limit: 2, cursor: page1.nextCursor! });
    expect(page2.sinks.map((s) => s.title)).toEqual(['p1']);
    expect(page2.nextCursor).toBeNull();
  });
});
