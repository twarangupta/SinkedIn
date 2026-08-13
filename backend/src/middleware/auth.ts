/**
 * Authentication middleware.
 *
 * `requireAuth` guards routes that need a logged-in user. It:
 *   1. reads the Bearer token from the Authorization header,
 *   2. verifies it with Supabase (supabaseAdmin.auth.getUser),
 *   3. find-or-creates the local User row (attaching handle) for that identity,
 *   4. puts the PUBLIC user on req.user for downstream handlers.
 * Any failure → 401. Unexpected errors are passed to the error handler.
 */

import type { NextFunction, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
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
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Map the Supabase identity to our own User row (created on first login).
    req.user = await findOrCreateUser(data.user.id);
    next();
  } catch (err) {
    next(err);
  }
}
