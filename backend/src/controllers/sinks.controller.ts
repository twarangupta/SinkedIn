/**
 * Sink controller — HTTP concerns only. No business logic, no Prisma.
 */

import type { NextFunction, Request, Response } from 'express';
import { createSink, getFeed, getSinkById } from '../services/sinks.service.js';
import { castVote, removeVote } from '../services/votes.service.js';
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
    const sinks = await getFeed({ categorySlug, userId: req.user?.id });
    res.json({ sinks });
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
 * POST /api/v1/sinks/:id/vote { value } → { score, myVote }. Auth required.
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
    const result = await castVote(req.user.id, req.params.id, req.body.value);
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
