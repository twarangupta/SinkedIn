/**
 * Sink service — business logic for creating and listing Sinks.
 *
 * The category-conditional rules live HERE (not in Zod), because they depend on
 * the chosen category's config flags, which we look up at runtime:
 *   - requiresPoll        → pollOptions must be present (>= 2)
 *   - conclusion === OTHER → conclusionOther must be non-empty
 *   - fields the category doesn't use are stripped (company, conclusion, poll)
 *
 * Privacy: the public select never exposes the author's supabaseUserId — only
 * their handle.
 */

import { Prisma, type Conclusion, type VoteValue } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { findOrCreateCompany } from './companies.service.js';

export interface CreateSinkInput {
  categoryId: string;
  title: string;
  body?: string;
  imageUrl?: string;
  company?: string;
  conclusion?: Conclusion;
  conclusionOther?: string;
  pollOptions?: string[];
}

/**
 * Fields an author may edit after posting. Category and poll options are locked
 * (polls already carry votes); everything here is text or the image. A field
 * left `undefined` is untouched; passing `null` clears a nullable field.
 */
export interface UpdateSinkInput {
  title?: string;
  body?: string | null;
  imageUrl?: string | null;
  company?: string | null;
  conclusion?: Conclusion | null;
  conclusionOther?: string | null;
}

/** Fields safe to return for a Sink (author reduced to id + handle). */
const sinkPublicSelect = {
  id: true,
  title: true,
  body: true,
  imageUrl: true,
  company: true,
  companyRef: { select: { domain: true } }, // for the company logo (domain only)
  conclusion: true,
  conclusionOther: true,
  score: true,
  createdAt: true,
  category: { select: { id: true, name: true, slug: true, color: true } },
  user: { select: { id: true, handle: true, avatarId: true } },
  pollOptions: {
    select: {
      id: true,
      label: true,
      position: true,
      _count: { select: { votes: true } },
    },
    orderBy: { position: 'asc' },
  },
  _count: { select: { comments: true, votes: true, bookmarks: true } },
  // The single "top comment" to preview on the feed card: highest-scored
  // top-level (non-reply) comment, ties broken by newest — so an unvoted Sink
  // still shows its newest comment rather than an empty slot.
  comments: {
    where: { deletedAt: null, parentId: null },
    orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
    take: 1,
    select: {
      id: true,
      body: true,
      score: true,
      createdAt: true,
      user: { select: { id: true, handle: true, avatarId: true } },
    },
  },
} satisfies Prisma.SinkSelect;

/**
 * Create a Sink for a user, applying the category's config-conditional rules.
 * Poll options (if any) are created in the same write.
 */
export async function createSink(userId: string, input: CreateSinkInput) {
  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
    select: {
      id: true,
      showsCompany: true,
      showsConclusion: true,
      allowsPoll: true,
      requiresPoll: true,
    },
  });
  if (!category) {
    throw new AppError('Category not found', 404);
  }

  // Strip fields this category doesn't surface.
  const company = category.showsCompany ? input.company : undefined;
  const conclusion = category.showsConclusion ? input.conclusion : undefined;

  // conclusion === OTHER requires the free-text field.
  let conclusionOther: string | undefined;
  if (conclusion === 'OTHER') {
    if (!input.conclusionOther?.trim()) {
      throw new AppError('conclusionOther is required when conclusion is OTHER');
    }
    conclusionOther = input.conclusionOther.trim();
  }

  // Poll handling: only if the category allows it; mandatory if it requires it.
  const pollOptions = category.allowsPoll ? input.pollOptions : undefined;
  if (category.requiresPoll && (!pollOptions || pollOptions.length < 2)) {
    throw new AppError('This category requires a poll with at least 2 options');
  }

  // Link the free-text company to a centralized Company (logos + company pages).
  const companyRef = company ? await findOrCreateCompany(company, userId) : null;

  return prisma.sink.create({
    data: {
      userId,
      categoryId: category.id,
      title: input.title,
      body: input.body,
      imageUrl: input.imageUrl,
      company,
      companyId: companyRef?.id ?? null,
      conclusion,
      conclusionOther,
      pollOptions: pollOptions
        ? { create: pollOptions.map((label, index) => ({ label, position: index })) }
        : undefined,
    },
    select: sinkPublicSelect,
  });
}

type SinkRow = Prisma.SinkGetPayload<{ select: typeof sinkPublicSelect }>;
type TopComment = SinkRow['comments'][number];

type SinkWithMyState = Omit<SinkRow, 'comments'> & {
  topComment: TopComment | null;
  myVote: VoteValue | null;
  myPollVote: string | null;
};

