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
  handleAvailability,
  handleSuggestions,
  markOnboardedHandler,
  updateMe,
  updateMyHandle,
} from '../controllers/users.controller.js';
import { myBookmarksHandler } from '../controllers/bookmarks.controller.js';

// Only a known avatar id is accepted. z.enum needs a non-empty tuple, which
// AVATAR_IDS (a readonly const tuple) satisfies.
const updateMeSchema = z.object({
  avatarId: z.enum(AVATAR_IDS),
});

// Set-handle body: deeper format/blocklist validation happens in the service.
const updateHandleSchema = z.object({
  handle: z.string().min(3).max(30),
});

const router = Router();

// GET /api/v1/users/me — current user (auth required).
// Declared BEFORE /:handle so "me" isn't captured as a handle param.
router.get('/me', requireAuth, getMe);

// PATCH /api/v1/users/me — change the caller's avatar (auth required).
router.patch('/me', requireAuth, validateBody(updateMeSchema), updateMe);

// PATCH /api/v1/users/me/handle — change the caller's handle (auth required).
router.patch(
  '/me/handle',
  requireAuth,
  validateBody(updateHandleSchema),
  updateMyHandle,
);

// POST /api/v1/users/me/onboarded — mark first-run onboarding complete.
router.post('/me/onboarded', requireAuth, markOnboardedHandler);

// GET /api/v1/users/me/votes — the caller's own votes, for client hydration.
router.get('/me/votes', requireAuth, getMyVotes);

// GET /api/v1/users/me/bookmarks — the caller's saved Sinks (newest first).
router.get('/me/bookmarks', requireAuth, myBookmarksHandler);

// Handle picker helpers (public reads). Declared BEFORE /:handle so the
// two-segment paths aren't shadowed.
router.get('/handle/suggestions', handleSuggestions);
router.get('/handle/available', handleAvailability);

// GET /api/v1/users/:handle — public profile by handle.
router.get('/:handle', getByHandle);

export default router;
