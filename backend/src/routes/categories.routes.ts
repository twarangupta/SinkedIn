/**
 * Category routes — endpoint definitions + middleware wiring only.
 *
 * Maps HTTP paths to controller functions. No business logic, no Prisma.
 * Mounted at /api/v1/categories in app.ts, so `/` here = GET /api/v1/categories.
 */

import { Router } from 'express';
import { listCategories } from '../controllers/categories.controller.js';

const router = Router();

// GET /api/v1/categories — list all categories.
// (No auth: categories are public and drive the compose form + feed filter.)
router.get('/', listCategories);

export default router;
