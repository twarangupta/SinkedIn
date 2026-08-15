/**
 * Sink routes — endpoint definitions + middleware wiring only.
 *
 * Mounted at /api/v1/sinks. Note the public/protected split (public-first
 * product model): reading the feed is public; creating a Sink requires auth.
 */

import { Router } from 'express';
import { z } from 'zod';
import { Conclusion } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import {
  createSinkHandler,
  listSinksHandler,
} from '../controllers/sinks.controller.js';

/**
 * Shape validation for creating a Sink. Category-conditional rules (requiresPoll,
 * conclusion=OTHER, etc.) are enforced in the service, since they depend on the
 * chosen category's config. Here we only validate the flat shape/limits.
 */
const createSinkSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().min(1).max(200),
  body: z.string().max(5000).optional(),
  company: z.string().max(100).optional(),
  conclusion: z.nativeEnum(Conclusion).optional(),
  conclusionOther: z.string().max(100).optional(),
  pollOptions: z.array(z.string().min(1).max(100)).min(2).max(6).optional(),
});

const router = Router();

// GET /api/v1/sinks — public feed (optionally ?category=slug).
router.get('/', listSinksHandler);

// POST /api/v1/sinks — create a Sink (auth + validation).
router.post('/', requireAuth, validateBody(createSinkSchema), createSinkHandler);

export default router;
