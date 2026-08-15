/**
 * Zod validation middleware.
 *
 * Validates req.body against a schema at the route boundary — BEFORE the
 * controller/service run. On failure, returns 400 with the field errors. On
 * success, replaces req.body with the parsed (typed, stripped) data.
 *
 * This is the "validate at the boundary, never trust the client" rule.
 */

import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

export function validateBody(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
