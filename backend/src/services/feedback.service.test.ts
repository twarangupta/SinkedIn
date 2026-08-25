/**
 * Tests for the feedback service — it must persist every submission (email is a
 * best-effort no-op without RESEND_API_KEY, so it is not exercised here).
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { createFeedback } from './feedback.service.js';

beforeEach(async () => {
  await prisma.feedback.deleteMany();
});

afterAll(async () => {
  await prisma.feedback.deleteMany();
  await prisma.$disconnect();
});

describe('createFeedback', () => {
  it('stores an anonymous submission', async () => {
    const { id } = await createFeedback({ message: '  the board is slow  ' });
    const row = await prisma.feedback.findUnique({ where: { id } });
    expect(row?.message).toBe('the board is slow'); // trimmed
    expect(row?.userId).toBeNull();
    expect(row?.contactEmail).toBeNull();
  });

  it('stores the signed-in context and optional reply address', async () => {
    const { id } = await createFeedback({
      message: 'love the tracker',
      contactEmail: 'me@example.com',
      path: '/tracker/app',
      userId: 'user-123',
      handle: 'Salty_Seahorse_910',
    });
    const row = await prisma.feedback.findUnique({ where: { id } });
    expect(row?.contactEmail).toBe('me@example.com');
    expect(row?.handle).toBe('Salty_Seahorse_910');
    expect(row?.path).toBe('/tracker/app');
    expect(row?.userId).toBe('user-123');
  });

  it('normalizes an empty contact email to null', async () => {
    const { id } = await createFeedback({ message: 'hi', contactEmail: '   ' });
    const row = await prisma.feedback.findUnique({ where: { id } });
    expect(row?.contactEmail).toBeNull();
  });
});
