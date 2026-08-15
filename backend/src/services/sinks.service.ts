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

import { Prisma, type Conclusion } from '@prisma/client';
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

/**
 * The feed: most recent non-deleted Sinks, optionally filtered by category slug.
 */
export async function getFeed(options: {
  categorySlug?: string;
  limit?: number;
}) {
  const { categorySlug, limit = 20 } = options;
  return prisma.sink.findMany({
    where: {
      deletedAt: null,
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    },
    select: sinkPublicSelect,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
