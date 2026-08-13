/**
 * User controller — HTTP concerns only. No business logic, no Prisma.
 */

import type { NextFunction, Request, Response } from 'express';
import { getUserByHandle } from '../services/users.service.js';

/**
 * GET /api/v1/users/me → { user } for the authenticated caller.
 * requireAuth has already populated req.user.
 */
export function getMe(req: Request, res: Response): void {
  if (!req.user) {
    // Should never happen (requireAuth runs first), but guard defensively.
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  res.json({ user: req.user });
}

/**
 * GET /api/v1/users/:handle → { user } public profile, or 404.
 */
export async function getByHandle(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await getUserByHandle(req.params.handle);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
}
