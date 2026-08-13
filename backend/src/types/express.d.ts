/**
 * Type augmentation: add our authenticated user to Express's Request.
 *
 * After the requireAuth middleware runs, `req.user` holds the current user's
 * PUBLIC fields (id, handle, createdAt) — deliberately NOT supabaseUserId, so
 * downstream handlers can't accidentally leak the private identity.
 */

import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        handle: string;
        createdAt: Date;
      };
    }
  }
}

export {};
