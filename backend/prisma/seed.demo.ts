/**
 * Seed DEMO (removable) data — sample users + Sinks so the feed looks alive
 * during development. See prisma/demo-data.ts for the marker / removal design.
 *
 * Idempotent: purges any existing demo data first, then recreates it, so
 * re-running never duplicates. Requires categories to already exist
 * (run `npm run db:seed` first).
 *
 * Run with:  npm run db:seed:demo
 * Remove with: npm run db:unseed:demo
 */

import { PrismaClient } from '@prisma/client';
import { demoSinks, demoUsers, purgeDemoData } from './demo-data.js';

const prisma = new PrismaClient();

async function main() {
  // Start clean so re-runs don't stack duplicates.
  await purgeDemoData(prisma);

  // Categories must exist first (demo Sinks reference them by slug).
  const categories = await prisma.category.findMany({
    select: { id: true, slug: true },
  });
  if (categories.length === 0) {
    throw new Error(
      'No categories found. Run `npm run db:seed` before seeding demo data.',
    );
  }
  const categoryIdBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  // Create the demo users and keep their generated ids by index.
  const createdUserIds: string[] = [];
  for (const user of demoUsers) {
    const created = await prisma.user.create({ data: user });
    createdUserIds.push(created.id);
  }

  // Create each demo Sink, wiring author + category, plus poll options if any.
  for (const sink of demoSinks) {
    const categoryId = categoryIdBySlug.get(sink.categorySlug);
    if (!categoryId) {
      throw new Error(`Demo Sink references unknown category: ${sink.categorySlug}`);
    }

    await prisma.sink.create({
      data: {
        userId: createdUserIds[sink.authorIndex],
        categoryId,
        title: sink.title,
        body: sink.body,
        company: sink.company,
        conclusion: sink.conclusion,
        // Attach poll options (nested create) when the demo Sink defines them.
        pollOptions: sink.poll
          ? {
              create: sink.poll.map((label, index) => ({
                label,
                position: index,
              })),
            }
          : undefined,
      },
    });
  }

  const sinkCount = await prisma.sink.count();
  // eslint-disable-next-line no-console
  console.log(
    `Seeded demo data: ${createdUserIds.length} users, ${demoSinks.length} sinks. Total sinks in table: ${sinkCount}.`,
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
