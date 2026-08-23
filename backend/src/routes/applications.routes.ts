/**
 * Application routes — the private job tracker. Mounted at /api/v1/applications.
 * EVERY route requires auth; there is no public read (the tracker holds PII).
 */

import { Router } from 'express';
import { z } from 'zod';
import {
  ApplicationStatus,
  InterviewRoundType,
  InterviewRoundResult,
} from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rateLimit.js';
import {
  createApplicationHandler,
  deleteApplicationHandler,
  getApplicationHandler,
  listApplicationsHandler,
  summarizeApplicationsHandler,
  updateApplicationHandler,
} from '../controllers/applications.controller.js';
import {
  addRoundHandler,
  deleteRoundHandler,
  reorderRoundsHandler,
  updateRoundHandler,
} from '../controllers/interviewRounds.controller.js';

const roundCreateSchema = z.object({
  type: z.nativeEnum(InterviewRoundType).optional(),
  typeOther: z.string().max(100).nullable().optional(),
  scheduledAt: z.coerce.date().nullable().optional(),
  result: z.nativeEnum(InterviewRoundResult).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

const roundUpdateSchema = roundCreateSchema.strict();

const reorderSchema = z
  .object({ orderedIds: z.array(z.string().uuid()).min(1) })
  .strict();

const createSchema = z.object({
  company: z.string().min(1).max(200),
  role: z.string().min(1).max(200),
  status: z.nativeEnum(ApplicationStatus).optional(),
  statusOther: z.string().max(100).nullable().optional(),
  jobUrl: z.string().url().max(2048).nullable().optional(),
  appliedAt: z.coerce.date().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
});

const updateSchema = z
  .object({
    company: z.string().min(1).max(200).optional(),
    role: z.string().min(1).max(200).optional(),
    status: z.nativeEnum(ApplicationStatus).optional(),
    statusOther: z.string().max(100).nullable().optional(),
    jobUrl: z.string().url().max(2048).nullable().optional(),
    appliedAt: z.coerce.date().nullable().optional(),
    notes: z.string().max(5000).nullable().optional(),
  })
  .strict();

const router = Router();

router.get('/', requireAuth, listApplicationsHandler);
// Declared before /:id so "summary" is not treated as an application id.
router.get('/summary', requireAuth, summarizeApplicationsHandler);
router.get('/:id', requireAuth, getApplicationHandler);
router.post(
  '/',
  requireAuth,
  rateLimit({ windowMs: 60_000, max: 30 }),
  validateBody(createSchema),
  createApplicationHandler,
);
router.patch(
  '/:id',
  requireAuth,
  rateLimit({ windowMs: 60_000, max: 60 }),
  validateBody(updateSchema),
  updateApplicationHandler,
);
router.delete('/:id', requireAuth, deleteApplicationHandler);

// --- Interview rounds (nested per application; owner-scoped in the service).
// reorder is declared before /:roundId so it isn't parsed as a round id. ---
router.post('/:id/rounds', requireAuth, validateBody(roundCreateSchema), addRoundHandler);
router.post('/:id/rounds/reorder', requireAuth, validateBody(reorderSchema), reorderRoundsHandler);
router.patch(
  '/:id/rounds/:roundId',
  requireAuth,
  validateBody(roundUpdateSchema),
  updateRoundHandler,
);
router.delete('/:id/rounds/:roundId', requireAuth, deleteRoundHandler);

export default router;
