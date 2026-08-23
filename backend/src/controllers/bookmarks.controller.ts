/**
 * Bookmark controller — HTTP concerns only. No business logic, no Prisma.
 */

import type { NextFunction, Request, Response } from 'express';
import {
  addBookmark,
  getMyBookmarks,
  removeBookmark,
} from '../services/bookmarks.service.js';

/**
 * POST /api/v1/sinks/:id/bookmark → { bookmarked: true }. Auth required.
 */
export async function addBookmarkHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    await addBookmark(req.user.id, req.params.id);
    res.status(201).json({ bookmarked: true });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/sinks/:id/bookmark → { bookmarked: false }. Auth required.
 */
export async function removeBookmarkHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    await removeBookmark(req.user.id, req.params.id);
    res.json({ bookmarked: false });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/users/me/bookmarks → { sinks }. Auth required. The caller's saved
 * Sinks as public feed rows, newest-saved first.
 */
export async function myBookmarksHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const sinks = await getMyBookmarks(req.user.id);
    res.json({ sinks });
  } catch (err) {
    next(err);
  }
}
