/**
 * Optional authentication.
 *
 * Like requireAuth, but does NOT reject anonymous requests. If a valid Bearer
 * token is present, it sets req.user; if not, it just continues. Used on
 * PUBLIC read endpoints (the feed, a single Sink) so we can include "your vote"
 * for signed-in users without gating the page for everyone else.
 */

import type { NextFunction, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
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
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && data.user) {
        req.user = await findOrCreateUser(data.user.id);
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}
