/**
 * Sink controller — HTTP concerns only. No business logic, no Prisma.
 */

import type { NextFunction, Request, Response } from 'express';
import { createSink, getFeed } from '../services/sinks.service.js';

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
 * GET /api/v1/sinks?category=slug → { sinks }. Public (no auth).
 */
export async function listSinksHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const categorySlug =
      typeof req.query.category === 'string' ? req.query.category : undefined;
    const sinks = await getFeed({ categorySlug });
    res.json({ sinks });
  } catch (err) {
    next(err);
  }
}
