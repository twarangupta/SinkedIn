/**
 * Authentication middleware.
 *
 * `requireAuth` guards routes that need a logged-in user. It:
 *   1. reads the Bearer token from the Authorization header,
 *   2. verifies it LOCALLY via its signature (no network call to Supabase),
 *   3. find-or-creates the local User row (attaching handle) for that identity,
 *   4. puts the PUBLIC user on req.user for downstream handlers.
 * Any failure → 401. Unexpected errors are passed to the error handler.
 *
 * WHY LOCAL VERIFICATION: Supabase Auth still issues and manages the tokens;
 * we simply check the JWT signature ourselves (see lib/verifySupabaseToken.ts)
 * instead of calling `auth.getUser()` on every request. That removed a ~1–2s
 * network round-trip from every authenticated action.
 */

import type { NextFunction, Request, Response } from 'express';
import { verifySupabaseToken } from '../lib/verifySupabaseToken.js';
import { findOrCreateUser } from '../services/users.service.js';

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid Authorization header' });
      return;
    }

    const token = header.slice('Bearer '.length);

    // Verify the signature locally. A bad/expired token throws → 401.
    let sub: string;
    try {
      ({ sub } = await verifySupabaseToken(token));
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Map the Supabase identity to our own User row (created on first login).
    req.user = await findOrCreateUser(sub);
    next();
  } catch (err) {
    next(err);
  }
}