/**
 * Attach the current user's per-Sink state so the UI can highlight what they
 * picked: their Buoy/Anchor vote (`myVote`) and their poll choice
 * (`myPollVote` = the chosen PollOption id, or null). Anonymous callers get
 * null everywhere. One query each, batched across all the Sinks passed in.
 */
async function attachMyState(
  sinks: SinkRow[],
  userId?: string,
): Promise<SinkWithMyState[]> {
  if (!userId || sinks.length === 0) {
    return sinks.map(({ comments, ...s }) => ({
      ...s,
      topComment: comments[0] ?? null,
      myVote: null,
      myPollVote: null,
    }));
  }

  // Buoy/Anchor votes, keyed by sink id.
  const votes = await prisma.vote.findMany({
    where: { userId, sinkId: { in: sinks.map((s) => s.id) } },
    select: { sinkId: true, value: true },
  });
  const voteBySink = new Map(votes.map((v) => [v.sinkId, v.value]));

  // Poll votes: map each poll option id back to its sink, then look up the
  // user's votes across all those options in one query.
  const optionToSink = new Map<string, string>();
  for (const s of sinks) {
    for (const option of s.pollOptions) optionToSink.set(option.id, s.id);
  }
  const pollVoteBySink = new Map<string, string>();
  if (optionToSink.size > 0) {
    const pollVotes = await prisma.pollVote.findMany({
      where: { userId, pollOptionId: { in: [...optionToSink.keys()] } },
      select: { pollOptionId: true },
    });
    for (const pv of pollVotes) {
      const sinkId = optionToSink.get(pv.pollOptionId);
      if (sinkId) pollVoteBySink.set(sinkId, pv.pollOptionId);
    }
  }

  return sinks.map(({ comments, ...s }) => ({
    ...s,
    topComment: comments[0] ?? null,
    myVote: voteBySink.get(s.id) ?? null,
    myPollVote: pollVoteBySink.get(s.id) ?? null,
  }));
}

/**
 * The feed: non-deleted Sinks, optionally filtered by category slug.
 * If userId is passed, each Sink includes the caller's own vote.
 *
 * `sort` picks the order:
 *   - 'latest' (default) → newest first (createdAt desc).
 *   - 'top'              → highest score first, ties broken by newest, then id
 *     as a final unique tiebreak so the cursor never skips/duplicates on ties.
 */
