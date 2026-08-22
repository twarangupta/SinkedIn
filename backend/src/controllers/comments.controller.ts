/**
 * Comment controller — HTTP concerns only. No business logic, no Prisma.
 */

import type { NextFunction, Request, Response } from 'express';
import {
  createComment,
  getCommentsForSink,
  stepCommentVote,
} from '../services/comments.service.js';

/**
 * POST /api/v1/sinks/:id/comments { body, parentId? } → { comment }. Auth req.
 */
export async function createCommentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { body, parentId } = req.body as { body: string; parentId?: string };
    const comment = await createComment(req.user.id, req.params.id, body, parentId);
    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/comments/:id/vote { direction: 'UP' | 'DOWN' } → { score, myVote }.
 * Auth required. Clamped one-step stepper (see stepCommentVote).
 */
export async function commentVoteHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { direction } = req.body as { direction: 'UP' | 'DOWN' };
    const result = await stepCommentVote(req.user.id, req.params.id, direction);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/sinks/:id/comments → { comments }. Public.
 */
export async function listCommentsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const comments = await getCommentsForSink(req.params.id);
    res.json({ comments });
  } catch (err) {
    next(err);
  }
}
