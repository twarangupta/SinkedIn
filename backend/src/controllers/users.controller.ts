/**
 * User controller — HTTP concerns only. No business logic, no Prisma.
 */

import type { NextFunction, Request, Response } from 'express';
import { getUserByHandle, updateMyAvatar } from '../services/users.service.js';
import { getMyVoteState } from '../services/votes.service.js';

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
 * GET /api/v1/users/me/votes → { votes, pollVotes } for the authenticated
 * caller — used by the client to hydrate its own vote highlights (see
 * getMyVoteState). Auth required.
 */
export async function getMyVotes(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const state = await getMyVoteState(req.user.id);
    res.json(state);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/users/me → change the caller's avatar. Body { avatarId } has
 * already been Zod-validated at the route boundary. Returns { user }.
 */
export async function updateMe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const user = await updateMyAvatar(req.user.id, req.body.avatarId);
    res.json({ user });
  } catch (err) {
    next(err);
  }
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
