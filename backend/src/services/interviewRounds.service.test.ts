/**
 * Tests for the interview-round service — per-application, owner-scoped.
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { createApplication } from './applications.service.js';
import {
  addRound,
  deleteRound,
  reorderRounds,
  updateRound,
} from './interviewRounds.service.js';

let userId: string;
let otherId: string;
let appId: string;

async function clean() {
  await prisma.interviewRound.deleteMany();
  await prisma.applicationEvent.deleteMany();
  await prisma.application.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();
}

beforeEach(async () => {
  await clean();
  const [u, o] = await Promise.all([
    prisma.user.create({ data: { supabaseUserId: 'seed:round-1', handle: 'Round_User_001' } }),
    prisma.user.create({ data: { supabaseUserId: 'seed:round-2', handle: 'Round_User_002' } }),
  ]);
  userId = u.id;
  otherId = o.id;
  const app = await createApplication(userId, { company: 'Google', role: 'L4' });
  appId = app.id;
});

afterAll(async () => {
  await clean();
  await prisma.$disconnect();
});

describe('addRound', () => {
  it('appends rounds with increasing position', async () => {
    const r0 = await addRound(userId, appId, { type: 'PHONE_SCREEN' });
    const r1 = await addRound(userId, appId, { type: 'TECHNICAL' });
    expect(r0.position).toBe(0);
    expect(r1.position).toBe(1);
  });

  it('keeps a typeOther label when type is OTHER', async () => {
    const r = await addRound(userId, appId, { type: 'OTHER', typeOther: 'Culture chat' });
    expect(r.type).toBe('OTHER');
    expect(r.typeOther).toBe('Culture chat');
  });

  it('404s adding a round to another user\'s application', async () => {
    await expect(addRound(otherId, appId, { type: 'HR' })).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('updateRound / deleteRound', () => {
  it('updates result and clears typeOther when moving off OTHER', async () => {
    const r = await addRound(userId, appId, { type: 'OTHER', typeOther: 'x' });
    const updated = await updateRound(userId, appId, r.id, {
      type: 'TECHNICAL',
      result: 'CLEARED',
    });
    expect(updated.type).toBe('TECHNICAL');
    expect(updated.typeOther).toBeNull();
    expect(updated.result).toBe('CLEARED');
  });

  it('deletes a round', async () => {
    const r = await addRound(userId, appId, { type: 'HR' });
    await deleteRound(userId, appId, r.id);
    expect(await prisma.interviewRound.count({ where: { applicationId: appId } })).toBe(0);
  });
});

describe('reorderRounds', () => {
  it('rewrites positions to match the given order', async () => {
    const a = await addRound(userId, appId, { type: 'PHONE_SCREEN' });
    const b = await addRound(userId, appId, { type: 'TECHNICAL' });
    const c = await addRound(userId, appId, { type: 'HR' });

    const reordered = await reorderRounds(userId, appId, [c.id, a.id, b.id]);
    expect(reordered.map((r) => r.id)).toEqual([c.id, a.id, b.id]);
    expect(reordered.map((r) => r.position)).toEqual([0, 1, 2]);
  });

  it('rejects an order that is not exactly the application rounds', async () => {
    const a = await addRound(userId, appId, { type: 'PHONE_SCREEN' });
    await expect(reorderRounds(userId, appId, [a.id, a.id])).rejects.toThrow();
  });
});
