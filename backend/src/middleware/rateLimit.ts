/**
 * Rate limiter — a small in-memory, fixed-window cap on write actions to blunt
 * spam/abuse (post floods, report floods). Keyed by the authenticated user id
 * (falls back to IP), so mount it AFTER requireAuth on write routes.
 *
 * WHY IN-MEMORY: the backend runs as a single instance (Render free tier), so a
 * process-local Map is enough. It resets on deploy, which is fine for basic
 * abuse protection. Reach for a shared store (Redis) only if we scale to
 * multiple instances — not before (that would be over-engineering now).
 */

import type { NextFunction, Request, Response } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}

export function rateLimit({
  windowMs,
  max,
  message = 'Slow down a moment.',
}: {
  windowMs: number;
  max: number;
  message?: string;
}) {
  const buckets = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.user?.id ?? req.ip ?? 'anon';
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    if (bucket.count >= max) {
      res.status(429).json({ error: message });
      return;
    }
    bucket.count++;
    next();
  };
}
