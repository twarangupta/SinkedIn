/**
 * DEMO (removable) seed data + purge logic.
 *
 * PURPOSE: before real users arrive, an empty feed looks broken. We seed a
 * realistic set of Sinks (with comments, votes, and saves) so the app looks
 * alive during development and demos. The moment real users show up, this data
 * should be removed so it never pollutes real content.
 *
 * CONTENT NOTE: interview / salary posts are grounded in *publicly known,
 * factual* patterns (typical round structures, real comp ranges from levels.fyi
 * / AmbitionBox-style public data) and written in ORIGINAL wording — never
 * copied verbatim from anyone's writeup. Real company names are used. This data
 * is DEV-ONLY and clearly removable; it must never sync to prod or be indexed.
 *
 * HOW REMOVAL WORKS — the marker:
 *   Every demo User is created with a `supabaseUserId` that starts with
 *   `SEED_PREFIX` ("seed:"). Real users authenticate through Supabase and always
 *   get a UUID there, so a real user can NEVER match this prefix. (Handles are
 *   ordinary adjective_noun_number handles — the "seed" marker lives only on the
 *   never-public supabaseUserId, so nothing says "seed" in the UI.)
 *   `purgeDemoData()` deletes everything owned by seed users (their Sinks,
 *   votes, comments, comment votes, poll options, poll votes, bookmarks) and
 *   then the seed users themselves — leaving Categories and real data untouched.
 *
 * NOTE ON HARD DELETE: the project rule is "never hard-delete, use deletedAt"
 * for *user content in normal operation*. This purge is a maintenance action
 * that removes throwaway demo rows entirely — a deliberate, documented
 * exception, not part of any request flow.
 */

import { PrismaClient } from '@prisma/client';

/** Marker that identifies demo users (and, transitively, their content). */
export const SEED_PREFIX = 'seed:';

type Conclusion =
  | 'GHOSTED'
  | 'REJECTED'
  | 'ACCEPTED'
  | 'WITHDREW'
  | 'PENDING'
  | 'OTHER';

/**
 * Demo users — ordinary sea/career-themed handles (no "seed" text; the removal
 * marker is on the never-public supabaseUserId only). avatarId values are real
 * ids from backend/src/lib/avatars.ts.
 */
export const demoUsers: Array<{
  supabaseUserId: string;
  handle: string;
  avatarId: string;
}> = [
  { supabaseUserId: `${SEED_PREFIX}user-1`, handle: 'Rejected_Raccoon_402', avatarId: 'pufferfish' },
  { supabaseUserId: `${SEED_PREFIX}user-2`, handle: 'Ghosted_Guppy_118', avatarId: 'anglerfish' },
  { supabaseUserId: `${SEED_PREFIX}user-3`, handle: 'Burnt_Barnacle_233', avatarId: 'vampire-squid' },
  { supabaseUserId: `${SEED_PREFIX}user-4`, handle: 'Anchored_Anchovy_077', avatarId: 'gulper-eel' },
  { supabaseUserId: `${SEED_PREFIX}user-5`, handle: 'Salty_Seahorse_910', avatarId: 'seahorse' },
  { supabaseUserId: `${SEED_PREFIX}user-6`, handle: 'Pending_Penguin_051', avatarId: 'dumbo-octopus' },
  { supabaseUserId: `${SEED_PREFIX}user-7`, handle: 'Laidoff_Lobster_640', avatarId: 'crab' },
  { supabaseUserId: `${SEED_PREFIX}user-8`, handle: 'Coastal_Coelacanth_305', avatarId: 'coelacanth' },
  { supabaseUserId: `${SEED_PREFIX}user-9`, handle: 'Drifting_Dolphin_212', avatarId: 'orca' },
  { supabaseUserId: `${SEED_PREFIX}user-10`, handle: 'Weary_Walrus_006', avatarId: 'narwhal' },
  { supabaseUserId: `${SEED_PREFIX}user-11`, handle: 'Jaded_Jellyfish_808', avatarId: 'jellyfish' },
  { supabaseUserId: `${SEED_PREFIX}user-12`, handle: 'Overqualified_Otter_290', avatarId: 'sea-turtle' },
  { supabaseUserId: `${SEED_PREFIX}user-13`, handle: 'Tidal_Tuna_133', avatarId: 'manta-ray' },
  { supabaseUserId: `${SEED_PREFIX}user-14`, handle: 'Marooned_Manta_777', avatarId: 'megalodon' },
  { supabaseUserId: `${SEED_PREFIX}user-15`, handle: 'Restless_Remora_369', avatarId: 'goblin-shark' },
  { supabaseUserId: `${SEED_PREFIX}user-16`, handle: 'Foggy_Flounder_620', avatarId: 'fangtooth' },
  { supabaseUserId: `${SEED_PREFIX}user-17`, handle: 'Benched_Barreleye_004', avatarId: 'barreleye' },
  { supabaseUserId: `${SEED_PREFIX}user-18`, handle: 'Nautical_Nautilus_444', avatarId: 'nautilus' },
  { supabaseUserId: `${SEED_PREFIX}user-19`, handle: 'Quiet_Quahog_512', avatarId: 'ammonite' },
  { supabaseUserId: `${SEED_PREFIX}user-20`, handle: 'Sunken_Sailor_001', avatarId: 'kraken' },
];

export interface DemoReply {
  authorIndex: number;
  body: string;
  /** Hours after the parent comment this reply was made. */
  hoursAfter?: number;
  /** Cached comment score to set directly (no CommentVote rows). */
  score?: number;
}

export interface DemoComment {
  authorIndex: number;
  body: string;
  /** Hours after the Sink this comment was made. */
  hoursAfter?: number;
  score?: number;
  replies?: DemoReply[];
}

export interface DemoSink {
  authorIndex: number;
  categorySlug: string;
  title: string;
  body?: string;
  company?: string;
  conclusion?: Conclusion;
  poll?: string[];
  /** createdAt = now - daysAgo (spreads the feed over time). */
  daysAgo: number;
  /** BUOY votes to create (capped at the user pool). */
  buoys?: number;
  /** ANCHOR votes to create. */
  anchors?: number;
  /** Bookmarks to create from distinct users. */
  saves?: number;
  comments?: DemoComment[];
}

/**
 * Demo Sinks. Each references a category by `slug` (resolved to an id at seed
 * time) and an author by index into `demoUsers`. Fields mirror what each
 * category's config allows (company only where showsCompany, conclusion only
 * where showsConclusion, poll only where allowsPoll) so the data is valid.
 */
