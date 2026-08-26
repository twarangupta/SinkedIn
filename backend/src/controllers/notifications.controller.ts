/**
 * Notifications controller — HTTP concerns only. Every handler is auth-gated and
 * owner-scoped, so a caller only ever sees or clears their own notifications.
 */

import type { NextFunction, Request, Response } from 'express';
import {
  listNotifications,
  markAllRead,
} from '../services/notifications.service.js';

/** GET /api/v1/notifications → { notifications, unreadCount }. Auth required. */
export async function listNotificationsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const result = await listNotifications(req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/** POST /api/v1/notifications/read → { read }. Marks all read. Auth required. */
export async function markNotificationsReadHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const read = await markAllRead(req.user.id);
    res.json({ read });
  } catch (err) {
    next(err);
  }
}
