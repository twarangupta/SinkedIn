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
  { supabaseUserId: `${SEED_PREFIX}user-4`, handle: 'Seed_Benched_Barnacle_004' },
  { supabaseUserId: `${SEED_PREFIX}user-5`, handle: 'Seed_Pending_Penguin_005' },
  { supabaseUserId: `${SEED_PREFIX}user-6`, handle: 'Seed_Weary_Walrus_006' },
  { supabaseUserId: `${SEED_PREFIX}user-7`, handle: 'Seed_Adrift_Anchovy_007' },
  { supabaseUserId: `${SEED_PREFIX}user-8`, handle: 'Seed_Jaded_Kraken_008' },
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

  // --- Interview Experience (company + conclusion) ---
  {
    authorIndex: 3,
    categorySlug: 'interview-experience',
    title: 'System design round where they wanted me to redesign their actual product',
    body: 'Two hours whiteboarding a fix for a bug they clearly already have. Felt less like an interview and more like free consulting.',
    company: 'Initech',
    conclusion: 'WITHDREW',
  },
  {
    authorIndex: 5,
    categorySlug: 'interview-experience',
    title: 'Take-home said "about 2 hours". It took nine. But I got the offer.',
    body: 'Sharing the scope so you can judge for yourself: full CRUD app, tests, and a writeup. Worth it in the end, but be honest about the hours, companies.',
    company: 'Vandelay Industries',
    conclusion: 'ACCEPTED',
  },
  {
    authorIndex: 6,
    categorySlug: 'interview-experience',
    title: 'Interviewer joined 20 minutes late, then called me "inflexible"',
    body: 'No apology, camera off, asked the same question twice. I already knew the answer to "do you have any questions for us".',
    company: 'Hooli',
    conclusion: 'GHOSTED',
  },

  // --- Rejection (company + conclusion) ---
  {
    authorIndex: 4,
    categorySlug: 'rejection',
    title: 'Rejected four minutes after applying. New personal record.',
    body: 'Not even enough time to open the resume. Somewhere a filter is very confident about me.',
    company: 'Massive Dynamic',
    conclusion: 'REJECTED',
  },
  {
    authorIndex: 7,
    categorySlug: 'rejection',
    title: 'Turned down for being "overqualified" for a job I actually wanted',
    body: 'I promise I will happily do the work I applied for. Please let me.',
    company: 'Globex',
    conclusion: 'REJECTED',
  },

  // --- Ghosted (company) ---
  {
    authorIndex: 4,
    categorySlug: 'ghosted',
    title: 'Recruiter has viewed my LinkedIn six times but won’t answer one email',
    body: 'I can see you. You can see me. We could end this so easily.',
    company: 'Wonka Industries',
  },
  {
    authorIndex: 7,
    categorySlug: 'ghosted',
    title: '"Offer coming Monday." That was three Mondays ago.',
    body: 'At this point I just want closure and my calendar back.',
    company: 'Stark Solutions',
  },

  // --- Offer (company + conclusion) ---
  {
    authorIndex: 5,
    categorySlug: 'offer',
    title: 'Got the offer. 30% bump. Not going to pretend I didn’t tear up.',
    body: 'To everyone still in the trenches: it can turn around fast. Keep going.',
    company: 'Wayne Enterprises',
    conclusion: 'ACCEPTED',
  },
  {
    authorIndex: 1,
    categorySlug: 'offer',
    title: 'Lowball offer, countered, they matched instantly. Always ask.',
    body: 'The "best we can do" was apparently not the best they could do.',
    company: 'Acme Corp',
    conclusion: 'ACCEPTED',
  },

  // --- Salary (company) ---
  {
    authorIndex: 6,
    categorySlug: 'salary',
    title: 'They asked my number first. I flipped it back and got 15% more.',
    body: 'Whoever speaks the number first loses. Make them go first.',
    company: 'Umbrella Corp',
  },
  {
    authorIndex: 3,
    categorySlug: 'salary',
    title: 'Two offers, same title, same city — 40% apart. Comp is made up.',
    body: 'Ranges are fiction and the only cheat code is talking to each other.',
    company: 'Cyberdyne',
  },

  // --- Layoff (company) ---
  {
    authorIndex: 4,
    categorySlug: 'layoff',
    title: 'Laid off via a calendar invite titled "Quick sync"',
    body: 'Fifteen minutes. No agenda. In hindsight, the vaguest meeting title of my life.',
    company: 'Pied Piper',
  },
  {
    authorIndex: 5,
    categorySlug: 'layoff',
    title: 'Survived three rounds of layoffs. My morale did not.',
    body: 'Quietly job hunting now. "Do more with less" has a ceiling and we found it.',
    company: 'Aperture Science',
  },

  // --- Poll (required) ---
  {
    authorIndex: 3,
    categorySlug: 'poll',
    title: 'Worst interview red flag?',
    poll: ['"We’re like a family"', 'Unpaid take-home', '5+ rounds', 'Won’t share salary'],
  },
  {
    authorIndex: 6,
    categorySlug: 'poll',
    title: 'How long before "we’ll be in touch" means you’ve been ghosted?',
    poll: ['3 days', '1 week', '2 weeks', 'It already happened'],
  },

  // --- Advice (optional poll) ---
  {
    authorIndex: 2,
    categorySlug: 'advice',
    title: 'Recruiter wants my current salary. How do I dodge without seeming difficult?',
    body: 'Contract markets, so I’d rather anchor on the role’s budget than my old number. What actually works for you?',
  },
  {
    authorIndex: 5,
    categorySlug: 'advice',
    title: 'Two offers: boring-but-stable vs exciting-but-risky. How did you choose?',
    poll: ['Take the money', 'Take the growth', 'Negotiate both', 'Gut feeling'],
  },

  // --- Discussion (optional poll) ---
  {
    authorIndex: 7,
    categorySlug: 'discussion',
    title: 'Does anyone actually land jobs from cold applications anymore?',
    body: 'Every offer I’ve gotten came from a referral. Starting to think the portal is a black hole with extra steps.',
  },
  {
    authorIndex: 1,
    categorySlug: 'discussion',
    title: 'Referrals: genuine game-changer or overrated?',
    poll: ['Game-changer', 'Overrated', 'Depends on the company', 'Never tried one'],
  },

  // --- Rant (text only) ---
  {
    authorIndex: 0,
    categorySlug: 'rant',
    title: '"Entry-level role: 5 years experience required with a 3-year-old framework."',
    body: 'The math has never mathed and it never will.',
  },
  {
    authorIndex: 6,
    categorySlug: 'rant',
    title: 'Applied to a "junior" role. First question: "architect our entire platform."',
    body: 'Sir this is a junior posting. I brought a resume, not a whiteboard.',
  },

  // --- Meme (text only) ---
  {
    authorIndex: 4,
    categorySlug: 'meme',
    title: 'My LinkedIn: "Open to work." My inbox: tumbleweeds and one crypto recruiter.',
    body: 'He believes in me. That’s something, I guess.',
  },
  {
    authorIndex: 7,
    categorySlug: 'meme',
    title: 'Interviewer: "Where do you see yourself in 5 years?" Me: "Employed, ideally."',
    body: 'Ambitious, I know.',
  },

  // --- Resource (text only) ---
  {
    authorIndex: 2,
    categorySlug: 'resource',
    title: 'The one salary-negotiation line I’ve ever needed',
    body: '"Is there any flexibility on the base?" Silence. Wait. It works more than it should.',
  },

  // --- Comeback (company) ---
  {
    authorIndex: 5,
    categorySlug: 'comeback',
    title: '60 applications, 40 rejections, 8 ghosts, 1 offer. I start Monday.',
    body: 'Saving this here so the next person doom-scrolling at 2am knows the numbers can end well.',
    company: 'Wayne Enterprises',
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
