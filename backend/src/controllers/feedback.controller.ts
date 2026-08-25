/**
 * Feedback controller — HTTP concerns only. Uses optionalAuth: anyone can send
 * feedback, and if they happen to be signed in we attach their id + handle for
 * context (never required).
 */

import type { NextFunction, Request, Response } from 'express';
import { createFeedback } from '../services/feedback.service.js';

/** POST /api/v1/feedback → { id }. Public (optionalAuth). */
export async function createFeedbackHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const feedback = await createFeedback({
      message: req.body.message,
      contactEmail: req.body.contactEmail ?? null,
      path: req.body.path ?? null,
      userId: req.user?.id ?? null,
      handle: req.user?.handle ?? null,
    });
    res.status(201).json({ id: feedback.id });
  } catch (err) {
    next(err);
  }
}
