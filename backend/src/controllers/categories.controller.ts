/**
 * Category controller — HTTP concerns only.
 *
 * Reads the request (nothing needed here), calls the service, shapes the
 * response. NO business logic and NO Prisma access. On error, delegates to the
 * Express error handler via next().
 */

import type { NextFunction, Request, Response } from 'express';
import { getCategories } from '../services/categories.service.js';

/**
 * GET /api/v1/categories → { categories: PublicCategory[] }
 */
export async function listCategories(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const categories = await getCategories();
    res.json({ categories });
  } catch (error) {
    // Hand off to the centralized error middleware (defined in app.ts).
    next(error);
  }
}
