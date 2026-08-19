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
  description: string;
  showsCompany: boolean;
  showsConclusion: boolean;
  allowsPoll: boolean;
  requiresPoll: boolean;
}> = [
  {
    name: 'Interview Experience',
    slug: 'interview-experience',
    color: '#6366F1',
    description: 'Walk through the rounds, the questions, and how it really went.',
    showsCompany: true,
    showsConclusion: true,
    allowsPoll: false,
    requiresPoll: false,
  },
  {
    name: 'Rejection',
    slug: 'rejection',
    color: '#EF4444',
    description: 'Share the rejection, the context, and what you took from it.',
    showsCompany: true,
    showsConclusion: true,
    allowsPoll: false,
    requiresPoll: false,
  },
  {
    name: 'Ghosted',
    slug: 'ghosted',
    color: '#64748B',
    description: 'The recruiter or company that went silent. Tell us where it stalled.',
    showsCompany: true,
    showsConclusion: false,
    allowsPoll: false,
    requiresPoll: false,
  },
  {
    name: 'Offer',
    slug: 'offer',
    color: '#22C55E',
    description: 'You got the offer. Share the details, the negotiation, and how it feels.',
    showsCompany: true,
    showsConclusion: true,
    allowsPoll: false,
    requiresPoll: false,
  },
  {
    name: 'Salary',
    slug: 'salary',
    color: '#F59E0B',
    description: 'Talk numbers. Bands, negotiation wins, and the ones that got away.',
    showsCompany: true,
    showsConclusion: false,
    allowsPoll: false,
    requiresPoll: false,
  },
  {
    name: 'Layoff',
    slug: 'layoff',
    color: '#DC2626',
    description: 'Tell us how the layoff happened and what your plan is from here.',
    showsCompany: true,
    showsConclusion: false,
    allowsPoll: false,
    requiresPoll: false,
  },
  {
    name: 'Poll',
    slug: 'poll',
    color: '#8B5CF6',
    description: 'Ask the community a question and let them vote on the answer.',
    showsCompany: false,
    showsConclusion: false,
    allowsPoll: true,
    requiresPoll: true,
  },
  {
    name: 'Advice',
    slug: 'advice',
    color: '#0EA5E9',
    description: 'Ask for guidance, or share a hard-won lesson from work or the job hunt.',
    showsCompany: false,
    showsConclusion: false,
    allowsPoll: true,
    requiresPoll: false,
  },
  {
    name: 'Discussion',
    slug: 'discussion',
    color: '#14B8A6',
    description: 'Start a conversation about work, careers, or the job hunt.',
    showsCompany: false,
    showsConclusion: false,
    allowsPoll: true,
    requiresPoll: false,
  },
  {
    name: 'Rant',
    slug: 'rant',
    color: '#F97316',
    description: 'Vent the frustration. No advice needed, just let it out.',
    showsCompany: false,
    showsConclusion: false,
    allowsPoll: false,
    requiresPoll: false,
  },
  {
    name: 'Meme',
    slug: 'meme',
    color: '#EC4899',
    description: 'The absurd, funny side of work and job hunting. Keep it light.',
    showsCompany: false,
    showsConclusion: false,
    allowsPoll: false,
    requiresPoll: false,
  },
  {
    name: 'Resource',
    slug: 'resource',
    color: '#3B82F6',
    description: 'Share a tool, guide, or template that actually helped you.',
    showsCompany: false,
    showsConclusion: false,
    allowsPoll: false,
    requiresPoll: false,
  },
  {
    name: 'Comeback',
    slug: 'comeback',
    color: '#10B981',
    description:
      'The redemption arc. Tell how you turned it around and finally landed what you wanted.',
    showsCompany: true,
    showsConclusion: false,
    allowsPoll: false,
    requiresPoll: false,
  },

  // --- "Wide door": employed-professional categories, not just job-hunting.
  // Same anti-LinkedIn voice; widens who sees themselves here. ---
  {
    name: 'Bad Boss',
    slug: 'bad-boss',
    color: '#F43F5E',
    description:
      'Manager horror stories, micromanagement, and leadership done wrong.',
    showsCompany: true,
    showsConclusion: false,
    allowsPoll: false,
    requiresPoll: false,
  },
  {
    name: 'Burnout',
    slug: 'burnout',
    color: '#A78BFA',
    description:
      'The grind, the overwork, the recovery. Vent it, or share what actually helped.',
    showsCompany: false,
    showsConclusion: false,
    allowsPoll: false,
    requiresPoll: false,
  },
  {
    name: 'Win',
    slug: 'win',
    color: '#34D399',
    description:
      'The good stuff — a promotion, a raise, a quit-with-a-bang. Brag honestly.',
    showsCompany: true,
    showsConclusion: false,
    allowsPoll: false,
    requiresPoll: false,
  },
  {
    name: 'Corporate Cringe',
    slug: 'corporate-cringe',
    color: '#FBBF24',
    description:
      "LinkedIn cringe, buzzword bingo, and “we’re a family” energy. Roast it.",
    showsCompany: false,
    showsConclusion: false,
    allowsPoll: false,
    requiresPoll: false,
  },
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
