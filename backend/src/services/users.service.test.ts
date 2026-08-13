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
  findOrCreateUser,
  generateHandleCandidate,
  getUserByHandle,
} from './users.service.js';

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

describe('findOrCreateUser', () => {
  it('creates a user with a handle on first login', async () => {
    const user = await findOrCreateUser('supabase-abc');
    expect(user.handle).toMatch(/^[A-Za-z]+_[A-Za-z]+_\d{3}$/);
    expect(typeof user.id).toBe('string');
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
    expect(Object.keys(user).sort()).toEqual(['createdAt', 'handle', 'id']);
    expect(user).not.toHaveProperty('supabaseUserId');
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
