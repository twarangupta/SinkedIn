/**
 * Sink routes — endpoint definitions + middleware wiring only.
 *
 * Mounted at /api/v1/sinks. Public-first: reads use optionalAuth (public, but
 * they get "your vote" when signed in); writes/votes require auth.
 */

import { Router } from 'express';
import { z } from 'zod';
import { Conclusion } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { validateBody } from '../middleware/validate.js';
import {
  createSinkHandler,
  getSinkHandler,
  listSinksHandler,
  pollVoteHandler,
  unvoteHandler,
  voteHandler,
} from '../controllers/sinks.controller.js';
import {
  createCommentHandler,
  listCommentsHandler,
} from '../controllers/comments.controller.js';

const createSinkSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().min(1).max(200),
  body: z.string().max(5000).optional(),
  company: z.string().max(100).optional(),
  conclusion: z.nativeEnum(Conclusion).optional(),
  conclusionOther: z.string().max(100).optional(),
  pollOptions: z.array(z.string().min(1).max(100)).min(2).max(6).optional(),
});

const voteSchema = z.object({ direction: z.enum(['UP', 'DOWN']) });

const pollVoteSchema = z.object({ pollOptionId: z.string().uuid() });

const createCommentSchema = z.object({
  body: z.string().min(1).max(5000),
  parentId: z.string().uuid().optional(),
});

const router = Router();

// Reads (public; optionalAuth adds the caller's own vote when signed in).
router.get('/', optionalAuth, listSinksHandler);
router.get('/:id', optionalAuth, getSinkHandler);
router.get('/:id/comments', listCommentsHandler);

// Writes / votes / comments (auth required).
router.post('/', requireAuth, validateBody(createSinkSchema), createSinkHandler);
router.post('/:id/vote', requireAuth, validateBody(voteSchema), voteHandler);
router.delete('/:id/vote', requireAuth, unvoteHandler);
router.post(
  '/:id/poll-vote',
  requireAuth,
  validateBody(pollVoteSchema),
  pollVoteHandler,
);
router.post(
  '/:id/comments',
  requireAuth,
  validateBody(createCommentSchema),
  createCommentHandler,
);

export default router;
