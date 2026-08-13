/**
 * DEMO (removable) seed data + purge logic.
 *
 * PURPOSE: before real users arrive, an empty feed looks broken. We seed a
 * handful of sample Sinks so the app looks alive during development and demos.
 * The moment real users show up, this data should be removed so it never
 * pollutes real content.
 *
 * HOW REMOVAL WORKS — the marker:
 *   Every demo User is created with a `supabaseUserId` that starts with
 *   `SEED_PREFIX` ("seed:"). Real users authenticate through Supabase and
 *   always get a UUID there, so a real user can NEVER match this prefix.
 *   Demo handles also start with "Seed_" so they're obvious in the UI.
 *   `purgeDemoData()` deletes everything owned by seed users (their Sinks,
 *   votes, comments, poll options, poll votes) and then the seed users
 *   themselves — leaving Categories and all real data untouched.
 *
 * NOTE ON HARD DELETE: the project rule is "never hard-delete, use deletedAt"
 * for *user content in normal operation*. This purge is a maintenance action
 * that removes throwaway demo rows entirely — a deliberate, documented
 * exception, not part of any request flow.
 */

import { PrismaClient } from '@prisma/client';

/** Marker that identifies demo users (and, transitively, their content). */
export const SEED_PREFIX = 'seed:';

/** Demo users — handles are prefixed "Seed_" so they're visibly demo data. */
export const demoUsers = [
  { supabaseUserId: `${SEED_PREFIX}user-1`, handle: 'Seed_Sunken_Sailor_001' },
  { supabaseUserId: `${SEED_PREFIX}user-2`, handle: 'Seed_Rejected_Raccoon_002' },
  { supabaseUserId: `${SEED_PREFIX}user-3`, handle: 'Seed_Ghosted_Gopher_003' },
];

/**
 * Demo Sinks. Each references a category by `slug` (resolved to an id at seed
 * time) and an author by index into `demoUsers`. Poll sinks carry `poll`
 * options. Fields mirror what each category's config allows (company/conclusion
 * only where the category shows them) so the demo data is internally valid.
 */
export const demoSinks: Array<{
  authorIndex: number;
  categorySlug: string;
  title: string;
  body?: string;
  company?: string;
  conclusion?: 'GHOSTED' | 'REJECTED' | 'ACCEPTED' | 'WITHDREW' | 'PENDING' | 'OTHER';
  poll?: string[];
}> = [
  {
    authorIndex: 0,
    categorySlug: 'interview-experience',
    title: 'Four rounds, then silence on the final loop',
    body: 'Made it to the onsite, thought it went great, and then nothing for three weeks. Sharing the questions in case it helps someone.',
    company: 'Globex',
    conclusion: 'GHOSTED',
  },
  {
    authorIndex: 1,
    categorySlug: 'rejection',
    title: 'Rejected after the take-home I spent a weekend on',
    body: 'Standard "we went with another candidate" email. The take-home was building a whole feature. Anyone else feel these are getting out of hand?',
    company: 'Initech',
    conclusion: 'REJECTED',
  },
  {
    authorIndex: 2,
    categorySlug: 'ghosted',
    title: 'Recruiter loved me, then vanished mid-process',
    body: 'Two calls, lots of enthusiasm, "expect an offer soon"... and then read receipts with no replies. Classic.',
    company: 'Hooli',
  },
  {
    authorIndex: 0,
    categorySlug: 'rant',
    title: '"We are like a family here" is a red flag',
    body: 'Every time I hear it in an interview I mentally add 20% to the expected chaos.',
  },
  {
    authorIndex: 1,
    categorySlug: 'discussion',
    title: 'How many applications did it take you to land your last role?',
    body: 'Curious what "normal" actually looks like right now. Drop your number.',
  },
  {
    authorIndex: 2,
    categorySlug: 'poll',
    title: 'Whats the worst part of the job hunt?',
    poll: ['The ghosting', 'The take-home assignments', 'The endless rounds', 'The salary games'],
  },
];

/**
 * Remove ALL demo data (everything owned by seed-prefixed users), in an order
 * that respects foreign keys. Categories and real users are never touched.
 * Idempotent: a no-op if no demo users exist.
 *
 * @returns counts of what was deleted, for logging.
 */
export async function purgeDemoData(prisma: PrismaClient) {
  // Find the seed users by their marker prefix.
  const seedUsers = await prisma.user.findMany({
    where: { supabaseUserId: { startsWith: SEED_PREFIX } },
    select: { id: true },
  });
  const userIds = seedUsers.map((u) => u.id);

  if (userIds.length === 0) {
    return { users: 0, sinks: 0 };
  }

  // Collect the demo users' Sinks so we can clean their dependent rows.
  const seedSinks = await prisma.sink.findMany({
    where: { userId: { in: userIds } },
    select: { id: true },
  });
  const sinkIds = seedSinks.map((s) => s.id);

  // Delete children before parents (FK-safe order):
  // poll votes -> poll options -> votes -> comments -> sinks -> users.
  await prisma.pollVote.deleteMany({
    where: {
      OR: [{ userId: { in: userIds } }, { option: { sinkId: { in: sinkIds } } }],
    },
  });
  await prisma.pollOption.deleteMany({ where: { sinkId: { in: sinkIds } } });
  await prisma.vote.deleteMany({
    where: { OR: [{ userId: { in: userIds } }, { sinkId: { in: sinkIds } }] },
  });
  await prisma.comment.deleteMany({
    where: { OR: [{ userId: { in: userIds } }, { sinkId: { in: sinkIds } }] },
  });
  await prisma.sink.deleteMany({ where: { id: { in: sinkIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });

  return { users: userIds.length, sinks: sinkIds.length };
}
