/**
 * Tests for the private job-tracker service — against the isolated sinkedin_test
 * DB. Covers owner-scoping (the PII wall), the status/statusOther rule, the
 * appliedAt back-fill, and soft-delete.
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import {
  createApplication,
  deleteApplication,
  getApplication,
  listApplications,
  updateApplication,
} from './applications.service.js';

let userId: string;
let otherId: string;

beforeEach(async () => {
  await prisma.interviewRound.deleteMany();
  await prisma.applicationEvent.deleteMany();
  await prisma.application.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();
  const [u, o] = await Promise.all([
    prisma.user.create({ data: { supabaseUserId: 'seed:app-1', handle: 'Tracker_User_001' } }),
    prisma.user.create({ data: { supabaseUserId: 'seed:app-2', handle: 'Tracker_User_002' } }),
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

describe('createApplication', () => {
  it('defaults to SAVED with no appliedAt', async () => {
    const app = await createApplication(userId, { company: 'Google', role: 'L4 SWE' });
    expect(app.status).toBe('SAVED');
    expect(app.appliedAt).toBeNull();
    expect(app.company).toBe('Google');
  });

  it('back-fills appliedAt when created past SAVED', async () => {
    const app = await createApplication(userId, {
      company: 'Amazon',
      role: 'SDE-2',
      status: 'APPLIED',
    });
    expect(app.status).toBe('APPLIED');
    expect(app.appliedAt).not.toBeNull();
  });

  it('requires statusOther when status is OTHER', async () => {
    await expect(
      createApplication(userId, { company: 'Stripe', role: 'SWE', status: 'OTHER' }),
    ).rejects.toThrow(/statusOther/);
  });

  it('keeps the statusOther label when status is OTHER', async () => {
    const app = await createApplication(userId, {
      company: 'Razorpay',
      role: 'SSE',
      status: 'OTHER',
      statusOther: 'Take-home in progress',
    });
    expect(app.statusOther).toBe('Take-home in progress');
  });
});

describe('listApplications', () => {
  it('returns only the caller\'s applications and can filter by status', async () => {
    await createApplication(userId, { company: 'A', role: 'r', status: 'INTERVIEW' });
    await createApplication(userId, { company: 'B', role: 'r', status: 'APPLIED' });
    await createApplication(otherId, { company: 'C', role: 'r', status: 'INTERVIEW' });

    const mine = await listApplications(userId);
    expect(mine).toHaveLength(2);
    expect(mine.every((a) => a.company !== 'C')).toBe(true);

    const interviews = await listApplications(userId, { status: 'INTERVIEW' });
    expect(interviews.map((a) => a.company)).toEqual(['A']);
  });
});

describe('getApplication', () => {
  it('404s when the application belongs to someone else (PII wall)', async () => {
    const app = await createApplication(otherId, { company: 'Secret', role: 'r' });
    await expect(getApplication(userId, app.id)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('updateApplication', () => {
  it('back-fills appliedAt when moving off SAVED', async () => {
    const app = await createApplication(userId, { company: 'Meta', role: 'E4' });
    expect(app.appliedAt).toBeNull();
    const moved = await updateApplication(userId, app.id, { status: 'OA' });
    expect(moved.status).toBe('OA');
    expect(moved.appliedAt).not.toBeNull();
  });

  it('clears statusOther when moving away from OTHER', async () => {
    const app = await createApplication(userId, {
      company: 'CRED',
      role: 'SWE',
      status: 'OTHER',
      statusOther: 'Pending referral',
    });
    const moved = await updateApplication(userId, app.id, { status: 'APPLIED' });
    expect(moved.statusOther).toBeNull();
  });

  it('404s when editing another user\'s application', async () => {
    const app = await createApplication(otherId, { company: 'X', role: 'r' });
    await expect(
      updateApplication(userId, app.id, { role: 'hijacked' }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('resumeFileKey', () => {
  const key = '11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.pdf';

  it('stores a resume key + filename given on create', async () => {
    const app = await createApplication(userId, {
      company: 'Google',
      role: 'SWE',
      resumeFileKey: key,
      resumeFileName: 'Ada_CV.pdf',
    });
    expect(app.resumeFileKey).toBe(key);
    expect(app.resumeFileName).toBe('Ada_CV.pdf');
  });

  it('defaults to no resume when none is given', async () => {
    const app = await createApplication(userId, { company: 'Meta', role: 'E4' });
    expect(app.resumeFileKey).toBeNull();
  });

  it('sets and later clears the resume key on update', async () => {
    const app = await createApplication(userId, { company: 'Stripe', role: 'SWE' });
    const withResume = await updateApplication(userId, app.id, {
      resumeFileKey: key,
      resumeFileName: 'cv.pdf',
    });
    expect(withResume.resumeFileKey).toBe(key);
    expect(withResume.resumeFileName).toBe('cv.pdf');

    const cleared = await updateApplication(userId, app.id, {
      resumeFileKey: null,
      resumeFileName: null,
    });
    expect(cleared.resumeFileKey).toBeNull();
    expect(cleared.resumeFileName).toBeNull();
  });

  it('leaves the resume key untouched when the field is omitted', async () => {
    const app = await createApplication(userId, {
      company: 'Amazon',
      role: 'SDE',
      resumeFileKey: key,
    });
    const edited = await updateApplication(userId, app.id, { role: 'SDE-2' });
    expect(edited.resumeFileKey).toBe(key);
  });
});

describe('deleteApplication', () => {
  it('soft-deletes and removes it from the list', async () => {
    const app = await createApplication(userId, { company: 'Zomato', role: 'r' });
    await deleteApplication(userId, app.id);
    const row = await prisma.application.findUnique({ where: { id: app.id } });
    expect(row?.deletedAt).not.toBeNull();
    expect(await listApplications(userId)).toHaveLength(0);
  });

  it('404s when deleting another user\'s application', async () => {
    const app = await createApplication(otherId, { company: 'X', role: 'r' });
    await expect(deleteApplication(userId, app.id)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('status history (ApplicationEvent)', () => {
  it('logs an opening event on create', async () => {
    const app = await createApplication(userId, {
      company: 'Amazon',
      role: 'SDE-2',
      status: 'APPLIED',
    });
    const events = await prisma.applicationEvent.findMany({
      where: { applicationId: app.id },
    });
    expect(events).toHaveLength(1);
    expect(events[0].status).toBe('APPLIED');
  });

  it('logs an event on each status transition, but not on other edits', async () => {
    const app = await createApplication(userId, { company: 'Meta', role: 'E4' });
    await updateApplication(userId, app.id, { status: 'OA' });
    await updateApplication(userId, app.id, { notes: 'no status change' });
    await updateApplication(userId, app.id, { status: 'INTERVIEW' });

    const events = await prisma.applicationEvent.findMany({
      where: { applicationId: app.id },
      orderBy: { createdAt: 'asc' },
    });
    // SAVED (create) → OA → INTERVIEW == 3 events; the notes-only edit adds none.
    expect(events.map((e) => e.status)).toEqual(['SAVED', 'OA', 'INTERVIEW']);
  });
});

describe('company resolution', () => {
  it('resolves the typed company to a Company and dedupes by normalized name', async () => {
    const a = await createApplication(userId, { company: 'Google', role: 'L4' });
    const b = await createApplication(userId, { company: '  google ', role: 'L5' });

    const rowA = await prisma.application.findUnique({ where: { id: a.id } });
    const rowB = await prisma.application.findUnique({ where: { id: b.id } });
    expect(rowA?.companyId).not.toBeNull();
    expect(rowA?.companyId).toBe(rowB?.companyId); // same company entity
    expect(await prisma.company.count()).toBe(1);
  });
});
