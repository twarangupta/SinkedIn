/**
 * Tests for the private insights service — funnel, rates, response time,
 * per-resume reply rate, and cadence, all owner-scoped over the sinkedin_test DB.
 *
 * We build application histories by creating an application and then advancing
 * its status (createApplication/updateApplication log ApplicationEvents), so the
 * funnel is exercised through the same path the app uses.
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { createApplication, updateApplication } from './applications.service.js';
import { getInsights } from './applicationInsights.service.js';

let userId: string;
let otherId: string;

beforeEach(async () => {
  await prisma.interviewRound.deleteMany();
  await prisma.applicationEvent.deleteMany();
  await prisma.application.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();
  const [u, o] = await Promise.all([
    prisma.user.create({ data: { supabaseUserId: 'seed:ins-1', handle: 'Insights_User_1' } }),
    prisma.user.create({ data: { supabaseUserId: 'seed:ins-2', handle: 'Insights_User_2' } }),
  ]);
  userId = u.id;
  otherId = o.id;
});

afterAll(async () => {
  await prisma.interviewRound.deleteMany();
  await prisma.applicationEvent.deleteMany();
  await prisma.application.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('getInsights', () => {
  it('returns an empty-but-valid shape when there is no data', async () => {
    const ins = await getInsights(userId);
    expect(ins.total).toBe(0);
    expect(ins.funnel).toEqual({ applied: 0, oa: 0, interview: 0, offer: 0 });
    expect(ins.rates).toEqual({ response: 0, interview: 0, offer: 0, ghost: 0 });
    expect(ins.medianResponseDays).toBeNull();
    expect(ins.perResume).toEqual([]);
  });

  it('excludes SAVED-only rows from the funnel but counts them in total', async () => {
    await createApplication(userId, { company: 'A', role: 'r' }); // SAVED
    await createApplication(userId, { company: 'B', role: 'r', status: 'APPLIED' });
    const ins = await getInsights(userId);
    expect(ins.total).toBe(2);
    expect(ins.funnel.applied).toBe(1);
  });

  it('treats the funnel as "reached at least this stage"', async () => {
    // Applied → OA → INTERVIEW → OFFER: counts at every stage it passed.
    const a = await createApplication(userId, { company: 'G', role: 'r', status: 'APPLIED' });
    await updateApplication(userId, a.id, { status: 'OA' });
    await updateApplication(userId, a.id, { status: 'INTERVIEW' });
    await updateApplication(userId, a.id, { status: 'OFFER' });

    const ins = await getInsights(userId);
    expect(ins.funnel).toEqual({ applied: 1, oa: 1, interview: 1, offer: 1 });
    expect(ins.rates.offer).toBe(100);
    expect(ins.rates.interview).toBe(100);
  });

  it('counts a rejection as a response, and a ghost as no response', async () => {
    const rej = await createApplication(userId, { company: 'R', role: 'r', status: 'APPLIED' });
    await updateApplication(userId, rej.id, { status: 'REJECTED' });
    const ghost = await createApplication(userId, { company: 'Gh', role: 'r', status: 'APPLIED' });
    await updateApplication(userId, ghost.id, { status: 'GHOSTED' });

    const ins = await getInsights(userId);
    expect(ins.funnel.applied).toBe(2);
    expect(ins.rates.response).toBe(50); // 1 of 2 replied
    expect(ins.rates.ghost).toBe(50);
  });

  it('computes reply rate per resume', async () => {
    const a = await createApplication(userId, {
      company: 'A', role: 'r', status: 'APPLIED', resumeFileName: 'v1.pdf',
    });
    await updateApplication(userId, a.id, { status: 'INTERVIEW' }); // responded
    await createApplication(userId, {
      company: 'B', role: 'r', status: 'APPLIED', resumeFileName: 'v1.pdf',
    }); // no response

    const ins = await getInsights(userId);
    expect(ins.perResume).toEqual([{ name: 'v1.pdf', applied: 2, responseRate: 50 }]);
  });

  it('never counts another user\'s applications', async () => {
    await createApplication(otherId, { company: 'Secret', role: 'r', status: 'APPLIED' });
    const ins = await getInsights(userId);
    expect(ins.total).toBe(0);
  });
});
