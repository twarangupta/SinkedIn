/**
 * Category service — business logic for categories.
 *
 * ARCHITECTURE: this is the ONLY layer allowed to import the Prisma client
 * (CLAUDE.md rule). Controllers call these functions; they never touch Prisma.
 * This is also the layer covered by Vitest tests.
 */

import { prisma } from '../lib/prisma.js';

/**
 * The public shape of a Category as exposed by the API.
 *
 * Category has no private/identity fields, but we still `select` explicit
 * columns rather than returning the whole row — the same habit that, on
 * user-bearing models, keeps `email`/`supabaseUserId` out of public responses.
 */
export interface PublicCategory {
  id: string;
  name: string;
  slug: string;
  color: string;
  showsCompany: boolean;
  showsConclusion: boolean;
  allowsPoll: boolean;
  requiresPoll: boolean;
}

/**
 * Return all categories, ordered by name.
 *
 * Drives the compose form (which optional fields to reveal) and the feed
 * category filter. Read-only; no input.
 */
export async function getCategories(): Promise<PublicCategory[]> {
  return prisma.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      color: true,
      showsCompany: true,
      showsConclusion: true,
      allowsPoll: true,
      requiresPoll: true,
    },
    orderBy: { name: 'asc' },
  });
}
