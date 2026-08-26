/**
 * Notification routes — the in-app bell. Mounted at /api/v1/notifications.
 * Auth required on every route (a user's notifications are private to them).
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listNotificationsHandler,
  markNotificationsReadHandler,
} from '../controllers/notifications.controller.js';

const router = Router();

router.get('/', requireAuth, listNotificationsHandler);
router.post('/read', requireAuth, markNotificationsReadHandler);

export default router;
