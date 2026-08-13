/**
 * User service — identity business logic.
 *
 * The ONLY layer touching Prisma for users. Enforces the privacy hard-rule:
 * every function here returns the PUBLIC projection (id, handle, createdAt) and
 * never `supabaseUserId`. We enforce it by `select`-ing safe fields in the
 * query, not by stripping afterwards.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

/** The public shape of a user — safe to return from any API response. */
export interface PublicUser {
  id: string;
  handle: string;
  createdAt: Date;
}

/** Prisma `select` that returns exactly the public fields (never supabaseUserId). */
const publicUserSelect = {
  id: true,
  handle: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

// --- Handle generation (Phase 0: auto-generated). ---
// Word lists are on-theme and single-word (no underscores) so the final
// handle is always `Adjective_Noun_Number`, e.g. "Rejected_Raccoon_402".
// The richer user-chosen picker (suggestions, uniqueness UI, blocklist) is a
// later slice; this just guarantees every user gets a unique handle on signup.
const ADJECTIVES = [
  'Rejected', 'Ghosted', 'Sunken', 'Drifting', 'Overqualified', 'Underpaid',
  'Benched', 'Pending', 'Shortlisted', 'Rescinded', 'Jaded', 'Weary',
  'Hopeful', 'Anonymous', 'Restless', 'Adrift',
];
const NOUNS = [
  'Raccoon', 'Gopher', 'Sailor', 'Walrus', 'Penguin', 'Otter', 'Herring',
  'Squid', 'Barnacle', 'Kraken', 'Narwhal', 'Manatee', 'Anchovy', 'Lobster',
  'Seagull', 'Mackerel',
];

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

/** Generate one candidate handle, e.g. "Ghosted_Kraken_317". */
export function generateHandleCandidate(): string {
  const number = Math.floor(Math.random() * 900) + 100; // 100–999
  return `${pick(ADJECTIVES)}_${pick(NOUNS)}_${number}`;
}

/** Is this Prisma error a unique-constraint violation (P2002)? */
function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

/**
 * Find the user for a Supabase auth id, creating one (with a fresh unique
 * handle) on first login. Idempotent and safe under concurrent first-logins.
 */
export async function findOrCreateUser(
  supabaseUserId: string,
): Promise<PublicUser> {
  const existing = await prisma.user.findUnique({
    where: { supabaseUserId },
    select: publicUserSelect,
  });
  if (existing) return existing;

  // Try a few times in case a randomly-generated handle collides.
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      return await prisma.user.create({
        data: { supabaseUserId, handle: generateHandleCandidate() },
        select: publicUserSelect,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        // Either the handle collided (retry) or another request created this
        // user concurrently (return that one).
        const now = await prisma.user.findUnique({
          where: { supabaseUserId },
          select: publicUserSelect,
        });
        if (now) return now;
        continue;
      }
      throw error;
    }
  }

  throw new Error('Could not generate a unique handle after several attempts.');
}

/** Public profile lookup by handle. Returns null if not found. */
export async function getUserByHandle(
  handle: string,
): Promise<PublicUser | null> {
  return prisma.user.findUnique({
    where: { handle },
    select: publicUserSelect,
  });
}
