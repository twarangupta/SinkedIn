/**
 * Tests for the category service.
 *
 * Runs against the ISOLATED test database (sinkedin_test) — vitest.setup.ts
 * loads .env.test before this file imports the Prisma client. Each test seeds
 * the exact rows it needs and cleans up, so tests never depend on pre-existing
 * data or on each other.
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { getCategories } from './categories.service.js';

// Start every test from an empty Category table.
beforeEach(async () => {
  await prisma.category.deleteMany();
});

// Clean up and close the connection when the suite finishes.
afterAll(async () => {
  await prisma.category.deleteMany();
  await prisma.$disconnect();
});

describe('getCategories', () => {
  it('returns an empty array when there are no categories', async () => {
    const result = await getCategories();
    expect(result).toEqual([]);
  });

  it('returns categories ordered by name', async () => {
    await prisma.category.createMany({
      data: [
        { name: 'Rant', slug: 'rant', color: '#F97316' },
        { name: 'Advice', slug: 'advice', color: '#0EA5E9', allowsPoll: true },
        { name: 'Poll', slug: 'poll', color: '#8B5CF6', allowsPoll: true, requiresPoll: true },
      ],
    });

    const result = await getCategories();

    // Ordered alphabetically by name.
    expect(result.map((c) => c.name)).toEqual(['Advice', 'Poll', 'Rant']);
  });

  it('exposes the public fields including config flags', async () => {
    await prisma.category.create({
      data: {
        name: 'Interview Experience',
        slug: 'interview-experience',
        color: '#6366F1',
        showsCompany: true,
        showsConclusion: true,
      },
    });

    const [category] = await getCategories();

    expect(category).toMatchObject({
      name: 'Interview Experience',
      slug: 'interview-experience',
      color: '#6366F1',
      showsCompany: true,
      showsConclusion: true,
      allowsPoll: false,
      requiresPoll: false,
    });
    // id is present (a generated uuid).
    expect(typeof category.id).toBe('string');
  });
});
