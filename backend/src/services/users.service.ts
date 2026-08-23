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
import { AppError } from '../lib/errors.js';
import { validateHandle } from '../lib/handle.js';
import {
  defaultAvatarForHandle,
  isValidAvatarId,
  type AvatarId,
} from '../lib/avatars.js';

/**
 * The public shape of a user — safe to return from any API response.
 * `handleChosen` is not PII (just an onboarding flag); it drives the first-run
 * "pick your handle" prompt for the caller.
 */
export interface PublicUser {
  id: string;
  handle: string;
  avatarId: string;
  handleChosen: boolean;
  createdAt: Date;
}

/** Prisma `select` that returns exactly the public fields (never supabaseUserId). */
const publicUserSelect = {
  id: true,
  handle: true,
  avatarId: true,
  handleChosen: true,
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

// --- Handle picker: availability check, suggestions, and setting a handle. ---

/** Is a handle usable? Checks format + blocklist, then DB uniqueness. */
export async function checkHandleAvailability(
  handle: string,
): Promise<{ available: boolean; reason?: string }> {
  const reason = validateHandle(handle);
  if (reason) return { available: false, reason };
  const existing = await prisma.user.findUnique({
    where: { handle },
    select: { id: true },
  });
  if (existing) return { available: false, reason: 'Taken. Try another.' };
  return { available: true };
}

/**
 * A few available, valid handle suggestions (Adjective_Noun_Number). Generates
 * candidates and keeps only ones that pass validation and aren't taken.
 */
export async function generateHandleSuggestions(count = 4): Promise<string[]> {
  const suggestions: string[] = [];
  // Cap attempts so a crowded namespace can't loop forever.
  for (let attempt = 0; attempt < count * 10 && suggestions.length < count; attempt++) {
    const candidate = generateHandleCandidate();
    if (suggestions.includes(candidate)) continue;
    if (validateHandle(candidate)) continue; // skip anything blocklisted
    const taken = await prisma.user.findUnique({
      where: { handle: candidate },
      select: { id: true },
    });
    if (!taken) suggestions.push(candidate);
  }
  return suggestions;
}

/**
 * Set the caller's handle. Validates format + blocklist here (never trust the
 * client), and maps the unique-constraint race to a clean "taken" error.
 */
export async function setMyHandle(
  userId: string,
  handle: string,
): Promise<PublicUser> {
  const reason = validateHandle(handle);
  if (reason) throw new AppError(reason);
  try {
    return await prisma.user.update({
      where: { id: userId },
      // Choosing a handle also completes first-run onboarding.
      data: { handle, handleChosen: true },
      select: publicUserSelect,
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new AppError('That handle is taken.');
    throw error;
  }
}

/**
 * Mark first-run onboarding complete without changing the handle (the "keep my
 * current one" path). Idempotent.
 */
export async function markOnboarded(userId: string): Promise<PublicUser> {
  return prisma.user.update({
    where: { id: userId },
    data: { handleChosen: true },
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
