/**
 * Optional authentication.
 *
 * Like requireAuth, but does NOT reject anonymous requests. If a valid Bearer
 * token is present, it sets req.user; if not (or the token is invalid), it just
 * continues anonymously. Used on PUBLIC read endpoints (the feed, a single
 * Sink) so we can include "your vote" for signed-in users without gating the
 * page for everyone else.
 *
 * Token verification is LOCAL (signature check, no network) — same mechanism as
 * requireAuth; see lib/verifySupabaseToken.ts.
 */

import type { NextFunction, Request, Response } from 'express';
import { verifySupabaseToken } from '../lib/verifySupabaseToken.js';
import { findOrCreateUser } from '../services/users.service.js';

export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      const token = header.slice('Bearer '.length);
      // An invalid/expired token here is not an error — the caller is simply
      // treated as anonymous, so we swallow verification failures.
      try {
        const { sub } = await verifySupabaseToken(token);
        req.user = await findOrCreateUser(sub);
      } catch {
        // Not signed in (or token no longer valid) — continue anonymously.
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}
