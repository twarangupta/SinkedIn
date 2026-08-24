/**
 * Seed DEMO (removable) data — realistic users + Sinks + comments + votes +
 * saves so the feed looks alive during development. See prisma/demo-data.ts for
 * the marker / removal design and the content-integrity note.
 *
 * Idempotent: purges any existing demo data first, then recreates it, so
 * re-running never duplicates. Requires categories to already exist
 * (run `npm run db:seed` first).
 *
 * Run with:   npm run db:seed:demo
 * Remove with: npm run db:unseed:demo
 */

import { PrismaClient, VoteValue } from '@prisma/client';
import { demoSinks, demoUsers, purgeDemoData } from './demo-data.js';

const prisma = new PrismaClient();
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Rotate a copy of the array left by `offset` (for spreading voters around). */
function rotated<T>(arr: T[], offset: number): T[] {
  const n = arr.length;
  const k = ((offset % n) + n) % n;
  return [...arr.slice(k), ...arr.slice(0, k)];
}

async function main() {
  await purgeDemoData(prisma); // start clean so re-runs never stack

  const categories = await prisma.category.findMany({
    select: { id: true, slug: true },
  });
  if (categories.length === 0) {
    throw new Error(
      'No categories found. Run `npm run db:seed` before seeding demo data.',
    );
  }
  const categoryIdBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  // Create the demo users, keeping their generated ids by index.
  const userIds: string[] = [];
  for (const user of demoUsers) {
    const created = await prisma.user.create({ data: user });
    userIds.push(created.id);
  }
  const n = userIds.length;
  const now = Date.now();

  // Link demo sinks to the centralized Company entity (creating it if missing),
  // so the feed shows real logos and Phase-3 company pages include demo content.
  const companyIdByName = new Map<string, string>();
  const resolveCompany = async (name?: string): Promise<string | null> => {
    if (!name) return null;
    const key = name.trim().toLowerCase().replace(/\s+/g, ' ');
    const cached = companyIdByName.get(key);
    if (cached) return cached;
    const found =
      (await prisma.company.findUnique({ where: { normalizedName: key } })) ??
      (await prisma.company.create({
        data: { name: name.trim(), normalizedName: key },
      }));
    companyIdByName.set(key, found.id);
    return found.id;
  };

  let totalVotes = 0;
  let totalComments = 0;
  let totalBookmarks = 0;

  for (let i = 0; i < demoSinks.length; i++) {
    const sink = demoSinks[i];
    const categoryId = categoryIdBySlug.get(sink.categorySlug);
    if (!categoryId) {
      throw new Error(`Demo Sink references unknown category: ${sink.categorySlug}`);
    }

    const sinkCreatedAt = new Date(now - sink.daysAgo * DAY);
    const buoys = Math.min(sink.buoys ?? 0, n);
    const anchors = Math.min(sink.anchors ?? 0, Math.max(0, n - buoys));

    const created = await prisma.sink.create({
      data: {
        userId: userIds[sink.authorIndex],
        categoryId,
        title: sink.title,
        body: sink.body,
        company: sink.company,
        companyId: await resolveCompany(sink.company),
        conclusion: sink.conclusion,
        score: buoys - anchors, // cached score matches the votes we create
        createdAt: sinkCreatedAt,
        pollOptions: sink.poll
          ? { create: sink.poll.map((label, index) => ({ label, position: index })) }
          : undefined,
      },
      select: { id: true },
    });

    // --- Votes: distinct users, rotated per-sink so voters vary across the feed.
    const voters = rotated(userIds, i * 3);
    const buoyUsers = voters.slice(0, buoys);
    const anchorUsers = voters.slice(buoys, buoys + anchors);
    for (const uid of buoyUsers) {
      await prisma.vote.create({
        data: { sinkId: created.id, userId: uid, value: VoteValue.BUOY },
      });
    }
    for (const uid of anchorUsers) {
      await prisma.vote.create({
        data: { sinkId: created.id, userId: uid, value: VoteValue.ANCHOR },
      });
    }
    totalVotes += buoyUsers.length + anchorUsers.length;

    // --- Comments (+ one level of replies). createdAt clamped to the past.
    for (const c of sink.comments ?? []) {
      const cAt = new Date(
        Math.min(sinkCreatedAt.getTime() + (c.hoursAfter ?? 5) * HOUR, now - HOUR),
      );
      const parent = await prisma.comment.create({
        data: {
          sinkId: created.id,
          userId: userIds[c.authorIndex],
          body: c.body,
          score: c.score ?? 0,
          createdAt: cAt,
        },
        select: { id: true, createdAt: true },
      });
      totalComments += 1;
      for (const r of c.replies ?? []) {
        const rAt = new Date(
          Math.min(parent.createdAt.getTime() + (r.hoursAfter ?? 3) * HOUR, now - HOUR / 2),
        );
        await prisma.comment.create({
          data: {
            sinkId: created.id,
            userId: userIds[r.authorIndex],
            body: r.body,
            parentId: parent.id,
            score: r.score ?? 0,
            createdAt: rAt,
          },
        });
        totalComments += 1;
      }
    }

    // --- Saves: distinct users bookmark the Sink (rotated so it is not always
    // the same handful).
    const saves = Math.min(sink.saves ?? 0, n);
    const savers = rotated(userIds, i * 5 + 1).slice(0, saves);
    for (const uid of savers) {
      await prisma.bookmark.create({ data: { sinkId: created.id, userId: uid } });
    }
    totalBookmarks += savers.length;
  }

  const sinkCount = await prisma.sink.count();
  // eslint-disable-next-line no-console
  console.log(
    `Seeded demo data: ${userIds.length} users, ${demoSinks.length} sinks, ` +
      `${totalComments} comments, ${totalVotes} votes, ${totalBookmarks} saves. ` +
      `Total sinks in table: ${sinkCount}.`,
  );
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Demo seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
