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

export interface CreateSinkInput {
  categoryId: string;
  title: string;
  body?: string;
  company?: string;
  conclusion?: Conclusion;
  conclusionOther?: string;
  pollOptions?: string[];
}

/** Fields safe to return for a Sink (author reduced to id + handle). */
const sinkPublicSelect = {
  id: true,
  title: true,
  body: true,
  company: true,
  conclusion: true,
  conclusionOther: true,
  score: true,
  createdAt: true,
  category: { select: { id: true, name: true, slug: true, color: true } },
  user: { select: { id: true, handle: true } },
  pollOptions: {
    select: {
      id: true,
      label: true,
      position: true,
      _count: { select: { votes: true } },
    },
    orderBy: { position: 'asc' },
  },
  _count: { select: { comments: true, votes: true } },
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

  return prisma.sink.create({
    data: {
      userId,
      categoryId: category.id,
      title: input.title,
      body: input.body,
      company,
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

type SinkWithMyState = SinkRow & {
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
    return sinks.map((s) => ({ ...s, myVote: null, myPollVote: null }));
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

  return sinks.map((s) => ({
    ...s,
    myVote: voteBySink.get(s.id) ?? null,
    myPollVote: pollVoteBySink.get(s.id) ?? null,
  }));
}

/**
 * The feed: most recent non-deleted Sinks, optionally filtered by category slug.
 * If userId is passed, each Sink includes the caller's own vote.
 */
export async function getFeed(options: {
  categorySlug?: string;
  limit?: number;
  userId?: string;
}) {
  const { categorySlug, limit = 20, userId } = options;
  const sinks = await prisma.sink.findMany({
    where: {
      deletedAt: null,
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    },
    select: sinkPublicSelect,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return attachMyState(sinks, userId);
}

/** A single Sink by id (for the detail page / per-Sink URL). */
export async function getSinkById(id: string, userId?: string) {
  const sink = await prisma.sink.findFirst({
    where: { id, deletedAt: null },
    select: sinkPublicSelect,
  });
  if (!sink) throw new AppError('Sink not found', 404);
  const [withState] = await attachMyState([sink], userId);
  return withState;
}

/** All non-deleted Sink ids + timestamps, for building the sitemap. */
export async function getSinkSitemapEntries() {
  return prisma.sink.findMany({
    where: { deletedAt: null },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
}
