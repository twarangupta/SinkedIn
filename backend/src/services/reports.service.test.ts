/**
 * Tests for the report service — against the isolated sinkedin_test DB.
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { createReport } from './reports.service.js';

let reporterId: string;
let sinkId: string;
let commentId: string;

async function clear() {
  await prisma.report.deleteMany();
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
  const author = await prisma.user.create({
    data: { supabaseUserId: 'seed:author', handle: 'Author_001' },
  });
  const reporter = await prisma.user.create({
    data: { supabaseUserId: 'seed:reporter', handle: 'Reporter_002' },
  });
  reporterId = reporter.id;
  const sink = await prisma.sink.create({
    data: { userId: author.id, categoryId: category.id, title: 'x' },
  });
  sinkId = sink.id;
  const comment = await prisma.comment.create({
    data: { userId: author.id, sinkId: sink.id, body: 'a comment' },
  });
  commentId = comment.id;
});

afterAll(async () => {
  await clear();
  await prisma.$disconnect();
});

describe('createReport', () => {
  it('files a report against a Sink', async () => {
    const res = await createReport(reporterId, 'SINK', sinkId, 'spam');
    expect(res).toEqual({ reported: true });
    expect(await prisma.report.count()).toBe(1);
  });

  it('files a report against a Comment (reason optional)', async () => {
    await createReport(reporterId, 'COMMENT', commentId);
    const row = await prisma.report.findFirst();
    expect(row?.targetType).toBe('COMMENT');
    expect(row?.reason).toBeNull();
  });

  it('is idempotent per user + target (no duplicate, no error)', async () => {
    await createReport(reporterId, 'SINK', sinkId);
    await createReport(reporterId, 'SINK', sinkId);
    expect(await prisma.report.count()).toBe(1);
  });

  it('rejects a report against a non-existent target', async () => {
    await expect(
      createReport(reporterId, 'SINK', '00000000-0000-0000-0000-000000000000'),
    ).rejects.toThrow(/no longer exists/i);
  });

  it('rejects a report against a soft-deleted Sink', async () => {
    await prisma.sink.update({
      where: { id: sinkId },
      data: { deletedAt: new Date() },
    });
    await expect(createReport(reporterId, 'SINK', sinkId)).rejects.toThrow();
  });
});
