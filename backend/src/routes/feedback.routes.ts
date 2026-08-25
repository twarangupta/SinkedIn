/**
 * Feedback routes — "message the owner". Mounted at /api/v1/feedback.
 * Public (optionalAuth): anyone can send feedback. Rate-limited against spam.
 */

import { Router } from 'express';
import { z } from 'zod';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { validateBody } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { createFeedbackHandler } from '../controllers/feedback.controller.js';

const feedbackSchema = z
  .object({
    message: z.string().trim().min(1, 'Message is required').max(5000),
    // Optional reply address. Empty string is treated as "not provided".
    contactEmail: z
      .string()
      .trim()
      .email()
      .max(320)
      .optional()
      .or(z.literal('')),
    path: z.string().max(512).optional(),
  })
  .strict();

const router = Router();

router.post(
  '/',
  optionalAuth,
  rateLimit({ windowMs: 60_000, max: 5 }),
  validateBody(feedbackSchema),
  createFeedbackHandler,
);

export default router;
