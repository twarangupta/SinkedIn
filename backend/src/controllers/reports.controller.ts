/**
 * Report controller — HTTP concerns only. No business logic, no Prisma.
 */

import type { NextFunction, Request, Response } from 'express';
import type { ReportTargetType } from '@prisma/client';
import { createReport } from '../services/reports.service.js';

/**
 * POST /api/v1/reports { targetType, targetId, reason? } → { reported: true }.
 * Auth required. Body validated at the route boundary.
 */
export async function createReportHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { targetType, targetId, reason } = req.body as {
      targetType: ReportTargetType;
      targetId: string;
      reason?: string;
    };
    const result = await createReport(req.user.id, targetType, targetId, reason);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}
