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
import {
  defaultAvatarForHandle,
  isValidAvatarId,
  type AvatarId,
} from '../lib/avatars.js';

/** The public shape of a user — safe to return from any API response. */
export interface PublicUser {
  id: string;
  handle: string;
  avatarId: string;
  createdAt: Date;
}

/** Prisma `select` that returns exactly the public fields (never supabaseUserId). */
const publicUserSelect = {
  id: true,
  handle: true,
  avatarId: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

// --- Handle generation (Phase 0: auto-generated). ---
// Word lists are on-theme and single-word (no underscores) so the final
// handle is always `Adjective_Noun_Number`, e.g. "Drowning_Guppy_402".
// The tone is the brand: darkly-funny, sarcastic job-hunt energy; the nouns
// lean into the sea-creature avatar theme so a handle and its default avatar
// feel like the same character. These same lists will later power the
// user-facing suggestion picker (the "type your own" slice adds the
// uniqueness UI + blocklist on top of this).
const ADJECTIVES = [
  'Rejected', 'Ghosted', 'Sunken', 'Drifting', 'Overqualified', 'Underpaid',
  'Benched', 'Pending', 'Shortlisted', 'Rescinded', 'Jaded', 'Weary',
  'Hopeful', 'Anonymous', 'Restless', 'Adrift', 'Drowning', 'Burntout',
  'Lowballed', 'Micromanaged', 'Downsized', 'Furloughed', 'Blindsided',
  'Waitlisted', 'Autorejected', 'Unhired', 'Overworked', 'Deprioritized',
  'Buffering', 'Circleback', 'Deadlined', 'Screened', 'Passedover', 'Unpaid',
];
const NOUNS = [
  'Guppy', 'Blobfish', 'Anglerfish', 'Pufferfish', 'Squid', 'Kraken',
  'Narwhal', 'Barnacle', 'Anchovy', 'Herring', 'Mackerel', 'Lobster',
  'Manatee', 'Walrus', 'Seagull', 'Otter', 'Jellyfish', 'Crab', 'Urchin',
  'Nautilus', 'Coelacanth', 'Trilobite', 'Minnow', 'Sardine', 'Flounder',
  'Eel', 'Haddock', 'Prawn', 'Clam', 'Plankton', 'Tadpole', 'Mollusk',
  'Raccoon', 'Gopher',
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
      // Derive the default avatar from the SAME handle, so the handle and its
      // creature feel like one character (e.g. "Drowning_Guppy" → its fish).
      const handle = generateHandleCandidate();
      return await prisma.user.create({
        data: { supabaseUserId, handle, avatarId: defaultAvatarForHandle(handle) },
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

/**
 * Change the caller's avatar. `avatarId` is validated here too (never trust the
 * client) even though the route also validates it — defence in depth. Returns
 * the updated public user.
 */
export async function updateMyAvatar(
  userId: string,
  avatarId: string,
): Promise<PublicUser> {
  if (!isValidAvatarId(avatarId)) {
    throw new Error(`Unknown avatarId: ${avatarId}`);
  }
  return prisma.user.update({
    where: { id: userId },
    data: { avatarId: avatarId satisfies AvatarId },
    select: publicUserSelect,
  });
}
