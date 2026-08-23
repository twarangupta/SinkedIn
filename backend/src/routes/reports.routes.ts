/**
 * Report routes — mounted at /api/v1/reports. Filing a report needs auth.
 */

import { Router } from 'express';
import { z } from 'zod';
import { ReportTargetType } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { createReportHandler } from '../controllers/reports.controller.js';

const createReportSchema = z.object({
  targetType: z.nativeEnum(ReportTargetType),
  targetId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

const router = Router();

// POST /api/v1/reports — flag a Sink or Comment for moderation.
router.post(
  '/',
  requireAuth,
  rateLimit({ windowMs: 60_000, max: 20 }),
  validateBody(createReportSchema),
  createReportHandler,
);

export default router;
