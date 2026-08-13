/**
 * User routes — endpoint definitions + middleware wiring only.
 * Mounted at /api/v1/users in app.ts.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getByHandle, getMe } from '../controllers/users.controller.js';

const router = Router();

// GET /api/v1/users/me — current user (auth required).
// Declared BEFORE /:handle so "me" isn't captured as a handle param.
router.get('/me', requireAuth, getMe);

// GET /api/v1/users/:handle — public profile by handle.
router.get('/:handle', getByHandle);

export default router;
