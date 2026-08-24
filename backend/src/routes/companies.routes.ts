/**
 * Company routes — mounted at /api/v1/companies. Read-only autocomplete search.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { searchCompaniesHandler } from '../controllers/companies.controller.js';

const router = Router();

// GET /api/v1/companies?q=... — autocomplete for the tracker company field.
router.get('/', requireAuth, searchCompaniesHandler);

export default router;
