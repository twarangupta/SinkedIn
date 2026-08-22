/**
 * Avatar catalog — the source of truth for which avatars exist.
 *
 * An avatar is just a small, data-driven id (e.g. "pufferfish"). The User row
 * stores this id in `avatarId`; the FRONTEND owns the actual SVG artwork keyed
 * by the same id (see frontend avatar catalog). Adding a new avatar is a DATA
 * change on both sides — no schema change — consistent with the "categories are
 * data, not code" spirit.
 *
 * This backend copy is what we need server-side for two jobs:
 *   1. assign every new user a deterministic DEFAULT avatar from their handle,
 *   2. validate an avatarId when a user changes it (never trust the client).
 *
 * NOTE: the id list is intentionally duplicated on the frontend (small, rarely
 * changes). If you add an id here, add the matching SVG there — and vice versa.
 */

/** Every valid avatar id. Ocean-creature + ocean-lore theme (see avatar decision). */
export const AVATAR_IDS = [
  // deep-sea oddballs & rare
  'blobfish', 'anglerfish', 'pufferfish', 'gulper-eel', 'vampire-squid',
  'barreleye', 'dumbo-octopus', 'goblin-shark', 'fangtooth',
  // classic sea life
  'octopus', 'jellyfish', 'whale', 'narwhal', 'crab', 'seahorse',
  'sea-turtle', 'manta-ray', 'orca',
  // extinct / living fossils
  'megalodon', 'dunkleosteus', 'coelacanth', 'ammonite', 'trilobite',
  'helicoprion',
  // ocean lore & objects
  'point-nemo', 'dock', 'nautilus', 'lighthouse', 'message-in-bottle',
  'kraken', 'buoy',
] as const;

export type AvatarId = (typeof AVATAR_IDS)[number];

/** A safe fallback id (always drawn) — used as the schema-level column default. */
export const DEFAULT_AVATAR_ID: AvatarId = 'pufferfish';

/** Is this string a known avatar id? (Route + service validation.) */
export function isValidAvatarId(value: string): value is AvatarId {
  return (AVATAR_IDS as readonly string[]).includes(value);
}

/**
 * Deterministic string hash (djb2). Stable across runs/processes — the same
 * handle always hashes to the same number, so the default avatar is stable.
 */
function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  return hash >>> 0; // force unsigned 32-bit
}

/**
 * Pick a default avatar for a handle, deterministically. "Drowning_Guppy_402"
 * always maps to the same creature, so nobody is ever a blank circle and the
 * default feels intentional rather than random.
 */
export function defaultAvatarForHandle(handle: string): AvatarId {
  return AVATAR_IDS[hashString(handle) % AVATAR_IDS.length];
}
