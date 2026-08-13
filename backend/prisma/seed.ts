/**
 * Category seed — the 12 starter categories from the technical spec
 * (docs/SinkedIn_Tech_Spec_Phase0_1.md, "The category set").
 *
 * WHY SEED THIS: every Sink must reference a Category, and the category's
 * config flags (showsCompany / showsConclusion / allowsPoll / requiresPoll)
 * drive which optional fields the compose form reveals. Categories are DATA,
 * not code — so they live in the table and can be edited/extended freely
 * without touching source.
 *
 * IDEMPOTENT: uses `upsert` keyed on the unique `slug`, so running the seed
 * repeatedly updates existing rows instead of creating duplicates. Safe to run
 * after every migration or in CI.
 *
 * Run with:  npx prisma db seed
 */

import { PrismaClient } from '@prisma/client';

// A standalone client for the seed process. The script connects, writes, and
// disconnects — it does not share the app's runtime singleton because it runs
// as its own short-lived process.
const prisma = new PrismaClient();

/**
 * The canonical starter categories.
 *
 * Config flags map directly to the spec's table:
 *   - showsCompany     → compose form reveals the free-text `company` field
 *   - showsConclusion  → reveals the `conclusion` enum selector
 *   - allowsPoll       → an optional poll may be attached
 *   - requiresPoll     → a poll is mandatory (implies allowsPoll = true)
 *
 * `color` is a hex token for the CategoryPill; these are starting values and
 * can be tuned later — they are data, not logic.
 */
const categories: Array<{
  name: string;
  slug: string;
  color: string;
  showsCompany: boolean;
  showsConclusion: boolean;
  allowsPoll: boolean;
  requiresPoll: boolean;
}> = [
  // name                    slug                     color      company  concl.  allows  requires
  { name: 'Interview Experience', slug: 'interview-experience', color: '#6366F1', showsCompany: true,  showsConclusion: true,  allowsPoll: false, requiresPoll: false },
  { name: 'Rejection',            slug: 'rejection',            color: '#EF4444', showsCompany: true,  showsConclusion: true,  allowsPoll: false, requiresPoll: false },
  { name: 'Ghosted',              slug: 'ghosted',              color: '#64748B', showsCompany: true,  showsConclusion: false, allowsPoll: false, requiresPoll: false },
  { name: 'Offer',                slug: 'offer',                color: '#22C55E', showsCompany: true,  showsConclusion: true,  allowsPoll: false, requiresPoll: false },
  { name: 'Salary',               slug: 'salary',               color: '#F59E0B', showsCompany: true,  showsConclusion: false, allowsPoll: false, requiresPoll: false },
  { name: 'Layoff',               slug: 'layoff',               color: '#DC2626', showsCompany: true,  showsConclusion: false, allowsPoll: false, requiresPoll: false },
  { name: 'Poll',                 slug: 'poll',                 color: '#8B5CF6', showsCompany: false, showsConclusion: false, allowsPoll: true,  requiresPoll: true  },
  { name: 'Advice',               slug: 'advice',               color: '#0EA5E9', showsCompany: false, showsConclusion: false, allowsPoll: true,  requiresPoll: false },
  { name: 'Discussion',           slug: 'discussion',           color: '#14B8A6', showsCompany: false, showsConclusion: false, allowsPoll: true,  requiresPoll: false },
  { name: 'Rant',                 slug: 'rant',                 color: '#F97316', showsCompany: false, showsConclusion: false, allowsPoll: false, requiresPoll: false },
  { name: 'Meme',                 slug: 'meme',                 color: '#EC4899', showsCompany: false, showsConclusion: false, allowsPoll: false, requiresPoll: false },
  { name: 'Resource',             slug: 'resource',             color: '#3B82F6', showsCompany: false, showsConclusion: false, allowsPoll: false, requiresPoll: false },
];

async function main() {
  // Upsert each category keyed on its unique slug: update if it exists,
  // create if it doesn't. This makes the seed safe to re-run any time.
  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    });
  }

  const count = await prisma.category.count();
  // eslint-disable-next-line no-console
  console.log(`Seeded categories. Total in table: ${count}`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Category seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