export const demoSinks: DemoSink[] = [
  // =========================================================================
  // INTERVIEW EXPERIENCE — real companies, real round structures, honest voice
  // =========================================================================
  {
    authorIndex: 0,
    categorySlug: 'interview-experience',
    company: 'Amazon',
    conclusion: 'REJECTED',
    daysAgo: 2,
    buoys: 17,
    anchors: 1,
    saves: 9,
    title: 'Amazon SDE-2 loop: 5 rounds, and every single one was a Leadership Principles interview in disguise',
    body: 'Phone screen was one DSA + LP stories. Onsite was four rounds: coding, LOD/system design, a behavioral-only round, and the Bar Raiser. Coding went fine but I clearly under-prepared the LPs. Have 2-3 STAR stories per principle, they dig into "tell me about a time" hard. Bar Raiser asked follow-ups until I ran out of story. Rejected on "raise the bar" signal. Coding was never the problem.',
    comments: [
      { authorIndex: 5, body: 'The Bar Raiser round is where I fell apart too. They keep asking "and then what happened" until you crack.', hoursAfter: 3, score: 6 },
      { authorIndex: 11, body: 'People sleep on the LPs and then act surprised. Amazon literally tells you it is half the score.', hoursAfter: 8, score: 4, replies: [
        { authorIndex: 0, body: 'Fair. I treated them as a formality. Expensive lesson.', hoursAfter: 2, score: 3 },
      ] },
      { authorIndex: 13, body: 'Thanks for the STAR-per-principle tip, saving this.', hoursAfter: 20 },
    ],
  },
  {
    authorIndex: 4,
    categorySlug: 'interview-experience',
    company: 'Google',
    conclusion: 'ACCEPTED',
    daysAgo: 6,
    buoys: 19,
    anchors: 0,
    saves: 14,
    title: 'Got the L4 offer at Google after 4 onsite rounds. Two DSA, one system design, one Googleyness',
    body: 'Phone screen was a medium graph problem. Onsite: two coding rounds (a hard-ish DP and a tree problem where they cared way more about how I communicated than the optimal), one system design (design a nearby-friends feature), and a behavioral. Hiring committee took ~2 weeks after. Levels put L4 in India around the low-70s LPA total and the number landed in that range. Communicate constantly, they score the thought process, not just the final code.',
    comments: [
      { authorIndex: 9, body: 'Congrats! Did they let you use your own IDE or was it their doc?', hoursAfter: 4, score: 3, replies: [
        { authorIndex: 4, body: 'Shared Google Doc, no autocomplete. Practice writing code without a crutch.', hoursAfter: 1, score: 5 },
      ] },
      { authorIndex: 2, body: '"they score the thought process" is the whole game and people learn it too late.', hoursAfter: 11, score: 7 },
    ],
  },
  {
    authorIndex: 8,
    categorySlug: 'interview-experience',
    company: 'Razorpay',
    conclusion: 'REJECTED',
    daysAgo: 9,
    buoys: 15,
    anchors: 0,
    saves: 11,
    title: 'Razorpay SSE machine coding round: 90 minutes to build a working logger, and I over-engineered it',
    body: 'The round is a 90-minute live machine-coding session on Meet. Prompt was a logging system: multiple log levels, pluggable sinks (console/file), configurable routing by level. I spent 25 minutes on a "clean" abstraction and ran out of time before it actually ran. Feedback: working and extensible beats beautiful and unfinished. Get it running first, then refactor if there is time.',
    comments: [
      { authorIndex: 15, body: 'This is THE machine coding trap. Working > pretty. Interviewers want to see it run.', hoursAfter: 5, score: 8 },
      { authorIndex: 3, body: 'Same prompt family when I gave it, mine was a rate limiter. 90 min goes FAST.', hoursAfter: 14, score: 3 },
    ],
  },
  {
    authorIndex: 12,
    categorySlug: 'interview-experience',
    company: 'Flipkart',
    conclusion: 'ACCEPTED',
    daysAgo: 13,
    buoys: 16,
    anchors: 0,
    saves: 10,
    title: 'Flipkart SDE-2: OA, then DSA, machine coding, system design, and a managerial round over ~3 weeks',
    body: 'Five stages spread across three weeks. Online assessment (2 DSA), then a live DSA round, then machine coding (design an order-notification service, they grade OO design and edge cases hard), then system design, then a managerial + HR chat. The machine coding round is the real filter. They want readable, extensible code that handles the cases you were NOT told about.',
    comments: [
      { authorIndex: 18, body: 'The "cases you were not told about" line is exactly it. Write the edge cases down before you code.', hoursAfter: 6, score: 5 },
    ],
  },
  {
    authorIndex: 1,
    categorySlug: 'interview-experience',
    company: 'Microsoft',
    conclusion: 'PENDING',
    daysAgo: 3,
    buoys: 9,
    anchors: 0,
    saves: 4,
    title: 'Microsoft loop felt the most humane of any I have done this cycle',
    body: 'Four rounds, each interviewer actually read my resume, and the "as-appropriate" round (the AA) was a genuine conversation about tradeoffs instead of a gotcha. DSA was medium, one design round scaled to my level. Still waiting to hear back but wanted to say a calm, well-run loop is possible and it makes a difference.',
    comments: [
      { authorIndex: 6, body: 'A loop where they read your resume feels rare enough to post about. Fingers crossed for you.', hoursAfter: 9, score: 4 },
    ],
  },
  {
    authorIndex: 10,
    categorySlug: 'interview-experience',
    company: 'Uber',
    conclusion: 'REJECTED',
    daysAgo: 18,
    buoys: 8,
    anchors: 1,
    saves: 3,
    title: 'Uber onsite: the coding bar was fine, the system design round is where they raised it',
    body: 'Two coding rounds (both medium-hard, LC-style), one system design (design something like a driver-rider matching / dispatch), one behavioral. I could code but my design round stayed too high-level. They wanted concrete data models, back-of-envelope numbers, and failure handling. "It depends" is not an answer they accept without the follow-through.',
  },
  {
    authorIndex: 7,
    categorySlug: 'interview-experience',
    company: 'Atlassian',
    conclusion: 'ACCEPTED',
    daysAgo: 22,
    buoys: 12,
    anchors: 0,
    saves: 6,
    title: 'Atlassian values interview is real and it counts. Do not treat it as a formality',
    body: 'Coding round was fair, system design was collaborative (they nudge you, it is not adversarial). But there is a dedicated values round and it is scored like the rest. Prepare examples of feedback you gave, conflict you handled, a time you changed your mind. I almost skipped prepping it and that would have cost me the offer.',
    comments: [
      { authorIndex: 4, body: 'Every "culture" round is a real round now. The days of winging it are over.', hoursAfter: 30, score: 5 },
    ],
  },
  {
    authorIndex: 5,
    categorySlug: 'interview-experience',
    company: 'Zomato',
    conclusion: 'GHOSTED',
    daysAgo: 11,
    buoys: 10,
    anchors: 0,
    saves: 2,
    title: 'Zomato: cleared the machine coding and the design round, then total silence for a month',
    body: 'Process moved fast at first, machine coding (design a cab-booking-ish dispatcher), a good design discussion, felt strong. Then the recruiter stopped replying. No reject, no offer, just gone. Posting the rounds so at least the prep helps someone even if the closure never came for me.',
    comments: [
      { authorIndex: 14, body: 'The silence after a strong loop is the worst kind. Sorry, that stings.', hoursAfter: 12, score: 6 },
      { authorIndex: 19, body: 'Had almost the same experience. Cleared everything, then a quiet drop.', hoursAfter: 40, score: 2 },
    ],
  },
  {
    authorIndex: 16,
    categorySlug: 'interview-experience',
    company: 'Swiggy',
    conclusion: 'REJECTED',
    daysAgo: 26,
    buoys: 7,
    anchors: 0,
    saves: 2,
    title: 'Swiggy: strong DSA, weak on the low-level design round',
    body: 'Two DSA rounds went well. The LLD round asked me to design a food-ordering cart with discounts/coupons as pluggable rules, and I under-modeled it, hardcoded the discount logic instead of a strategy. Rejected there. If you are rusty on LLD, drill the classic ones (parking lot, splitwise, coupon engine) before an Indian product-company loop.',
  },
  {
    authorIndex: 13,
    categorySlug: 'interview-experience',
    company: 'CRED',
    conclusion: 'WITHDREW',
    daysAgo: 30,
    buoys: 6,
    anchors: 2,
    saves: 1,
    title: 'CRED: high bar, high polish, but the process ran long and I took another offer',
    body: 'Genuinely thoughtful rounds and a strong design bar. But it dragged across several weeks and I had a competing offer with a deadline. Withdrew. No hard feelings, timing just did not line up. If you interview here, front-load it, do not let it be your slowest process.',
  },
  {
    authorIndex: 3,
    categorySlug: 'interview-experience',
    company: 'Meta',
    conclusion: 'REJECTED',
    daysAgo: 15,
    buoys: 11,
    anchors: 0,
    saves: 5,
    title: 'Meta loop is fast and unforgiving: two 45-min coding rounds, two problems each',
    body: 'Each coding round is two problems in 45 minutes, so you have ~20 minutes per problem including talking. Optimal solution AND clean code AND narration, at speed. One behavioral, one design. I solved both problems in one round but too slowly and it showed in the debrief. Speed is a graded axis here whether they admit it or not.',
    comments: [
      { authorIndex: 0, body: 'Two problems in 45 min is brutal. That is a timed typing test with extra steps.', hoursAfter: 7, score: 5 },
    ],
  },
  {
    authorIndex: 18,
    categorySlug: 'interview-experience',
    company: 'Salesforce',
    conclusion: 'ACCEPTED',
    daysAgo: 34,
    buoys: 9,
    anchors: 0,
    saves: 4,
    title: 'Salesforce was refreshingly normal: medium DSA, practical design, no trick questions',
    body: 'Nothing exotic. A couple of medium coding rounds, a design round grounded in real scenarios, a manager chat. No LeetCode-hard flex, no puzzles. Sometimes a boring loop is a green flag, it usually means the team is stable.',
  },
  {
    authorIndex: 9,
    categorySlug: 'interview-experience',
    company: 'PhonePe',
    conclusion: 'PENDING',
    daysAgo: 4,
    buoys: 6,
    anchors: 0,
    saves: 2,
    title: 'PhonePe: heavy on concurrency and system internals, lighter on LeetCode tricks',
    body: 'They cared more about threads, locks, and how a payment stays consistent under failure than about a clever DP. Good if you have real backend depth, rough if you only grind LC. Design round was "make this idempotent and correct when the network lies to you". Waiting on the result.',
  },
  {
    authorIndex: 2,
    categorySlug: 'interview-experience',
    company: 'Goldman Sachs',
    conclusion: 'REJECTED',
    daysAgo: 38,
    buoys: 5,
    anchors: 0,
    saves: 1,
    title: 'Goldman: online HackerRank, then rounds that were more CS-fundamentals than product',
    body: 'HackerRank OA to start, then rounds heavy on OOP, data structures, and some domain/aptitude. Less "design a scalable system", more "do you actually know your fundamentals cold". Fumbled a concurrency question. Different flavor from the product-company loops, prepare accordingly.',
  },
  {
    authorIndex: 17,
    categorySlug: 'interview-experience',
    company: 'Adobe',
    conclusion: 'ACCEPTED',
    daysAgo: 41,
    buoys: 8,
    anchors: 0,
    saves: 3,
    title: 'Adobe: two DSA, one problem-solving/design, and a hiring-manager round that actually mattered',
    body: 'Solid medium DSA, a design/PS round, then a manager conversation that was clearly weighted. The manager asked what I wanted to learn next and how I handle ambiguity. Answer that one honestly, not with buzzwords. Offer came about a week later.',
  },
  {
    authorIndex: 11,
    categorySlug: 'interview-experience',
    company: 'Walmart Global Tech',
    conclusion: 'REJECTED',
    daysAgo: 44,
    buoys: 4,
    anchors: 0,
    saves: 1,
    title: 'Walmart Global Tech: cleared coding, lost it on system design scale questions',
    body: 'Coding rounds were manageable. The design round pushed hard on scale, sharding, and consistency tradeoffs and I stayed too abstract. If you are interviewing for SDE-3 level, they expect you to drive numbers and pick tradeoffs out loud, not wait to be asked.',
  },
  {
    authorIndex: 6,
    categorySlug: 'interview-experience',
    company: 'Oracle',
    conclusion: 'GHOSTED',
    daysAgo: 47,
    buoys: 3,
    anchors: 0,
    saves: 1,
    title: 'Oracle: two decent rounds, then the recruiter evaporated after "we are aligning on levels"',
    body: 'The interviews themselves were fine, standard DSA + a design chat. Then "we need to align internally on the level" and I never heard back. Aligning on levels apparently takes forever and sometimes never ends.',
  },
  {
    authorIndex: 14,
    categorySlug: 'interview-experience',
    company: 'Atlassian',
    conclusion: 'REJECTED',
    daysAgo: 52,
    buoys: 5,
    anchors: 1,
    saves: 2,
    title: 'Second time interviewing at Atlassian, second time the design round got me',
    body: 'Coding is not my problem. It is the open-ended design round where I get scored on how I structure the unknown. Booking myself weekly mock design sessions before I try again. Posting so future-me remembers the pattern.',
  },
  {
    authorIndex: 19,
    categorySlug: 'interview-experience',
    company: 'Stripe',
    conclusion: 'ACCEPTED',
    daysAgo: 58,
    buoys: 13,
    anchors: 0,
    saves: 7,
    title: 'Stripe leans practical: an integration/debugging round instead of pure whiteboard DSA',
    body: 'Less "invert this tree", more "here is a realistic codebase, make this work and handle the edge cases". A bug-hunt style round, an API design discussion, and a behavioral. If you are a builder more than a competitive-programmer, this loop actually plays to you. Best interview experience of my search.',
    comments: [
      { authorIndex: 7, body: 'Wish more companies did practical rounds. Debugging real code >> whiteboard trivia.', hoursAfter: 10, score: 9 },
      { authorIndex: 12, body: 'Congrats! Their comp is strong too if you get RSUs in the mix.', hoursAfter: 26, score: 3 },
    ],
  },
  {
    authorIndex: 15,
    categorySlug: 'interview-experience',
    company: 'Infosys',
    conclusion: 'ACCEPTED',
    daysAgo: 63,
    buoys: 4,
    anchors: 0,
    saves: 1,
    title: 'Mass-recruiter reality: Infosys was aptitude, a short coding test, then an HR round',
    body: 'Very different world from the product loops on here. Aptitude + verbal, a basic coding/technical round, then HR. Volume hiring, so it moves in batches. Not glamorous, but a real first job is a real first job. No shame in starting here.',
  },
  {
    authorIndex: 1,
    categorySlug: 'interview-experience',
    company: 'BrowserStack',
    conclusion: 'PENDING',
    daysAgo: 5,
    buoys: 5,
    anchors: 0,
    saves: 2,
    title: 'BrowserStack: a take-home, then a deep-dive on my own submission',
    body: 'Reasonable take-home (a few hours, not a weekend), then a live round where they picked my code apart in a good way, "why this data structure, what breaks at scale". If you fake a take-home you will get caught in the follow-up. Waiting to hear back.',
  },
  {
    authorIndex: 8,
    categorySlug: 'interview-experience',
    company: 'Groww',
    conclusion: 'REJECTED',
    daysAgo: 69,
    buoys: 4,
    anchors: 0,
    saves: 1,
    title: 'Groww: strong on LLD, they want clean object models under time pressure',
    body: 'DSA was fine, but the low-level design round (model a trading watchlist with alerts) needed cleaner abstractions than I produced in the time. Fintech loops in India love LLD. Drill it.',
  },

  // =========================================================================
  // SALARY — real comp ranges, honest negotiation talk (company allowed)
  // =========================================================================
  {
    authorIndex: 4,
    categorySlug: 'salary',
    company: 'Google',
    daysAgo: 7,
    buoys: 18,
    anchors: 0,
    saves: 12,
    title: 'Google L4 in Bangalore landed around 72 LPA total. Base was less than half of that',
    body: 'Breakdown that helped me sanity-check: base in the 40s, the rest was RSUs (4-year vest) plus a joining bonus. Public data (levels.fyi) had L4 India in the low-70s median and that matched. If a recruiter quotes you only base, ask for the full TC breakdown before you react.',
    comments: [
      { authorIndex: 13, body: 'The base-vs-RSU gap trips up so many first offers. Always ask for TC, not base.', hoursAfter: 4, score: 8 },
      { authorIndex: 6, body: 'And ask what stock price they used to compute the RSU value. It matters.', hoursAfter: 9, score: 6 },
    ],
  },
  {
    authorIndex: 10,
    categorySlug: 'salary',
    company: 'Amazon',
    daysAgo: 12,
    buoys: 14,
    anchors: 1,
    saves: 8,
    title: 'Amazon SDE-2 offer in India came to ~58 LPA TC, but the first-two-years cash is front-loaded',
    body: 'Watch the vesting cliff. Amazon RSUs vest 5/15/40/40 over four years, so the early years lean on sign-on bonuses to fill the gap. The headline TC is real but years 3-4 are where the stock actually shows up. Median SDE-2 India is around the high-50s to low-60s on public data.',
    comments: [
      { authorIndex: 0, body: 'The 5/15/40/40 cliff is the part recruiters gloss over. Model your actual cash per year.', hoursAfter: 6, score: 7 },
    ],
  },
  {
    authorIndex: 5,
    categorySlug: 'salary',
    company: 'Microsoft',
    daysAgo: 20,
    buoys: 10,
    anchors: 0,
    saves: 5,
    title: 'Microsoft mid-level (61/62) offers I have seen cluster in the 40-60 LPA range',
    body: 'Steadier stock, less rollercoaster than the FAANG peers, annual refreshers matter more here than the joining grant. If work-life balance is your priority the tradeoff can be worth a slightly lower headline number.',
  },
  {
    authorIndex: 13,
    categorySlug: 'salary',
    daysAgo: 8,
    company: 'Flipkart',
    buoys: 9,
    anchors: 0,
    saves: 4,
    title: 'They asked my current CTC. I gave a range for the role instead and it worked',
    body: 'Recruiter opened with "what is your current fixed?". I said "I am targeting roles in the X to Y band based on market for this level, happy to work within your range". Reframes it from my history to the role. Anchored higher than my old number would have.',
    comments: [
      { authorIndex: 18, body: 'This is the move. Never anchor on your old salary, anchor on the role.', hoursAfter: 5, score: 9 },
      { authorIndex: 2, body: 'Does this actually work in India where they demand pay slips though?', hoursAfter: 11, score: 3, replies: [
        { authorIndex: 13, body: 'They asked for slips at offer stage, not to set the number. Two different moments.', hoursAfter: 2, score: 5 },
      ] },
    ],
  },
  {
    authorIndex: 6,
    categorySlug: 'salary',
    company: 'Uber',
    daysAgo: 25,
    buoys: 8,
    anchors: 0,
    saves: 4,
    title: 'Two offers, same title, same city, 40% apart. Comp is a negotiation, not a fact',
    body: 'One product company, one bank, both "SDE-2 equivalent" in Bangalore. The spread was enormous. There is no "market rate", there is what you can anchor and what they can pay. Talk to peers, the only cheat code is sharing numbers with each other.',
    comments: [
      { authorIndex: 11, body: 'Ranges are fiction and salary secrecy only helps the employer. Post your numbers, folks.', hoursAfter: 8, score: 11 },
    ],
  },
  {
    authorIndex: 17,
    categorySlug: 'salary',
    company: 'Atlassian',
    daysAgo: 31,
    buoys: 7,
    anchors: 0,
    saves: 3,
    title: 'Countered a "final" offer by 12% with one sentence and they matched instantly',
    body: '"I am really excited, is there any flexibility on the base to get this across the line?" Silence. Do not fill it. They came back the next day with the bump. The first "best we can do" is almost never the actual best they can do.',
    comments: [
      { authorIndex: 9, body: 'The silence after the ask is the hardest part. Whoever talks first loses.', hoursAfter: 7, score: 8 },
    ],
  },
  {
    authorIndex: 8,
    categorySlug: 'salary',
    company: 'Zerodha',
    daysAgo: 36,
    buoys: 6,
    anchors: 0,
    saves: 2,
    title: 'Zerodha pays mostly in cash, not equity, and honestly that simplicity is underrated',
    body: 'No RSU roulette, no "it is worth X if the stock does Y". A clear fixed number you can plan your life around. For some people that certainty beats a bigger-but-volatile FAANG package. Depends what you value.',
  },
  {
    authorIndex: 3,
    categorySlug: 'salary',
    company: 'Meesho',
    daysAgo: 42,
    buoys: 5,
    anchors: 0,
    saves: 2,
    title: 'Startup ESOPs: I finally asked the questions that make them squirm',
    body: 'Strike price? Current 409A/fair value? Total shares outstanding, so I know my actual percent? Vesting and cliff? Liquidity, is there any buyback or is this paper until an exit? If they cannot answer these, value the ESOPs at zero and negotiate on cash.',
    comments: [
      { authorIndex: 15, body: 'Value ESOPs at zero until proven otherwise. Saved this list, thank you.', hoursAfter: 14, score: 7 },
    ],
  },
  {
    authorIndex: 12,
    categorySlug: 'salary',
    company: 'Navi',
    daysAgo: 48,
    buoys: 4,
    anchors: 0,
    saves: 1,
    title: 'A 30% "hike" that was actually a pay cut once I did the math',
    body: 'Higher fixed, but they dropped the variable, the meal card, and the WFH allowance, and the commute added an hour each way. On paper a raise, in reality break-even at best. Compare total packages and your actual life, not just the CTC headline.',
  },
  {
    authorIndex: 19,
    categorySlug: 'salary',
    company: 'Stripe',
    daysAgo: 55,
    buoys: 9,
    anchors: 0,
    saves: 5,
    title: 'The single most valuable thing I did was write down every offer number in a shared sheet with friends',
    body: 'Five of us job-hunting kept an anonymous sheet: company, level, base, stock, bonus, location. It killed every lowball instantly because we all knew the real ranges. Pay transparency between peers is the actual power move.',
    comments: [
      { authorIndex: 4, body: 'This is basically what SinkedIn should become. Numbers in the open.', hoursAfter: 9, score: 10 },
    ],
  },
  {
    authorIndex: 1,
    categorySlug: 'salary',
    company: 'TCS',
    daysAgo: 60,
    buoys: 4,
    anchors: 2,
    saves: 1,
    title: 'Service-company to product-company jump nearly tripled my fixed. The gap is real',
    body: 'Started at a service company on a modest fresher package, switched to a product company after two years and the fixed nearly 3x-ed. If you are early-career and stuck at a mass recruiter, the switch is worth grinding DSA for. The delta is life-changing.',
  },
  {
    authorIndex: 14,
    categorySlug: 'salary',
    company: 'Google',
    daysAgo: 66,
    buoys: 7,
    anchors: 0,
    saves: 3,
    title: 'A competing offer is the only leverage that reliably moves the number',
    body: 'Talked, hinted, "explained my worth" for weeks, nothing moved. One real competing written offer and the counter appeared in 48 hours. If you want a bump, the market has to be in the room with you. Everything else is a nice conversation.',
  },

  // =========================================================================
  // REJECTION (company + conclusion)
  // =========================================================================
  {
    authorIndex: 0,
    categorySlug: 'rejection',
    company: 'Amazon',
    conclusion: 'REJECTED',
    daysAgo: 1,
    buoys: 13,
    anchors: 0,
    saves: 3,
    title: 'Rejected after the final round with "we went with a candidate who was a closer fit"',
    body: 'Four rounds, a full day of my life, and the feedback was a sentence a template could have written. I do not need a dissertation, but a single concrete thing to improve would turn this from a dead end into a lesson.',
    comments: [
      { authorIndex: 10, body: '"Closer fit" is HR for "we cannot legally tell you the real reason". Do not read into it.', hoursAfter: 3, score: 8 },
      { authorIndex: 16, body: 'Four rounds deserves four sentences of feedback. The asymmetry is insulting.', hoursAfter: 12, score: 5 },
    ],
  },
  {
    authorIndex: 6,
    categorySlug: 'rejection',
    company: 'Deloitte',
    conclusion: 'REJECTED',
    daysAgo: 4,
    buoys: 11,
    anchors: 0,
    saves: 1,
    title: 'Auto-rejected four minutes after applying. New personal record',
    body: 'Not even enough time to open the resume. Somewhere an ATS filter is very confident about me based on a keyword I did not put in bold. The machine said no before a human said hello.',
    comments: [
      { authorIndex: 5, body: 'Tailor the keywords to the JD, the bot reads before the human does. Grim but true.', hoursAfter: 5, score: 7 },
    ],
  },
  {
    authorIndex: 11,
    categorySlug: 'rejection',
    company: 'Google',
    conclusion: 'REJECTED',
    daysAgo: 10,
    buoys: 9,
    anchors: 0,
    saves: 2,
    title: 'Rejected by hiring committee after passing every single interview round',
    body: 'Every interviewer said hire, the committee said no. Apparently that happens more than people admit, the packet did not have a strong enough signal on one axis. Cleared the humans, lost to the process. Reapplying in a year, they said I could.',
    comments: [
      { authorIndex: 4, body: 'HC rejects after clean rounds are brutal and common. The 12-month reapply is real, use it.', hoursAfter: 8, score: 6 },
    ],
  },
  {
    authorIndex: 15,
    categorySlug: 'rejection',
    company: 'Flipkart',
    conclusion: 'REJECTED',
    daysAgo: 16,
    buoys: 7,
    anchors: 0,
    saves: 1,
    title: 'Turned down for being "overqualified" for a role I actively wanted',
    body: 'I told them plainly I wanted the scope and the team, not a title. Did not matter. "You will be bored and leave." I promise I will happily do the work I applied for. Please just let me.',
    comments: [
      { authorIndex: 8, body: '"Overqualified" is code for "we are scared you will ask for more later". Frustrating.', hoursAfter: 10, score: 6 },
    ],
  },
  {
    authorIndex: 2,
    categorySlug: 'rejection',
    company: 'Swiggy',
    conclusion: 'REJECTED',
    daysAgo: 23,
    buoys: 6,
    anchors: 0,
    saves: 1,
    title: 'Rejected after a take-home I spent a full weekend on. No feedback on the code',
    body: 'Build a whole feature, tests, a writeup, "about two hours" (it was nine). Then a form rejection with zero comment on the actual submission. If you are going to make me build it, at least tell me what was wrong with it.',
    comments: [
      { authorIndex: 12, body: 'Unpaid nine-hour take-homes with no feedback should be illegal. Value your weekend.', hoursAfter: 6, score: 9 },
    ],
  },
  {
    authorIndex: 18,
    categorySlug: 'rejection',
    company: 'Meta',
    conclusion: 'REJECTED',
    daysAgo: 29,
    buoys: 5,
    anchors: 0,
    saves: 1,
    title: 'Solved both problems, still rejected: "too slow" was the debrief',
    body: 'Correct, clean, but not fast enough for the Meta bar. Speed is a hidden graded axis. Went home and started doing timed sets instead of untimed practice. Painful signal, but a useful one.',
  },
  {
    authorIndex: 9,
    categorySlug: 'rejection',
    company: 'Accenture',
    conclusion: 'REJECTED',
    daysAgo: 35,
    buoys: 4,
    anchors: 0,
    saves: 1,
    title: 'Ghost-rejected: found out I was rejected because the portal status changed, never an email',
    body: 'Logged in to check and the status just said "not selected". No message, no call. The quiet status flip is somehow worse than a clear no. At least a no is closure.',
  },
  {
    authorIndex: 7,
    categorySlug: 'rejection',
    company: 'Wipro',
    conclusion: 'REJECTED',
    daysAgo: 43,
    buoys: 3,
    anchors: 1,
    saves: 0,
    title: 'Rejected, asked for feedback, got "keep practicing". Thanks, incredibly actionable',
    body: 'I asked politely and specifically. "Keep practicing and apply again." Practicing what? The one thing that would make the whole rejection worthwhile and they will not give it.',
  },
  {
    authorIndex: 13,
    categorySlug: 'rejection',
    company: 'Oracle',
    conclusion: 'REJECTED',
    daysAgo: 51,
    buoys: 4,
    anchors: 0,
    saves: 1,
    title: '11th rejection this month. Posting the number so it is not just a feeling',
    body: 'Writing it down because in my head it feels like a hundred. It is eleven. Still a lot, still tiring, but naming the real number helps me not spiral. On to twelve.',
    comments: [
      { authorIndex: 0, body: 'Eleven is a lot and also survivable. The counting trick genuinely helps. Rooting for you.', hoursAfter: 4, score: 8 },
      { authorIndex: 5, body: 'It only takes one yes to erase the count. Keep going.', hoursAfter: 9, score: 6 },
    ],
  },
  {
    authorIndex: 16,
    categorySlug: 'rejection',
    company: 'Salesforce',
    conclusion: 'REJECTED',
    daysAgo: 57,
    buoys: 3,
    anchors: 0,
    saves: 0,
    title: 'Rejected post-offer because they "restructured the team". Offer rescinded before I joined',
    body: 'Signed, resigned my old job, then the offer got pulled in a reorg two weeks before joining. Legal in most places, devastating in all of them. Do not resign until the start date is locked and, if you can, keep a backup warm.',
    comments: [
      { authorIndex: 6, body: 'A rescinded offer after you resigned is a nightmare. Never burn the old bridge too early.', hoursAfter: 5, score: 9 },
    ],
  },

  // =========================================================================
  // GHOSTED (company)
  // =========================================================================
  {
    authorIndex: 1,
    categorySlug: 'ghosted',
    company: 'Uber',
    daysAgo: 3,
    buoys: 12,
    anchors: 0,
    saves: 2,
    title: 'Recruiter has viewed my LinkedIn six times but will not answer one email',
    body: 'I can see you in the "who viewed your profile" list. You can see me. We could end this so easily with two words either way. Instead, six silent visits and counting.',
    comments: [
      { authorIndex: 14, body: 'The LinkedIn stalking-but-not-replying is a special kind of cruel.', hoursAfter: 4, score: 10 },
      { authorIndex: 3, body: 'Screenshot the six views and frame it. Modern art.', hoursAfter: 7, score: 6 },
    ],
  },
  {
    authorIndex: 10,
    categorySlug: 'ghosted',
    company: 'Zomato',
    daysAgo: 8,
    buoys: 9,
    anchors: 0,
    saves: 1,
    title: '"Offer coming Monday." That was three Mondays ago',
    body: 'At this point I just want closure and my calendar back. I stopped applying elsewhere for a week because they were "so close". Never pause your search for a verbal maybe.',
    comments: [
      { authorIndex: 8, body: 'Rule I learned the hard way: keep applying until the signed offer is in your inbox.', hoursAfter: 6, score: 8 },
    ],
  },
  {
    authorIndex: 17,
    categorySlug: 'ghosted',
    company: 'Paytm',
    daysAgo: 14,
    buoys: 7,
    anchors: 0,
    saves: 1,
    title: 'Two great calls, "we love you, expect next steps this week", then nothing for a month',
    body: 'The enthusiasm-to-silence pipeline is the most disorienting part of this whole process. High highs, then a wall. I would take a fast no over a warm maybe that dissolves.',
  },
  {
    authorIndex: 5,
    categorySlug: 'ghosted',
    company: 'Cisco',
    daysAgo: 21,
    buoys: 5,
    anchors: 0,
    saves: 0,
    title: 'Ghosted after the FINAL round. Somehow that hurts more than an early no',
    body: 'To make it all the way to the last round and then just... nothing. If I was close enough to interview four times, I was close enough for one email. The final-round ghost is the worst tier of ghost.',
  },
  {
    authorIndex: 12,
    categorySlug: 'ghosted',
    company: 'Nutanix',
    daysAgo: 28,
    buoys: 4,
    anchors: 0,
    saves: 0,
    title: 'The recruiter left the company mid-process and nobody picked up my thread',
    body: 'Found out when my emails started bouncing. My whole loop just fell into a void because one person left and no handoff happened. Always ask "who is my backup contact" early.',
  },
  {
    authorIndex: 19,
    categorySlug: 'ghosted',
    company: 'Freshworks',
    daysAgo: 37,
    buoys: 4,
    anchors: 0,
    saves: 1,
    title: 'They asked me to "hold for a week for the team to align" and that week never ended',
    body: 'The "aligning internally" black hole. It has been three weeks. I have mentally moved on but the calendar hold still haunts my Google Calendar like a ghost.',
  },
  {
    authorIndex: 3,
    categorySlug: 'ghosted',
    company: 'ServiceNow',
    daysAgo: 46,
    buoys: 3,
    anchors: 0,
    saves: 0,
    title: 'Post-offer ghosting: got the verbal, then silence on the written for two weeks',
    body: 'A verbal offer is not an offer. Learned to say "thrilled, please send the written and I will sign same day" and to keep interviewing until the paper exists. Words are wind.',
  },
  {
    authorIndex: 15,
    categorySlug: 'ghosted',
    company: 'Myntra',
    daysAgo: 54,
    buoys: 3,
    anchors: 0,
    saves: 0,
    title: 'I sent a polite follow-up. Then a second. The third one I did not send, I just closed the tab',
    body: 'There is a specific grief in drafting a fourth "just checking in" email and realizing you are the only one still in this relationship. Deleted it. Moved on. Freeing, actually.',
  },

  // =========================================================================
  // OFFER (company + conclusion)
  // =========================================================================
  {
    authorIndex: 4,
    categorySlug: 'offer',
    company: 'Google',
    conclusion: 'ACCEPTED',
    daysAgo: 5,
    buoys: 19,
    anchors: 0,
    saves: 8,
    title: 'Got the offer. 4 months, 60+ applications, one yes. Not going to pretend I did not tear up',
    body: 'To everyone still in the trenches refreshing their inbox: it can turn around in a single email. Keep the streak alive. The no\'s do not accumulate into a verdict about you, they are just the cost of getting to the one yes.',
    comments: [
      { authorIndex: 0, body: 'Needed this today. Congratulations, genuinely.', hoursAfter: 2, score: 9 },
      { authorIndex: 11, body: '60 applications for 1 offer is the real ratio nobody posts on LinkedIn. Thank you for the honesty.', hoursAfter: 6, score: 11 },
      { authorIndex: 16, body: 'Screenshotting the "keep the streak alive" line for my 2am doomscrolls.', hoursAfter: 14, score: 5 },
    ],
  },
  {
    authorIndex: 8,
    categorySlug: 'offer',
    company: 'Atlassian',
    conclusion: 'ACCEPTED',
    daysAgo: 12,
    buoys: 12,
    anchors: 0,
    saves: 4,
    title: 'Lowballed, countered with data, they matched in a day. Always, always counter',
    body: 'First number was ~15% under the public range for the level. I sent one calm email with market data and a competing range. Matched within 24 hours. The lowball is a test, not a ceiling.',
    comments: [
      { authorIndex: 13, body: 'The lowball is a test. Perfectly put. Most people fail it by saying yes too fast.', hoursAfter: 5, score: 7 },
    ],
  },
  {
    authorIndex: 6,
    categorySlug: 'offer',
    company: 'Razorpay',
    conclusion: 'ACCEPTED',
    daysAgo: 19,
    buoys: 9,
    anchors: 0,
    saves: 3,
    title: 'Took the smaller offer with the better manager and I would do it again',
    body: 'Bigger brand offered ~10% more. Took the one where the manager talked about growth and actually asked what I wanted. Six months in, no regrets. You join a manager as much as a company.',
    comments: [
      { authorIndex: 5, body: 'You join a manager, not a logo. The 10% is nothing next to a manager who has your back.', hoursAfter: 8, score: 8 },
    ],
  },
  {
    authorIndex: 14,
    categorySlug: 'offer',
    company: 'Microsoft',
    conclusion: 'ACCEPTED',
    daysAgo: 27,
    buoys: 8,
    anchors: 0,
    saves: 2,
    title: 'From a layoff in January to a signed offer in August. Comebacks are slow and real',
    body: 'Seven months, a lot of doubt, a couple of "maybe I have lost it" nights. Signed today. If you are in the gap right now: the gap is a chapter, not the whole book.',
    comments: [
      { authorIndex: 2, body: 'Seven months in the gap and out the other side. This is the post I needed.', hoursAfter: 6, score: 7 },
    ],
  },
  {
    authorIndex: 17,
    categorySlug: 'offer',
    company: 'Stripe',
    conclusion: 'ACCEPTED',
    daysAgo: 33,
    buoys: 7,
    anchors: 0,
    saves: 3,
    title: 'Negotiated the sign-on to cover the RSU cliff and they said yes without blinking',
    body: 'The base and stock were fixed-ish but the sign-on bonus had room. Asked them to bump the year-1 sign-on to bridge the vesting gap. Easy yes. Sign-on is often the most flexible lever, ask about it specifically.',
  },
  {
    authorIndex: 1,
    categorySlug: 'offer',
    company: 'Zerodha',
    conclusion: 'ACCEPTED',
    daysAgo: 40,
    buoys: 6,
    anchors: 0,
    saves: 2,
    title: 'Chose the boring stable offer over the exciting risky one. Sleep is a compensation package',
    body: 'Startup with a wild upside vs a steady product company. Picked steady. My anxiety-to-income ratio has never been healthier. Exciting is overrated when you actually need to pay rent.',
  },
  {
    authorIndex: 9,
    categorySlug: 'offer',
    company: 'Adobe',
    conclusion: 'PENDING',
    daysAgo: 2,
    buoys: 5,
    anchors: 0,
    saves: 1,
    title: 'Verbal offer in hand, asked for a week to decide, using it to run a clean negotiation',
    body: 'Not rushing. Got the verbal, politely asked for a few days, and I am using them to line up one competing conversation and think about the manager fit. A week of patience is worth a lot of LPA.',
  },

  // =========================================================================
  // RANT (text only)
  // =========================================================================
  {
    authorIndex: 0,
    categorySlug: 'rant',
    daysAgo: 1,
    buoys: 16,
    anchors: 1,
    saves: 2,
    title: '"Entry-level role: 5 years experience required with a framework that is 3 years old"',
    body: 'The math has never mathed and it never will. Either you are hiring a time traveler or you copy-pasted the JD from a senior posting and forgot to read it.',
    comments: [
      { authorIndex: 12, body: 'I once saw "10 years of Kubernetes" required. K8s was 9 years old. Peak JD.', hoursAfter: 3, score: 12 },
      { authorIndex: 7, body: 'Apply anyway. The "requirements" are a wishlist, not a filter, half the time.', hoursAfter: 8, score: 6 },
    ],
  },
  {
    authorIndex: 11,
    categorySlug: 'rant',
    daysAgo: 4,
    buoys: 14,
    anchors: 0,
    saves: 1,
    title: 'Applied to a "junior" role. First interview question: "architect our entire platform"',
    body: 'Sir, this is a junior posting. I brought a resume, not a whiteboard and a crystal ball. The scope inflation on job titles this year is out of control.',
    comments: [
      { authorIndex: 4, body: 'Junior title, staff-engineer expectations, intern budget. The trifecta.', hoursAfter: 5, score: 9 },
    ],
  },
  {
    authorIndex: 5,
    categorySlug: 'rant',
    daysAgo: 9,
    buoys: 11,
    anchors: 0,
    saves: 1,
    title: 'Four rounds and a take-home for a 6-month contract. The interview was longer than the job',
    body: 'The effort-to-reward ratio in hiring has completely detached from reality. I have signed full-time offers with less scrutiny than this temp gig demanded.',
  },
  {
    authorIndex: 16,
    categorySlug: 'rant',
    daysAgo: 13,
    buoys: 10,
    anchors: 0,
    saves: 1,
    title: '"We are a family here" is a threat, not a benefit',
    body: 'Every time I hear it in an interview I mentally add 20% to the expected chaos and subtract the boundaries. Families do not put you on a PIP. Say "team" and mean it.',
    comments: [
      { authorIndex: 3, body: 'Families do not make you reapply for your own job in a reorg. Ice cold accurate.', hoursAfter: 6, score: 10 },
    ],
  },
  {
    authorIndex: 13,
    categorySlug: 'rant',
    daysAgo: 18,
    buoys: 9,
    anchors: 0,
    saves: 0,
    title: 'The "quick 15-minute call" that was 15 minutes of them reading my resume aloud to me',
    body: 'I wrote it. I have read it. I know what it says. Ask me something. Anything. The lowest-effort screening call format on earth and somehow the most common.',
  },
  {
    authorIndex: 8,
    categorySlug: 'rant',
    daysAgo: 24,
    buoys: 8,
    anchors: 0,
    saves: 0,
    title: '"Competitive salary." Compared to what? Say the number',
    body: 'If it were actually competitive you would lead with it. The refusal to post a range is the range. Salary secrecy is a policy that only ever benefits one side of the table.',
    comments: [
      { authorIndex: 19, body: 'No range in the JD = I assume it is bad until proven otherwise. Post the band.', hoursAfter: 4, score: 8 },
    ],
  },
  {
    authorIndex: 2,
    categorySlug: 'rant',
    daysAgo: 31,
    buoys: 7,
    anchors: 0,
    saves: 0,
    title: 'Rejected me, then the same recruiter messaged me about the same role two months later',
    body: 'You said no. Loudly. In writing. Now you are in my inbox being enthusiastic about the exact position. The role did not change. The desperation did. I have questions.',
  },
  {
    authorIndex: 18,
    categorySlug: 'rant',
    daysAgo: 39,
    buoys: 6,
    anchors: 0,
    saves: 0,
    title: '"This role can lead to full-time." So can literally any role. That is how jobs work',
    body: 'Dangling the possibility of the thing I applied for as if it is a bonus. It is the baseline. Stop selling me the floor as if it were the ceiling.',
  },
  {
    authorIndex: 6,
    categorySlug: 'rant',
    daysAgo: 47,
    buoys: 5,
    anchors: 1,
    saves: 0,
    title: 'Take-home said "roughly 2 hours". It took me nine. Companies, please be honest about scope',
    body: 'If it is a weekend project, say weekend project. The "2 hours" fiction just filters for people who lie about how long things take, which is a weird thing to select for.',
  },
  {
    authorIndex: 10,
    categorySlug: 'rant',
    daysAgo: 56,
    buoys: 5,
    anchors: 0,
    saves: 0,
    title: 'Got asked "why are you leaving your current role" in an interview for a job that is a layoff backfill',
    body: 'You know why. Everyone knows why. The whole industry knows why. The performative question when the answer is "the economy" is exhausting.',
  },

  // =========================================================================
  // MEME (text only)
  // =========================================================================
  {
    authorIndex: 4,
    categorySlug: 'meme',
    daysAgo: 2,
    buoys: 15,
    anchors: 0,
    saves: 1,
    title: 'My LinkedIn: "Open to work." My inbox: tumbleweeds and one crypto recruiter',
    body: 'He believes in me. Deeply. About a "web3 growth ninja" role paid in tokens. That is something, I guess.',
    comments: [
      { authorIndex: 15, body: 'The crypto recruiter is the pigeon that never leaves. Loyal, at least.', hoursAfter: 3, score: 11 },
    ],
  },
  {
    authorIndex: 12,
    categorySlug: 'meme',
    daysAgo: 5,
    buoys: 13,
    anchors: 0,
    saves: 0,
    title: 'Interviewer: "Where do you see yourself in 5 years?" Me: "Employed, ideally"',
    body: 'Ambitious, I know. Manifesting a signed offer and one (1) uninterrupted lunch break.',
    comments: [
      { authorIndex: 0, body: 'Correct answer honestly. Five-year plans died with stable employment.', hoursAfter: 6, score: 8 },
    ],
  },
  {
    authorIndex: 9,
    categorySlug: 'meme',
    daysAgo: 8,
    buoys: 12,
    anchors: 0,
    saves: 0,
    title: 'Me updating my resume for the 400th time as if a new font will fix the economy',
    body: 'Switched to a serif. Bolded a verb. Surely THIS is the change that lands the FAANG offer. The bullet points have achieved sentience and they are tired too.',
  },
  {
    authorIndex: 17,
    categorySlug: 'meme',
    daysAgo: 12,
    buoys: 11,
    anchors: 0,
    saves: 0,
    title: '"We will get back to you by end of week." Which week? You did not specify. I choose to believe never',
    body: 'Schrodinger\'s job offer: simultaneously coming and not coming until you open the inbox and collapse the waveform into another rejection.',
    comments: [
      { authorIndex: 5, body: 'Schrodinger\'s offer is the most accurate description of this whole process.', hoursAfter: 4, score: 9 },
    ],
  },
  {
    authorIndex: 1,
    categorySlug: 'meme',
    daysAgo: 17,
    buoys: 10,
    anchors: 0,
    saves: 0,
    title: 'LeetCode streak: 200 days. Offers: 0. But my two-pointer technique is IMMACULATE',
    body: 'I cannot pay rent but I can reverse a linked list in three languages under stress. The grind is real, the ROI is a rumor.',
    comments: [
      { authorIndex: 13, body: 'The linked list has never once come up in my actual job. Not once.', hoursAfter: 7, score: 10 },
    ],
  },
  {
    authorIndex: 14,
    categorySlug: 'meme',
    daysAgo: 22,
    buoys: 9,
    anchors: 0,
    saves: 0,
    title: 'HR: "This is a fast-paced environment." Translation: nobody has written documentation since 2019',
    body: 'Fast-paced = we will onboard you by throwing you in the ocean and vibing. Bring a floatie.',
  },
  {
    authorIndex: 7,
    categorySlug: 'meme',
    daysAgo: 28,
    buoys: 8,
    anchors: 0,
    saves: 0,
    title: 'The five stages of job hunting: apply, hope, refresh inbox, refresh inbox, refresh inbox',
    body: 'Denial, anger, bargaining, opening the spam folder just in case, acceptance. Repeat daily.',
  },
  {
    authorIndex: 3,
    categorySlug: 'meme',
    daysAgo: 35,
    buoys: 7,
    anchors: 0,
    saves: 0,
    title: 'Recruiter: "Do you have 8 years of experience?" Me, 24: "In this economy I have aged 40"',
    body: 'Spiritually I have the experience. The calendar disagrees but the calendar has not seen my inbox.',
  },
  {
    authorIndex: 19,
    categorySlug: 'meme',
    daysAgo: 44,
    buoys: 6,
    anchors: 0,
    saves: 0,
    title: '"We are like a startup within a big company." So, no budget AND no equity. Understood',
    body: 'The worst of both worlds sold as a perk. Chaos of a startup, bureaucracy of a corporation, upside of neither.',
  },
  {
    authorIndex: 11,
    categorySlug: 'meme',
    daysAgo: 53,
    buoys: 6,
    anchors: 0,
    saves: 0,
    title: 'My browser has 47 tabs open and 46 of them are "application submitted" confirmation pages',
    body: 'The 47th is LeetCode. My laptop fan sounds like it is also job hunting and losing.',
  },

  // =========================================================================
  // BAD BOSS (company)
  // =========================================================================
  {
    authorIndex: 3,
    categorySlug: 'bad-boss',
    company: 'Cognizant',
    daysAgo: 3,
    buoys: 12,
    anchors: 0,
    saves: 2,
    title: 'My manager schedules "quick syncs" at 6pm on Fridays to feel important',
    body: 'Never urgent. Never a decision. Just a standing hostage situation at the exact moment the week should end. The calendar invite is the only power he has and he uses it religiously.',
    comments: [
      { authorIndex: 8, body: 'The 6pm Friday sync is a personality type, not a meeting. Run.', hoursAfter: 4, score: 9 },
    ],
  },
  {
    authorIndex: 10,
    categorySlug: 'bad-boss',
    company: 'Capgemini',
    daysAgo: 7,
    buoys: 10,
    anchors: 0,
    saves: 1,
    title: 'Took credit for my project in the all-hands, used the word "we", meant "me watching him"',
    body: 'Six weeks of my work, presented in the first person, while I sat in the audience clapping like a hostage. Documented everything after that. Paper trails are self-defense.',
    comments: [
      { authorIndex: 15, body: 'Always CC yourself on the wins. The paper trail is the only thing that survives a reorg.', hoursAfter: 6, score: 7 },
    ],
  },
  {
    authorIndex: 5,
    categorySlug: 'bad-boss',
    company: 'HCLTech',
    daysAgo: 14,
    buoys: 8,
    anchors: 0,
    saves: 1,
    title: 'Manager approved my leave, then guilt-tripped me every day of it via Slack',
    body: '"No pressure, enjoy your holiday!" followed by "just when you get a sec" messages every four hours. Approved leave with an asterisk is not leave, it is remote work with worse wifi.',
  },
  {
    authorIndex: 16,
    categorySlug: 'bad-boss',
    company: 'Tech Mahindra',
    daysAgo: 25,
    buoys: 7,
    anchors: 0,
    saves: 0,
    title: '"Why do you need a raise, is money your only motivation?" Yes. It is a job',
    body: 'Asked, professionally, with data. Got a lecture about passion. Passion does not pay my EMI. The audacity of framing wanting fair pay as a character flaw.',
    comments: [
      { authorIndex: 2, body: '"Is money your only motivation" from the guy whose motivation is definitely money.', hoursAfter: 5, score: 11 },
    ],
  },
  {
    authorIndex: 13,
    categorySlug: 'bad-boss',
    company: 'IBM',
    daysAgo: 33,
    buoys: 6,
    anchors: 0,
    saves: 0,
    title: 'Skip-level manager told me to "be more visible", then talked over me in every meeting',
    body: 'Be visible, but not in this meeting. Speak up, but not right now. The advice and the environment were in direct contradiction and somehow that was my problem to solve.',
  },
  {
    authorIndex: 7,
    categorySlug: 'bad-boss',
    company: 'Oracle',
    daysAgo: 41,
    buoys: 5,
    anchors: 0,
    saves: 0,
    title: 'Micromanager asked for a status update on the status update I sent an hour ago',
    body: 'The update on the update. We have reached peak process. I spend more time reporting the work than doing the work, which I assume is the point.',
  },
  {
    authorIndex: 18,
    categorySlug: 'bad-boss',
    company: 'Wipro',
    daysAgo: 50,
    buoys: 5,
    anchors: 0,
    saves: 0,
    title: 'Boss: "We do not watch the clock here." Also boss: messaged at 11:47pm asking why I logged off',
    body: 'The flexibility is a one-way street and it runs toward the company. "Unlimited leave" energy: technically infinite, practically zero.',
    comments: [
      { authorIndex: 4, body: 'Unlimited PTO = unlimited guilt, zero actual days off. Every time.', hoursAfter: 8, score: 8 },
    ],
  },

  // =========================================================================
  // BURNOUT (text only)
  // =========================================================================
  {
    authorIndex: 2,
    categorySlug: 'burnout',
    daysAgo: 2,
    buoys: 11,
    anchors: 0,
    saves: 3,
    title: 'I job hunt after work now and it is a second full-time job with worse pay (none)',
    body: 'Code all day, apply all evening, mock interview on weekends. The search has eaten the rest of my life and there is no salary for the search. Trying to give myself two guilt-free evenings a week. Recommend it.',
    comments: [
      { authorIndex: 9, body: 'Blocking two no-apply evenings a week saved my sanity. The search is a marathon, not a sprint.', hoursAfter: 5, score: 8 },
      { authorIndex: 12, body: 'Nobody tells you the job hunt is unpaid overtime. Solidarity.', hoursAfter: 11, score: 6 },
    ],
  },
  {
    authorIndex: 11,
    categorySlug: 'burnout',
    daysAgo: 9,
    buoys: 9,
    anchors: 0,
    saves: 2,
    title: 'I hit "apply" today and felt absolutely nothing. No hope, no dread, just static',
    body: 'The rejections stopped hurting, which sounds like progress but feels like going numb. Taking the weekend fully off the search. The numbness is a signal, not a strength.',
    comments: [
      { authorIndex: 5, body: 'The numbness is your brain protecting you. Rest is part of the strategy, not a break from it.', hoursAfter: 7, score: 9 },
    ],
  },
  {
    authorIndex: 6,
    categorySlug: 'burnout',
    daysAgo: 20,
    buoys: 7,
    anchors: 0,
    saves: 1,
    title: 'Grinding LeetCode until midnight, then dreaming about sliding windows. This is not sustainable',
    body: 'When the interview prep starts colonizing your sleep, something is off. Cutting to a fixed two problems a day and actually stopping. Quality over the guilt-driven grind.',
  },
  {
    authorIndex: 14,
    categorySlug: 'burnout',
    daysAgo: 34,
    buoys: 6,
    anchors: 0,
    saves: 1,
    title: 'Six months unemployed and the hardest part is not the money, it is the invisibility',
    body: 'No standup to join, no team asking how you are, no external structure. You slowly stop feeling like a professional at all. Made a daily routine just to feel like a person. It helps more than it should.',
    comments: [
      { authorIndex: 0, body: 'The invisibility is the part nobody warns you about. A routine is a lifeline. Hang in there.', hoursAfter: 6, score: 7 },
    ],
  },
  {
    authorIndex: 17,
    categorySlug: 'burnout',
    daysAgo: 48,
    buoys: 5,
    anchors: 0,
    saves: 1,
    title: 'I have a stable job and I am burned out from interviewing for a better one on the side',
    body: 'The "quietly interviewing while employed" grind is its own special exhaustion. Lying about dentist appointments, coding at lunch, the constant low-grade guilt. Nobody sees this labor.',
  },

  // =========================================================================
  // DISCUSSION (optional poll)
  // =========================================================================
  {
    authorIndex: 1,
    categorySlug: 'discussion',
    daysAgo: 3,
    buoys: 13,
    anchors: 0,
    saves: 2,
    title: 'How many applications did it actually take you to land your last role?',
    body: 'Curious what "normal" really looks like right now, because LinkedIn makes it seem like everyone got a referral on the first try. Drop your real number, no judgment.',
    comments: [
      { authorIndex: 4, body: '63 applications, 5 interviews, 1 offer. The funnel is brutal at the top.', hoursAfter: 3, score: 9 },
      { authorIndex: 8, body: 'Honestly 4. All referrals. The portal number would have been 200+.', hoursAfter: 5, score: 6 },
      { authorIndex: 16, body: 'Somewhere past 120 I stopped counting. Referrals are the cheat code.', hoursAfter: 9, score: 5 },
    ],
  },
  {
    authorIndex: 9,
    categorySlug: 'discussion',
    daysAgo: 6,
    buoys: 11,
    anchors: 0,
    saves: 1,
    title: 'Does anyone actually land jobs from cold portal applications anymore?',
    body: 'Every offer I have ever gotten came from a referral or a recruiter reaching out. The application portal increasingly feels like a black hole with extra steps. Prove me wrong?',
    comments: [
      { authorIndex: 13, body: 'Got my current job cold off the careers page. Rare, but it happens. Do not give up on it entirely.', hoursAfter: 4, score: 7 },
      { authorIndex: 2, body: 'Cold apps are a numbers game now. Referrals are a relationships game. Play both.', hoursAfter: 10, score: 8 },
    ],
  },
  {
    authorIndex: 15,
    categorySlug: 'discussion',
    daysAgo: 15,
    buoys: 9,
    anchors: 0,
    saves: 1,
    title: 'Referrals: genuine game-changer or overrated?',
    poll: ['Total game-changer', 'Slightly overrated', 'Depends on the company', 'Never got one to test'],
  },
  {
    authorIndex: 6,
    categorySlug: 'discussion',
    daysAgo: 23,
    buoys: 8,
    anchors: 0,
    saves: 1,
    title: 'Is turning on the "Open to Work" banner helping anyone, or is it a scarlet letter?',
    body: 'Half the internet says it signals desperation, the other half says it triples recruiter reach. I have data for exactly zero of these claims. What actually happened for you?',
    comments: [
      { authorIndex: 5, body: 'Turned it on, recruiter messages 3x-ed. Zero downside I could measure. Turn it on.', hoursAfter: 6, score: 6 },
    ],
  },
  {
    authorIndex: 12,
    categorySlug: 'discussion',
    daysAgo: 38,
    buoys: 7,
    anchors: 0,
    saves: 1,
    title: 'What is the actual half-life of a job posting? When is "still open" a lie?',
    body: 'Applied to something posted 30+ days ago. Reposted, or genuinely still hunting, or already-hired-and-forgot-to-close? Trying to figure out where to spend my limited energy.',
  },
  {
    authorIndex: 18,
    categorySlug: 'discussion',
    daysAgo: 45,
    buoys: 6,
    anchors: 0,
    saves: 0,
    title: 'Notice period in India is killing my job search. How are you all handling the 60-90 day wait?',
    body: 'Companies want you "immediately" and my current one holds me for two months. Half the offers evaporate before I can even join. How do you bridge the gap without burning bridges?',
    comments: [
      { authorIndex: 7, body: 'Negotiate buyout in the new offer, some companies will cover it. Ask early.', hoursAfter: 5, score: 7 },
    ],
  },
  {
    authorIndex: 3,
    categorySlug: 'discussion',
    daysAgo: 59,
    buoys: 5,
    anchors: 0,
    saves: 0,
    title: 'AI resume screeners: are we all just writing for the bot now?',
    body: 'Keyword-stuffing to beat the ATS, then writing a human version for the human. Two resumes for two audiences. Is anyone else exhausted by performing for a parser?',
  },

  // =========================================================================
  // ADVICE (optional poll)
  // =========================================================================
  {
    authorIndex: 8,
    categorySlug: 'advice',
    daysAgo: 4,
    buoys: 12,
    anchors: 0,
    saves: 4,
    title: 'Recruiter is demanding my current CTC before they will share the range. How do I dodge cleanly?',
    body: 'Contract-heavy market, I would rather anchor on the role budget than my old number. Looking for wording that does not make me sound difficult on the very first call. What actually works for you?',
    comments: [
      { authorIndex: 4, body: '"I am focused on the value of this role, what range have you budgeted?" Redirect, do not refuse.', hoursAfter: 3, score: 10 },
      { authorIndex: 13, body: 'Give a target, not a history: "I am looking for roles in the X-Y band." Legal, clean, effective.', hoursAfter: 7, score: 8 },
    ],
  },
  {
    authorIndex: 5,
    categorySlug: 'advice',
    daysAgo: 11,
    buoys: 10,
    anchors: 0,
    saves: 3,
    title: 'Two offers: boring-but-stable vs exciting-but-risky. How did you actually decide?',
    poll: ['Take the money', 'Take the growth', 'Try to negotiate both up', 'Follow the manager'],
  },
  {
    authorIndex: 14,
    categorySlug: 'advice',
    daysAgo: 19,
    buoys: 9,
    anchors: 0,
    saves: 2,
    title: 'How do you explain a 6-month employment gap without it becoming the whole interview?',
    body: 'Layoff, then a genuinely rough market. I do not want to over-apologize but I also do not want to lie. What framing has worked for you without inviting a follow-up spiral?',
    comments: [
      { authorIndex: 0, body: 'One calm sentence + pivot: "Team was cut in a reorg, I used the time to X, and I am excited about Y." Then stop.', hoursAfter: 4, score: 11 },
      { authorIndex: 11, body: 'Gaps are normal now. Say it plainly and unapologetically and most interviewers move on.', hoursAfter: 9, score: 6 },
    ],
  },
  {
    authorIndex: 17,
    categorySlug: 'advice',
    daysAgo: 30,
    buoys: 7,
    anchors: 0,
    saves: 2,
    title: 'Should I take a title cut to get into a better company? Torn',
    body: 'Senior at a no-name shop, they are offering me a mid-level title at a top product company for similar money. Ego says no, brain says the brand + scope compounds. What would you do?',
    comments: [
      { authorIndex: 6, body: 'Titles are local currency, they do not transfer. Scope and brand do. Take the jump.', hoursAfter: 6, score: 8 },
    ],
  },
  {
    authorIndex: 1,
    categorySlug: 'advice',
    daysAgo: 43,
    buoys: 6,
    anchors: 0,
    saves: 2,
    title: 'My best interview prep move: recording myself answering behavioral questions',
    body: 'Cringed at the playback, saw every "um" and rambling STAR story, fixed them. Nobody wants to watch themselves, which is exactly why it works. Ten minutes of tape beats an hour of reading tips.',
    comments: [
      { authorIndex: 9, body: 'The playback is painful and it is the single highest-ROI prep thing I have ever done.', hoursAfter: 5, score: 7 },
    ],
  },

  // =========================================================================
  // POLL (required)
  // =========================================================================
  {
    authorIndex: 4,
    categorySlug: 'poll',
    daysAgo: 2,
    buoys: 14,
    anchors: 0,
    saves: 1,
    title: 'What is the worst part of the job hunt right now?',
    poll: ['The ghosting', 'Unpaid take-homes', 'Endless rounds', 'The salary games'],
    comments: [
      { authorIndex: 8, body: 'Ghosting by a mile. A fast no is a gift by comparison.', hoursAfter: 4, score: 8 },
    ],
  },
  {
    authorIndex: 10,
    categorySlug: 'poll',
    daysAgo: 7,
    buoys: 12,
    anchors: 0,
    saves: 1,
    title: 'How long after "we will be in touch" do you officially consider yourself ghosted?',
    poll: ['3 days', '1 week', '2 weeks', 'It already happened'],
  },
  {
    authorIndex: 15,
    categorySlug: 'poll',
    daysAgo: 16,
    buoys: 10,
    anchors: 0,
    saves: 0,
    title: 'Biggest interview red flag?',
    poll: ['"We are like a family"', 'Unpaid take-home', '5+ rounds', 'Wont share the salary range'],
  },
  {
    authorIndex: 6,
    categorySlug: 'poll',
    daysAgo: 27,
    buoys: 9,
    anchors: 0,
    saves: 0,
    title: 'What actually got you your last offer?',
    poll: ['Referral', 'Cold application', 'Recruiter reached out', 'Networking / community'],
  },
  {
    authorIndex: 13,
    categorySlug: 'poll',
    daysAgo: 40,
    buoys: 8,
    anchors: 0,
    saves: 0,
    title: 'How many rounds is too many rounds?',
    poll: ['3 is the limit', '4 is fine', '5 if they pay well', 'However many, I am desperate'],
  },

  // =========================================================================
  // COMEBACK (company)
  // =========================================================================
  {
    authorIndex: 8,
    categorySlug: 'comeback',
    company: 'Microsoft',
    daysAgo: 1,
    buoys: 18,
    anchors: 0,
    saves: 6,
    title: '60 applications, 40 rejections, 8 ghosts, 1 offer. I start Monday',
    body: 'Saving this here so the next person doom-scrolling at 2am knows the numbers can end well. The ratio looks like failure right up until the exact moment it does not. Keep swimming.',
    comments: [
      { authorIndex: 0, body: 'This is the exact post that keeps people going. Congratulations, you earned every bit of it.', hoursAfter: 2, score: 12 },
      { authorIndex: 11, body: 'Framing the ratio honestly instead of "grateful to announce" is why this community matters.', hoursAfter: 5, score: 9 },
    ],
  },
  {
    authorIndex: 14,
    categorySlug: 'comeback',
    company: 'Flipkart',
    daysAgo: 8,
    buoys: 13,
    anchors: 0,
    saves: 3,
    title: 'Laid off in Q1, wrote my first "I got a job" post in Q3. The gap was a chapter, not the end',
    body: 'Seven months. A lot of doubt, some therapy, a rebuilt routine. If you are in the tunnel right now, there genuinely is a door. It just does not announce itself until you are almost on it.',
    comments: [
      { authorIndex: 5, body: '"A chapter, not the end." Screenshotting this for the group chat of fellow layoff survivors.', hoursAfter: 6, score: 8 },
    ],
  },
  {
    authorIndex: 2,
    categorySlug: 'comeback',
    company: 'Razorpay',
    daysAgo: 18,
    buoys: 10,
    anchors: 0,
    saves: 2,
    title: 'Failed the same company twice, got in on the third try two years later',
    body: 'Rejected in 2023, rejected in 2024, offer in 2025. Same company, better me each time. A no is a "not yet" more often than the sting lets you believe.',
    comments: [
      { authorIndex: 16, body: 'Third time at the same place is such a specific kind of vindication. Congrats.', hoursAfter: 7, score: 6 },
    ],
  },
  {
    authorIndex: 17,
    categorySlug: 'comeback',
    company: 'Zomato',
    daysAgo: 31,
    buoys: 8,
    anchors: 0,
    saves: 2,
    title: 'Career-switched from support to SWE at 29. It took 14 months and it was worth every one',
    body: 'Nights and weekends learning, a lot of "you are too old to switch" comments, one manager who took a chance. If you are mid-career and doubting the pivot: slower is not the same as impossible.',
    comments: [
      { authorIndex: 9, body: 'Switched at 31 myself. "Too old" is the most expensive lie in tech. Congrats.', hoursAfter: 8, score: 9 },
    ],
  },
  {
    authorIndex: 6,
    categorySlug: 'comeback',
    company: 'Atlassian',
    daysAgo: 49,
    buoys: 7,
    anchors: 0,
    saves: 1,
    title: 'Bombed a final round so badly I wanted to disappear. Different company, same questions, nailed it a month later',
    body: 'The disaster interview was free training for the one that counted. Every faceplant taught me the exact question I would get again. Bomb forward.',
  },

  // =========================================================================
  // LAYOFF (company)
  // =========================================================================
  {
    authorIndex: 7,
    categorySlug: 'layoff',
    company: 'Meta',
    daysAgo: 4,
    buoys: 11,
    anchors: 0,
    saves: 2,
    title: 'Laid off via a calendar invite titled "Quick sync". Fifteen minutes, no agenda',
    body: 'In hindsight the vaguest meeting title of my life was the loudest possible signal. Badge off before the call ended. If you ever get an unexplained 15-minute invite from two levels up, back up your contacts.',
    comments: [
      { authorIndex: 3, body: 'The "quick sync" with no agenda from a skip-level is the modern pink slip. Chilling.', hoursAfter: 5, score: 9 },
    ],
  },
  {
    authorIndex: 12,
    categorySlug: 'layoff',
    company: 'Amazon',
    daysAgo: 12,
    buoys: 9,
    anchors: 0,
    saves: 1,
    title: 'Survived three rounds of layoffs. My morale did not survive the fourth',
    body: 'Every quarter, another "difficult decision". The survivors are not lucky, they are exhausted and doing three jobs. Quietly hunting now. "Do more with less" has a floor and we are through it.',
    comments: [
      { authorIndex: 18, body: 'Survivor guilt + tripled workload is its own layoff, just slower. Get out while you can choose.', hoursAfter: 6, score: 8 },
    ],
  },
  {
    authorIndex: 5,
    categorySlug: 'layoff',
    company: 'Google',
    daysAgo: 26,
    buoys: 7,
    anchors: 0,
    saves: 1,
    title: 'Got laid off two weeks after a "strong" performance review. The review means nothing in a reorg',
    body: 'Glowing feedback in one meeting, role eliminated in the next. It was never about performance, it was a headcount spreadsheet. Do not tie your self-worth to a review that a reorg can overrule overnight.',
  },
  {
    authorIndex: 19,
    categorySlug: 'layoff',
    company: 'Salesforce',
    daysAgo: 41,
    buoys: 6,
    anchors: 0,
    saves: 1,
    title: 'The layoff email came at 5am so it would be "done before the workday". It was not more humane, just quieter',
    body: 'Woke up to a company-wide email and a dead badge. The choreography of a modern layoff is designed for the company\'s optics, not your dignity. Document your work now, while you still have access.',
  },

  // =========================================================================
  // WIN (company)
  // =========================================================================
  {
    authorIndex: 9,
    categorySlug: 'win',
    company: 'Stripe',
    daysAgo: 2,
    buoys: 13,
    anchors: 0,
    saves: 2,
    title: 'Shipped my first feature to production and watched real users use it. Small thing, huge feeling',
    body: 'After months of job-hunt limbo, being back in the arena and actually building again hit different. The dashboard ticked up by one real human and I grinned like an idiot. We move.',
    comments: [
      { authorIndex: 4, body: 'That first real-user moment never gets old. Congrats on being back in it.', hoursAfter: 4, score: 6 },
    ],
  },
  {
    authorIndex: 16,
    categorySlug: 'win',
    company: 'Razorpay',
    daysAgo: 10,
    buoys: 10,
    anchors: 0,
    saves: 1,
    title: 'Negotiated my first-ever raise instead of switching jobs, and it worked',
    body: 'Everyone said you have to leave to earn more. I brought data, a competing range, and a calm ask. Got a real bump without the notice-period rollercoaster. Sometimes the grass is greener where you water it, with evidence.',
    comments: [
      { authorIndex: 13, body: 'Internal negotiation with a real external offer as leverage is underrated. Well done.', hoursAfter: 6, score: 7 },
    ],
  },
  {
    authorIndex: 3,
    categorySlug: 'win',
    company: 'CRED',
    daysAgo: 24,
    buoys: 8,
    anchors: 0,
    saves: 1,
    title: 'Mentored a junior through their first on-call and realized I actually know things now',
    body: 'Two years ago that was me, panicking at 3am. Today I was the calm voice. Growth is invisible until someone else needs the thing you learned the hard way.',
  },
  {
    authorIndex: 11,
    categorySlug: 'win',
    company: 'Zerodha',
    daysAgo: 38,
    buoys: 7,
    anchors: 0,
    saves: 1,
    title: 'Said no to a toxic-but-prestigious offer and took the calmer one. Best career decision I have made',
    body: 'Turned down the big logo because every signal in the loop screamed burnout. Six months into the "boring" choice and I have hobbies again. Prestige is a terrible painkiller.',
    comments: [
      { authorIndex: 2, body: 'Walking away from a prestigious-but-toxic offer takes more strength than accepting one. Respect.', hoursAfter: 9, score: 8 },
    ],
  },

  // =========================================================================
  // CORPORATE CRINGE (text only)
  // =========================================================================
  {
    authorIndex: 0,
    categorySlug: 'corporate-cringe',
    daysAgo: 3,
    buoys: 12,
    anchors: 0,
    saves: 1,
    title: 'HR renamed the layoffs to a "strategic workforce rebalancing initiative"',
    body: 'Fourteen syllables to avoid one honest word. The thesaurus worked harder that week than the retention team ever did.',
    comments: [
      { authorIndex: 8, body: '"Rightsizing", "streamlining", "involuntary attrition". The euphemism budget is bottomless.', hoursAfter: 4, score: 10 },
    ],
  },
  {
    authorIndex: 13,
    categorySlug: 'corporate-cringe',
    daysAgo: 9,
    buoys: 10,
    anchors: 0,
    saves: 0,
    title: 'We got a pizza party the same week they cancelled the annual bonus',
    body: 'Cold pizza as compensation for a five-figure loss. The morale committee has a budget and it is exactly one Domino\'s order. They even sent a survey asking if we felt valued.',
    comments: [
      { authorIndex: 5, body: 'The bonus-to-pizza exchange rate is the truest measure of how a company sees you.', hoursAfter: 6, score: 9 },
    ],
  },
  {
    authorIndex: 6,
    categorySlug: 'corporate-cringe',
    daysAgo: 22,
    buoys: 8,
    anchors: 0,
    saves: 0,
    title: 'Mandatory "fun" team-building at 7pm on a weekday, attendance tracked',
    body: 'Nothing says spontaneous joy like a calendar invite with a mandatory RSVP and a sign-in sheet. Forced fun is just a meeting wearing a party hat.',
  },
  {
    authorIndex: 18,
    categorySlug: 'corporate-cringe',
    daysAgo: 37,
    buoys: 7,
    anchors: 0,
    saves: 0,
    title: 'CEO posted about "hard times, we are all tightening our belts" from a yacht',
    body: 'The geotag did the heavy lifting. We are all in this together, apparently, from very different postal codes. The belt-tightening was, as always, a one-way instruction.',
    comments: [
      { authorIndex: 10, body: '"We are all in this together" has never once included the person saying it.', hoursAfter: 7, score: 11 },
    ],
  },

  // =========================================================================
  // RESOURCE (text only)
  // =========================================================================
  {
    authorIndex: 15,
    categorySlug: 'resource',
    daysAgo: 5,
    buoys: 11,
    anchors: 0,
    saves: 5,
    title: 'The one salary-negotiation line I have ever actually needed',
    body: '"Is there any flexibility on the base?" Then say nothing. Let the silence sit. It works far more often than it has any right to, because most first offers have deliberate room built in.',
    comments: [
      { authorIndex: 4, body: 'The silence after the ask is the whole technique. Do not rescue them from it.', hoursAfter: 4, score: 8 },
    ],
  },
  {
    authorIndex: 9,
    categorySlug: 'resource',
    daysAgo: 17,
    buoys: 9,
    anchors: 0,
    saves: 4,
    title: 'My interview-tracking system: one sheet, five columns, zero fancy tools',
    body: 'Company, role, stage, next action, date. That is it. Every dropped ball I ever had was a "next action" I never wrote down. The tool does not matter, the habit of writing the next step does.',
    comments: [
      { authorIndex: 13, body: '"Next action" as its own column is the whole trick. Stole this, thank you.', hoursAfter: 6, score: 6 },
    ],
  },
  {
    authorIndex: 2,
    categorySlug: 'resource',
    daysAgo: 33,
    buoys: 8,
    anchors: 0,
    saves: 4,
    title: 'Before any onsite, I write the 3 stories I will force into every behavioral answer',
    body: 'A conflict, a failure, a win. Three stories, pre-loaded, adaptable to almost any "tell me about a time". You will never be caught blank, and prepared beats spontaneous every single time in a behavioral round.',
    comments: [
      { authorIndex: 17, body: 'Three reusable stories is the cheat code for behavioral rounds. Simple and it works.', hoursAfter: 8, score: 7 },
    ],
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
  const seedUsers = await prisma.user.findMany({
    where: { supabaseUserId: { startsWith: SEED_PREFIX } },
    select: { id: true },
  });
  const userIds = seedUsers.map((u) => u.id);
  if (userIds.length === 0) return { users: 0, sinks: 0 };

  const seedSinks = await prisma.sink.findMany({
    where: { userId: { in: userIds } },
    select: { id: true },
  });
  const sinkIds = seedSinks.map((s) => s.id);

  const seedComments = await prisma.comment.findMany({
    where: { OR: [{ userId: { in: userIds } }, { sinkId: { in: sinkIds } }] },
    select: { id: true },
  });
  const commentIds = seedComments.map((c) => c.id);

  // Delete children before parents (FK-safe order).
  await prisma.pollVote.deleteMany({
    where: {
      OR: [{ userId: { in: userIds } }, { option: { sinkId: { in: sinkIds } } }],
    },
  });
  await prisma.pollOption.deleteMany({ where: { sinkId: { in: sinkIds } } });
  await prisma.bookmark.deleteMany({
    where: { OR: [{ userId: { in: userIds } }, { sinkId: { in: sinkIds } }] },
  });
  await prisma.vote.deleteMany({
    where: { OR: [{ userId: { in: userIds } }, { sinkId: { in: sinkIds } }] },
  });
  await prisma.commentVote.deleteMany({
    where: { OR: [{ userId: { in: userIds } }, { commentId: { in: commentIds } }] },
  });
  // Replies reference parent comments, so clear replies first, then the rest.
  await prisma.comment.deleteMany({
    where: { id: { in: commentIds }, parentId: { not: null } },
  });
  await prisma.comment.deleteMany({ where: { id: { in: commentIds } } });
  await prisma.report.deleteMany({ where: { reporterId: { in: userIds } } });
  await prisma.sink.deleteMany({ where: { id: { in: sinkIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });

  return { users: userIds.length, sinks: sinkIds.length };
}
