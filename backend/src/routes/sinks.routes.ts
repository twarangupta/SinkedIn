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
import { rateLimit } from '../middleware/rateLimit.js';
import {
  createSinkHandler,
  deleteSinkHandler,
  getSinkHandler,
  listSinksHandler,
  pollVoteHandler,
  reactionHandler,
  unvoteHandler,
  updateSinkHandler,
  voteHandler,
} from '../controllers/sinks.controller.js';
import {
  createCommentHandler,
  listCommentsHandler,
} from '../controllers/comments.controller.js';
import {
  addBookmarkHandler,
  removeBookmarkHandler,
} from '../controllers/bookmarks.controller.js';

const createSinkSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().min(1).max(200),
  body: z.string().max(5000).optional(),
  // A plain image URL (from the client upload). Provider-agnostic on purpose.
  imageUrl: z.string().url().max(2048).optional(),
  company: z.string().max(100).optional(),
  conclusion: z.nativeEnum(Conclusion).optional(),
  conclusionOther: z.string().max(100).optional(),
  pollOptions: z.array(z.string().min(1).max(100)).min(2).max(6).optional(),
});

// Edit body: every field optional (patch semantics). null clears a nullable
// field; title, when present, must be non-empty. Category + poll options are
// intentionally absent — they're locked after posting.
const updateSinkSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    body: z.string().max(5000).nullable().optional(),
    imageUrl: z.string().url().max(2048).nullable().optional(),
    company: z.string().max(100).nullable().optional(),
    conclusion: z.nativeEnum(Conclusion).nullable().optional(),
    conclusionOther: z.string().max(100).nullable().optional(),
  })
  .strict();

const voteSchema = z.object({ direction: z.enum(['UP', 'DOWN']) });
const reactionSchema = z.object({ kind: z.string().min(1).max(40) });

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
router.post(
  '/',
  requireAuth,
  rateLimit({ windowMs: 60_000, max: 8 }),
  validateBody(createSinkSchema),
  createSinkHandler,
);
// Edit / delete (auth required; author-only is enforced in the service).
router.patch(
  '/:id',
  requireAuth,
  rateLimit({ windowMs: 60_000, max: 20 }),
  validateBody(updateSinkSchema),
  updateSinkHandler,
);
router.delete('/:id', requireAuth, deleteSinkHandler);

router.post('/:id/vote', requireAuth, validateBody(voteSchema), voteHandler);
router.delete('/:id/vote', requireAuth, unvoteHandler);
router.post('/:id/reaction', requireAuth, validateBody(reactionSchema), reactionHandler);

// Bookmarks (private to the caller; toggle save/unsave).
router.post('/:id/bookmark', requireAuth, addBookmarkHandler);
router.delete('/:id/bookmark', requireAuth, removeBookmarkHandler);
router.post(
  '/:id/poll-vote',
  requireAuth,
  validateBody(pollVoteSchema),
  pollVoteHandler,
);
router.post(
  '/:id/comments',
  requireAuth,
  rateLimit({ windowMs: 60_000, max: 20 }),
  validateBody(createCommentSchema),
  createCommentHandler,
);

export default router;