export async function getFeed(options: {
  categorySlug?: string;
  authorHandle?: string;
  /** Id of the last Sink from the previous page; omit for the first page. */
  cursor?: string;
  limit?: number;
  userId?: string;
  sort?: 'latest' | 'top';
}) {
  const {
    categorySlug,
    authorHandle,
    cursor,
    limit = 10,
    userId,
    sort = 'latest',
  } = options;

  const orderBy: Prisma.SinkOrderByWithRelationInput[] =
    sort === 'top'
      ? [{ score: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }]
      : [{ createdAt: 'desc' }];

  // Fetch one extra row: if it comes back, there's another page, and the last
  // row of THIS page becomes the cursor for the next request. Cursor pagination
  // (keyed on the unique id) is stable when new Sinks are posted mid-scroll —
  // unlike offset, it never skips or duplicates.
  const rows = await prisma.sink.findMany({
    where: {
      deletedAt: null,
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
      // Filter to one author's posts (used by the profile page's post history).
      ...(authorHandle ? { user: { handle: authorHandle } } : {}),
    },
    select: sinkPublicSelect,
    orderBy,
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const sinks = await attachMyState(page, userId);
  const nextCursor = hasMore ? page[page.length - 1].id : null;
  return { sinks, nextCursor };
}

// Categories/outcomes that count as a "rejected or ghosted by X" story, used by
// the "you're not alone" solidarity counter below.
const COHORT_SLUGS = ['rejection', 'ghosted'];

/**
 * "You're not alone" counter: how many OTHER rejection/ghost Sinks about the
 * same company were posted in the last 30 days. Solidarity vibes, not a precise
 * statistic. Prefers the reliable company FK, falling back to a case-insensitive
 * match on the free-text company. Returns 0 when it doesn't apply.
 */
async function countCompanyCohort(args: {
  excludeId: string;
  companyId: string | null;
  company: string | null;
  categorySlug: string;
  conclusion: Conclusion | null;
}): Promise<number> {
  const isRejectGhost =
    COHORT_SLUGS.includes(args.categorySlug) ||
    args.conclusion === 'REJECTED' ||
    args.conclusion === 'GHOSTED';
  if (!isRejectGhost) return 0;

  const companyWhere: Prisma.SinkWhereInput | null = args.companyId
    ? { companyId: args.companyId }
    : args.company
      ? { company: { equals: args.company, mode: 'insensitive' } }
      : null;
  if (!companyWhere) return 0;

  const since = new Date(Date.now() - 30 * 86_400_000);
  return prisma.sink.count({
    where: {
      id: { not: args.excludeId },
      deletedAt: null,
      createdAt: { gte: since },
      ...companyWhere,
      OR: [
        { category: { slug: { in: COHORT_SLUGS } } },
        { conclusion: { in: ['REJECTED', 'GHOSTED'] } },
      ],
    },
  });
}

/** A single Sink by id (for the detail page / per-Sink URL). */
export async function getSinkById(id: string, userId?: string) {
  const sink = await prisma.sink.findFirst({
    where: { id, deletedAt: null },
    select: { ...sinkPublicSelect, companyId: true },
  });
  if (!sink) throw new AppError('Sink not found', 404);

  // Strip the internal companyId back off the public shape after using it.
  const { companyId, ...pub } = sink;
  const [withState] = await attachMyState([pub], userId);

  const companyCohortCount = await countCompanyCohort({
    excludeId: id,
    companyId,
    company: sink.company ?? null,
    categorySlug: sink.category.slug,
    conclusion: sink.conclusion,
  });
  return { ...withState, companyCohortCount };
}

/**
 * Fetch public Sinks by id (non-deleted), preserving the given id order.
 * Used by the "Saved" bookmarks list. Anonymous-safe; `userId` enriches each
 * Sink with the caller's own vote/poll state.
 */
export async function getPublicSinksByIds(ids: string[], userId?: string) {
  if (ids.length === 0) return [];
  const rows = await prisma.sink.findMany({
    where: { id: { in: ids }, deletedAt: null },
    select: sinkPublicSelect,
  });
  const withState = await attachMyState(rows, userId);
  const byId = new Map(withState.map((s) => [s.id, s]));
  // Preserve the caller-supplied order (e.g. newest-saved-first) and drop any
  // ids that resolved to a deleted/missing Sink.
  return ids
    .map((id) => byId.get(id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));
}

/**
 * Edit a Sink the caller owns. Only text + image fields change; category and
 * poll options are locked. company/conclusion honor the (locked) category's
 * config flags, exactly like createSink. Throws 404 if the Sink is gone and 403
 * if the caller isn't the author.
 */
export async function updateSink(
  userId: string,
  sinkId: string,
  input: UpdateSinkInput,
) {
  const existing = await prisma.sink.findFirst({
    where: { id: sinkId, deletedAt: null },
    select: {
      userId: true,
      category: { select: { showsCompany: true, showsConclusion: true } },
    },
  });
  if (!existing) throw new AppError('Sink not found', 404);
  if (existing.userId !== userId) {
    throw new AppError('You can only edit your own Sink', 403);
  }

  const data: Prisma.SinkUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.body !== undefined) data.body = input.body;
  if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl;

  // Only honor company/conclusion if the category surfaces them (else ignore,
  // matching createSink's strip-by-flag behavior).
  if (existing.category.showsCompany && input.company !== undefined) {
    data.company = input.company;
    const ref = input.company ? await findOrCreateCompany(input.company, userId) : null;
    data.companyRef = ref ? { connect: { id: ref.id } } : { disconnect: true };
  }
  if (existing.category.showsConclusion && input.conclusion !== undefined) {
    data.conclusion = input.conclusion;
    if (input.conclusion === 'OTHER') {
      const other = input.conclusionOther?.trim();
      if (!other) {
        throw new AppError('conclusionOther is required when conclusion is OTHER');
      }
      data.conclusionOther = other;
    } else {
      // Moving off OTHER (or clearing) drops any stale free-text.
      data.conclusionOther = null;
    }
  }

  return prisma.sink.update({
    where: { id: sinkId },
    data,
    select: sinkPublicSelect,
  });
}

/**
 * Soft-delete a Sink the caller owns (sets deletedAt; never a hard delete, per
 * the project convention). Throws 404 if gone, 403 if not the author.
 */
export async function deleteSink(userId: string, sinkId: string) {
  const existing = await prisma.sink.findFirst({
    where: { id: sinkId, deletedAt: null },
    select: { userId: true },
  });
  if (!existing) throw new AppError('Sink not found', 404);
  if (existing.userId !== userId) {
    throw new AppError('You can only delete your own Sink', 403);
  }
  await prisma.sink.update({
    where: { id: sinkId },
    data: { deletedAt: new Date() },
  });
}

/** All non-deleted Sink ids + timestamps, for building the sitemap. */
export async function getSinkSitemapEntries() {
  return prisma.sink.findMany({
    where: { deletedAt: null },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
}
