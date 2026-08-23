/**
 * Handle validation — format + blocklist, shared by the availability check, the
 * suggestion generator, and the set-handle service.
 *
 * Rules:
 *  - format: 3 to 30 chars, letters/numbers/underscore only.
 *  - reserved: no impersonating staff/roles/the brand.
 *  - profanity: keep it PG (substring match; deliberately short + curated).
 *
 * The lists are intentionally small and easy to extend; this is a first line of
 * defence, not an exhaustive filter.
 */

const HANDLE_FORMAT = /^[A-Za-z0-9_]{3,30}$/;

// Reserved words (substring match, lowercase). Kept to length >= 4 so they don't
// false-positive inside normal words.
const RESERVED = [
  'admin',
  'administrator',
  'moderator',
  'official',
  'sinkedin',
  'support',
  'staff',
  'recruiter',
  'system',
  'superuser',
];

// Minimal profanity/slur blocklist (substring match, lowercase).
const PROFANITY = [
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  'cunt',
  'nigger',
  'nigga',
  'faggot',
  'retard',
  'whore',
];

/**
 * Returns a human-readable reason the handle is invalid, or null if it's fine
 * (format + blocklist only; uniqueness is checked separately against the DB).
 */
export function validateHandle(handle: string): string | null {
  if (!HANDLE_FORMAT.test(handle)) {
    return 'Use 3 to 30 letters, numbers, or underscores.';
  }
  const lower = handle.toLowerCase();
  if (RESERVED.some((word) => lower.includes(word))) {
    return 'That name is reserved.';
  }
  if (PROFANITY.some((word) => lower.includes(word))) {
    return 'Keep it PG.';
  }
  return null;
}
