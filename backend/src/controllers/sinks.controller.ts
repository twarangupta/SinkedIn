/**
 * Sink controller — HTTP concerns only. No business logic, no Prisma.
 */

import type { NextFunction, Request, Response } from 'express';
import {
  createSink,
  deleteSink,
  getFeed,
  getSinkById,
  updateSink,
} from '../services/sinks.service.js';
import { removeVote, stepVote } from '../services/votes.service.js';
import { castPollVote } from '../services/pollVotes.service.js';

/**
 * POST /api/v1/sinks → { sink }. Auth required (requireAuth set req.user).
 */
export async function createSinkHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const sink = await createSink(req.user.id, req.body);
    res.status(201).json({ sink });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/sinks?category=slug → { sinks }. Public (optionalAuth adds myVote).
 */
export async function listSinksHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const categorySlug =
      typeof req.query.category === 'string' ? req.query.category : undefined;
    const authorHandle =
      typeof req.query.author === 'string' ? req.query.author : undefined;
    const cursor =
      typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
    // Only 'top' overrides the default 'latest'; anything else falls through.
    const sort = req.query.sort === 'top' ? 'top' : 'latest';
    const { sinks, nextCursor } = await getFeed({
      categorySlug,
      authorHandle,
      cursor,
      sort,
      userId: req.user?.id,
    });
    res.json({ sinks, nextCursor });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/sinks/:id → { sink }. Public (optionalAuth adds myVote).
 */
export async function getSinkHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sink = await getSinkById(req.params.id, req.user?.id);
    res.json({ sink });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/sinks/:id → { sink }. Auth required; author-only (403 otherwise).
 * Edits text + image fields only (category/poll locked; enforced in the service).
 */
export async function updateSinkHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const sink = await updateSink(req.user.id, req.params.id, req.body);
    res.json({ sink });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/sinks/:id → { ok: true }. Auth required; author-only (403).
 * Soft-delete (sets deletedAt); never a hard delete. Returns a small JSON body
 * (not 204) so the shared client fetch helper can parse a response.
 */
export async function deleteSinkHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    await deleteSink(req.user.id, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/sinks/:id/vote { direction: 'UP' | 'DOWN' }
 *   → { score, myVote }. Auth required.
 * The server clamps the caller's vote to one step in [-1, +1] (see stepVote).
 */
export async function voteHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const result = await stepVote(req.user.id, req.params.id, req.body.direction);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/sinks/:id/poll-vote { pollOptionId }
 *   → { pollOptions, myPollVote }. Auth required.
 * Re-voting your current option toggles it off; a different option moves it.
 */
export async function pollVoteHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const result = await castPollVote(
      req.user.id,
      req.params.id,
      req.body.pollOptionId,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/sinks/:id/vote → { score, myVote: null }. Auth required.
 */
export async function unvoteHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const result = await removeVote(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
