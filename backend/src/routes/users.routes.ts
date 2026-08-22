/**
 * User routes — endpoint definitions + middleware wiring only.
 * Mounted at /api/v1/users in app.ts.
 */

import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { AVATAR_IDS } from '../lib/avatars.js';
import {
  getByHandle,
  getMe,
  getMyVotes,
  updateMe,
} from '../controllers/users.controller.js';

// Only a known avatar id is accepted. z.enum needs a non-empty tuple, which
// AVATAR_IDS (a readonly const tuple) satisfies.
const updateMeSchema = z.object({
  avatarId: z.enum(AVATAR_IDS),
});

const router = Router();

// GET /api/v1/users/me — current user (auth required).
// Declared BEFORE /:handle so "me" isn't captured as a handle param.
router.get('/me', requireAuth, getMe);

// PATCH /api/v1/users/me — change the caller's avatar (auth required).
router.patch('/me', requireAuth, validateBody(updateMeSchema), updateMe);

// GET /api/v1/users/me/votes — the caller's own votes, for client hydration.
router.get('/me/votes', requireAuth, getMyVotes);

// GET /api/v1/users/:handle — public profile by handle.
router.get('/:handle', getByHandle);

export default router;
