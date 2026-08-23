/**
 * Tests for the sink service — against the isolated sinkedin_test DB.
 * Covers creation, the category-conditional rules, privacy, and the feed.
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import {
  createSink,
  deleteSink,
  getFeed,
  updateSink,
} from './sinks.service.js';

// Test fixtures created in beforeEach.
let userId: string;
let discussionId: string; // allowsPoll, no company/conclusion
let interviewId: string; // showsCompany + showsConclusion
let pollId: string; // requiresPoll

beforeEach(async () => {
  // Order matters for FKs: clear children before parents.
  await prisma.commentVote.deleteMany();
  await prisma.comment.deleteMany();
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
  await prisma.commentVote.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.pollOption.deleteMany();
  await prisma.sink.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();
  await prisma.$disconnect();
});

describe('getFeed — top comment preview', () => {
  it('previews the highest-scored top-level comment', async () => {
    const sink = await createSink(userId, {
      categoryId: discussionId,
      title: 'has comments',
    });
    await prisma.comment.create({
      data: { sinkId: sink.id, userId, body: 'low' },
    });
    await prisma.comment.create({
      data: { sinkId: sink.id, userId, body: 'high', score: 3 },
    });
    const { sinks } = await getFeed({});
    const found = sinks.find((s) => s.id === sink.id)!;
    expect(found.topComment?.body).toBe('high');
    expect(found.topComment?.score).toBe(3);
  });

  it('shows the NEWEST comment when none are voted (score 0)', async () => {
    const sink = await createSink(userId, {
      categoryId: discussionId,
      title: 'unvoted',
    });
    await prisma.comment.create({
      data: { sinkId: sink.id, userId, body: 'first' },
    });
    await new Promise((r) => setTimeout(r, 5));
    await prisma.comment.create({
      data: { sinkId: sink.id, userId, body: 'newest' },
    });
    const { sinks } = await getFeed({});
    const found = sinks.find((s) => s.id === sink.id)!;
    expect(found.topComment?.body).toBe('newest');
  });

  it('ignores replies — only top-level comments preview', async () => {
    const sink = await createSink(userId, {
      categoryId: discussionId,
      title: 'threaded',
    });
    const top = await prisma.comment.create({
      data: { sinkId: sink.id, userId, body: 'top-level' },
    });
    await prisma.comment.create({
      data: { sinkId: sink.id, userId, body: 'a reply', parentId: top.id, score: 99 },
    });
    const { sinks } = await getFeed({});
    const found = sinks.find((s) => s.id === sink.id)!;
    expect(found.topComment?.body).toBe('top-level');
  });

  it('topComment is null when a Sink has no comments', async () => {
    const sink = await createSink(userId, {
      categoryId: discussionId,
      title: 'silent',
    });
    const { sinks } = await getFeed({});
    const found = sinks.find((s) => s.id === sink.id)!;
    expect(found.topComment).toBeNull();
  });
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

  it("sort: 'top' orders by score (desc), independent of recency", async () => {
    const low = await createSink(userId, { categoryId: discussionId, title: 'low' });
    const high = await createSink(userId, { categoryId: discussionId, title: 'high' });
    const mid = await createSink(userId, { categoryId: discussionId, title: 'mid' });
    // Newest-first would be mid, high, low; by score it's high, mid, low.
    await prisma.sink.update({ where: { id: high.id }, data: { score: 10 } });
    await prisma.sink.update({ where: { id: mid.id }, data: { score: 5 } });
    await prisma.sink.update({ where: { id: low.id }, data: { score: -2 } });

    const { sinks } = await getFeed({ sort: 'top' });
    expect(sinks.map((s) => s.title)).toEqual(['high', 'mid', 'low']);
  });

  it("sort: 'top' paginates with a stable cursor across score ties", async () => {
    // Three Sinks all at the same score — the id tiebreak keeps paging stable.
    const a = await createSink(userId, { categoryId: discussionId, title: 'a' });
    const b = await createSink(userId, { categoryId: discussionId, title: 'b' });
    const c = await createSink(userId, { categoryId: discussionId, title: 'c' });
    for (const id of [a.id, b.id, c.id]) {
      await prisma.sink.update({ where: { id }, data: { score: 3 } });
    }

    const page1 = await getFeed({ sort: 'top', limit: 2 });
    expect(page1.sinks).toHaveLength(2);
    const page2 = await getFeed({ sort: 'top', limit: 2, cursor: page1.nextCursor! });
    // No duplicates and no skips: the two pages cover all three, once each.
    const seen = [...page1.sinks, ...page2.sinks].map((s) => s.title).sort();
    expect(seen).toEqual(['a', 'b', 'c']);
  });
});

describe('updateSink', () => {
  it('lets the author edit title, body, and image', async () => {
    const sink = await createSink(userId, {
      categoryId: discussionId,
      title: 'before',
      body: 'old body',
    });
    const updated = await updateSink(userId, sink.id, {
      title: 'after',
      body: 'new body',
      imageUrl: 'https://example.com/x.png',
    });
    expect(updated.title).toBe('after');
    expect(updated.body).toBe('new body');
    expect(updated.imageUrl).toBe('https://example.com/x.png');
  });

  it('clears a nullable field when passed null', async () => {
    const sink = await createSink(userId, {
      categoryId: discussionId,
      title: 't',
      body: 'has body',
    });
    const updated = await updateSink(userId, sink.id, { body: null });
    expect(updated.body).toBeNull();
  });

  it('ignores company/conclusion when the category does not show them', async () => {
    const sink = await createSink(userId, { categoryId: discussionId, title: 't' });
    const updated = await updateSink(userId, sink.id, {
      company: 'ShouldBeIgnored',
      conclusion: 'REJECTED',
    });
    expect(updated.company).toBeNull();
    expect(updated.conclusion).toBeNull();
  });

  it('requires conclusionOther when conclusion becomes OTHER', async () => {
    const sink = await createSink(userId, { categoryId: interviewId, title: 't' });
    await expect(
      updateSink(userId, sink.id, { conclusion: 'OTHER' }),
    ).rejects.toThrow(/conclusionOther/);
  });

  it('clears conclusionOther when moving off OTHER', async () => {
    const sink = await createSink(userId, {
      categoryId: interviewId,
      title: 't',
      conclusion: 'OTHER',
      conclusionOther: 'weird',
    });
    const updated = await updateSink(userId, sink.id, { conclusion: 'GHOSTED' });
    expect(updated.conclusion).toBe('GHOSTED');
    expect(updated.conclusionOther).toBeNull();
  });

  it('rejects edits from a non-author (403)', async () => {
    const other = await prisma.user.create({
      data: { supabaseUserId: 'seed:other', handle: 'Other_User_002' },
    });
    const sink = await createSink(userId, { categoryId: discussionId, title: 't' });
    await expect(
      updateSink(other.id, sink.id, { title: 'hijacked' }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 404 for a missing Sink', async () => {
    await expect(
      updateSink(userId, '00000000-0000-0000-0000-000000000000', { title: 'x' }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('deleteSink', () => {
  it('soft-deletes the author\'s Sink so it leaves the feed', async () => {
    const sink = await createSink(userId, { categoryId: discussionId, title: 'bye' });
    await deleteSink(userId, sink.id);

    const row = await prisma.sink.findUnique({ where: { id: sink.id } });
    expect(row?.deletedAt).not.toBeNull();

    const { sinks } = await getFeed({});
    expect(sinks.find((s) => s.id === sink.id)).toBeUndefined();
  });

  it('rejects deletes from a non-author (403)', async () => {
    const other = await prisma.user.create({
      data: { supabaseUserId: 'seed:other', handle: 'Other_User_002' },
    });
    const sink = await createSink(userId, { categoryId: discussionId, title: 't' });
    await expect(deleteSink(other.id, sink.id)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('throws 404 for a missing Sink', async () => {
    await expect(
      deleteSink(userId, '00000000-0000-0000-0000-000000000000'),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
