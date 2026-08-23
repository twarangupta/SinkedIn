/**
 * Tests for the user service — runs against the isolated sinkedin_test DB.
 *
 * Covers the identity core: first-login creation, idempotency, the handle
 * format, and — critically — the PRIVACY guarantee that public projections
 * never include supabaseUserId.
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import {
  checkHandleAvailability,
  findOrCreateUser,
  generateHandleCandidate,
  generateHandleSuggestions,
  getUserByHandle,
  markOnboarded,
  setMyHandle,
  updateMyAvatar,
} from './users.service.js';
import {
  AVATAR_IDS,
  defaultAvatarForHandle,
  isValidAvatarId,
} from '../lib/avatars.js';

beforeEach(async () => {
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('generateHandleCandidate', () => {
  it('produces an Adjective_Noun_Number handle', () => {
    expect(generateHandleCandidate()).toMatch(/^[A-Za-z]+_[A-Za-z]+_\d{3}$/);
  });
});

describe('defaultAvatarForHandle', () => {
  it('is deterministic — same handle always maps to the same avatar', () => {
    expect(defaultAvatarForHandle('Drowning_Guppy_402')).toBe(
      defaultAvatarForHandle('Drowning_Guppy_402'),
    );
  });

  it('always returns an avatar id from the catalog', () => {
    for (const handle of ['A_B_100', 'Ghosted_Kraken_777', 'x', '']) {
      expect(isValidAvatarId(defaultAvatarForHandle(handle))).toBe(true);
    }
  });
});

describe('findOrCreateUser', () => {
  it('creates a user with a handle on first login', async () => {
    const user = await findOrCreateUser('supabase-abc');
    expect(user.handle).toMatch(/^[A-Za-z]+_[A-Za-z]+_\d{3}$/);
    expect(typeof user.id).toBe('string');
  });

  it('assigns a valid default avatar derived from the handle', async () => {
    const user = await findOrCreateUser('supabase-avatar');
    expect(isValidAvatarId(user.avatarId)).toBe(true);
    expect(user.avatarId).toBe(defaultAvatarForHandle(user.handle));
  });

  it('is idempotent — same supabaseUserId returns the same user', async () => {
    const first = await findOrCreateUser('supabase-abc');
    const second = await findOrCreateUser('supabase-abc');
    expect(second.id).toBe(first.id);
    expect(second.handle).toBe(first.handle);

    // Exactly one row was created.
    expect(await prisma.user.count()).toBe(1);
  });

  it('NEVER exposes supabaseUserId in the returned object (privacy rule)', async () => {
    const user = await findOrCreateUser('supabase-secret-id');
    expect(Object.keys(user).sort()).toEqual([
      'avatarId',
      'createdAt',
      'handle',
      'handleChosen',
      'id',
    ]);
    expect(user).not.toHaveProperty('supabaseUserId');
  });
});

describe('updateMyAvatar', () => {
  it('changes the avatar and returns the public projection', async () => {
    const user = await findOrCreateUser('supabase-change');
    const target = AVATAR_IDS.find((id) => id !== user.avatarId)!;
    const updated = await updateMyAvatar(user.id, target);
    expect(updated.avatarId).toBe(target);
    expect(updated).not.toHaveProperty('supabaseUserId');
  });

  it('rejects an unknown avatar id (never trust the client)', async () => {
    const user = await findOrCreateUser('supabase-bad-avatar');
    await expect(updateMyAvatar(user.id, 'not-a-real-fish')).rejects.toThrow();
  });
});

describe('getUserByHandle', () => {
  it('returns the public profile for an existing handle', async () => {
    const created = await findOrCreateUser('supabase-xyz');
    const found = await getUserByHandle(created.handle);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(created.id);
    expect(found).not.toHaveProperty('supabaseUserId');
  });

  it('returns null for a handle that does not exist', async () => {
    expect(await getUserByHandle('Nobody_Here_999')).toBeNull();
  });
});

describe('checkHandleAvailability', () => {
  it('accepts a valid, free handle', async () => {
    expect(await checkHandleAvailability('Salty_Otter_12')).toEqual({
      available: true,
    });
  });

  it('rejects a bad format', async () => {
    const res = await checkHandleAvailability('no spaces!');
    expect(res.available).toBe(false);
    expect(res.reason).toMatch(/letters, numbers/i);
  });

  it('rejects reserved and profane handles', async () => {
    expect((await checkHandleAvailability('the_admin_1')).available).toBe(false);
    expect((await checkHandleAvailability('shithead99')).available).toBe(false);
  });

  it('rejects a handle already taken', async () => {
    const user = await findOrCreateUser('supabase-taken');
    const res = await checkHandleAvailability(user.handle);
    expect(res.available).toBe(false);
    expect(res.reason).toMatch(/taken/i);
  });
});

describe('generateHandleSuggestions', () => {
  it('returns the requested number of valid, unused handles', async () => {
    const suggestions = await generateHandleSuggestions(4);
    expect(suggestions).toHaveLength(4);
    for (const s of suggestions) {
      expect(s).toMatch(/^[A-Za-z]+_[A-Za-z]+_\d{3}$/);
      expect((await checkHandleAvailability(s)).available).toBe(true);
    }
  });
});

describe('setMyHandle', () => {
  it('sets a valid handle, marks onboarding done, returns public projection', async () => {
    const user = await findOrCreateUser('supabase-sethandle');
    expect(user.handleChosen).toBe(false); // fresh users start un-onboarded
    const updated = await setMyHandle(user.id, 'Grumpy_Barnacle_7');
    expect(updated.handle).toBe('Grumpy_Barnacle_7');
    expect(updated.handleChosen).toBe(true);
    expect(updated).not.toHaveProperty('supabaseUserId');
  });

  it('markOnboarded completes onboarding without changing the handle', async () => {
    const user = await findOrCreateUser('supabase-skip');
    const updated = await markOnboarded(user.id);
    expect(updated.handle).toBe(user.handle);
    expect(updated.handleChosen).toBe(true);
  });

  it('rejects an invalid/blocklisted handle', async () => {
    const user = await findOrCreateUser('supabase-badhandle');
    await expect(setMyHandle(user.id, 'x')).rejects.toThrow();
    await expect(setMyHandle(user.id, 'official_admin')).rejects.toThrow();
  });

  it('rejects a handle already taken by someone else', async () => {
    const a = await findOrCreateUser('supabase-a');
    const b = await findOrCreateUser('supabase-b');
    await expect(setMyHandle(b.id, a.handle)).rejects.toThrow(/taken/i);
  });
});
