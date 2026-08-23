/**
 * Interview-round controller — HTTP concerns only. Nested under an application
 * (:id = applicationId). All auth-gated; the service scopes to the owner.
 */

import type { NextFunction, Request, Response } from 'express';
import {
  addRound,
  deleteRound,
  reorderRounds,
  updateRound,
} from '../services/interviewRounds.service.js';

/** POST /api/v1/applications/:id/rounds → { round }. */
export async function addRoundHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const round = await addRound(req.user.id, req.params.id, req.body);
    res.status(201).json({ round });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/v1/applications/:id/rounds/:roundId → { round }. */
export async function updateRoundHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const round = await updateRound(
      req.user.id,
      req.params.id,
      req.params.roundId,
      req.body,
    );
    res.json({ round });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/v1/applications/:id/rounds/:roundId → { ok: true }. */
export async function deleteRoundHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    await deleteRound(req.user.id, req.params.id, req.params.roundId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

/** POST /api/v1/applications/:id/rounds/reorder { orderedIds } → { rounds }. */
export async function reorderRoundsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const rounds = await reorderRounds(req.user.id, req.params.id, req.body.orderedIds);
    res.json({ rounds });
  } catch (err) {
    next(err);
  }
}
