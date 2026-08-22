/**
 * Comment routes — endpoint definitions + middleware wiring only.
 *
 * Mounted at /api/v1/comments. Comment *creation* and *listing* live under the
 * Sink they belong to (/sinks/:id/comments); this router owns actions on an
 * existing comment by its own id — currently voting.
 */

import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { commentVoteHandler } from '../controllers/comments.controller.js';

// Same shape as the Sink vote: the client sends only a direction; the server
// clamps the step to [-1, +1].
const voteSchema = z.object({ direction: z.enum(['UP', 'DOWN']) });

const router = Router();

// POST /api/v1/comments/:id/vote — buoy/anchor a comment (auth required).
router.post('/:id/vote', requireAuth, validateBody(voteSchema), commentVoteHandler);

export default router;
