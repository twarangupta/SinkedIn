/**
 * Application controller — HTTP concerns only for the private job tracker.
 * Every handler is auth-gated (requireAuth sets req.user) and the service is
 * owner-scoped, so a caller can only ever touch their own applications.
 */

import type { NextFunction, Request, Response } from 'express';
import { ApplicationStatus } from '@prisma/client';
import {
  createApplication,
  deleteApplication,
  getApplication,
  listApplications,
  summarizeApplications,
  updateApplication,
} from '../services/applications.service.js';

/** GET /api/v1/applications/summary → { counts, total }. Auth required. */
export async function summarizeApplicationsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const summary = await summarizeApplications(req.user.id);
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

/** POST /api/v1/applications → { application }. Auth required. */
export async function createApplicationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const application = await createApplication(req.user.id, req.body);
    res.status(201).json({ application });
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/applications?status=INTERVIEW → { applications }. Auth required. */
export async function listApplicationsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const raw = typeof req.query.status === 'string' ? req.query.status : undefined;
    const status =
      raw && raw in ApplicationStatus
        ? (raw as ApplicationStatus)
        : undefined;
    const applications = await listApplications(req.user.id, { status });
    res.json({ applications });
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/applications/:id → { application }. Auth required. */
export async function getApplicationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const application = await getApplication(req.user.id, req.params.id);
    res.json({ application });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/v1/applications/:id → { application }. Auth required. */
export async function updateApplicationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const application = await updateApplication(
      req.user.id,
      req.params.id,
      req.body,
    );
    res.json({ application });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/v1/applications/:id → { ok: true }. Auth required (soft-delete). */
export async function deleteApplicationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    await deleteApplication(req.user.id, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
