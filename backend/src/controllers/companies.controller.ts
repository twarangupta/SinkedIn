/**
 * Company controller — HTTP concerns only. Powers the tracker's company
 * autocomplete. Company names are neutral (no PII); auth-gated simply because
 * it's a signed-in tracker feature.
 */

import type { NextFunction, Request, Response } from 'express';
import { searchCompanies } from '../services/companies.service.js';

/** GET /api/v1/companies?q=raz → { companies: [{ id, name, domain }] }. */
export async function searchCompaniesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const companies = await searchCompanies(q);
    res.json({ companies });
  } catch (err) {
    next(err);
  }
}
