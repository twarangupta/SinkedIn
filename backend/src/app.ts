/**
 * Express application factory.
 *
 * Builds and configures the app (middleware, routers, error handling) but does
 * NOT start listening — that's index.ts's job. Splitting "build the app" from
 * "start the server" lets tests import the app (e.g. with supertest) without
 * opening a port.
 *
 * Request flow for every feature: routes → controllers → services → prisma.
 */

import express, { type NextFunction, type Request, type Response } from 'express';
import categoriesRouter from './routes/categories.routes.js';

/**
 * Create a fully-wired Express app.
 */
export function createApp() {
  const app = express();

  // Parse JSON request bodies into req.body.
  app.use(express.json());

  // Health check (infrastructure, not product API — deliberately not under /api).
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'sinkedin-backend' });
  });

  // --- Feature routers, all under the versioned /api/v1 prefix ---
  app.use('/api/v1/categories', categoriesRouter);
  // Future: app.use('/api/v1/sinks', sinksRouter); etc.

  // --- Centralized error handler (must be LAST, and must take 4 args so
  // Express recognizes it as error-handling middleware). Controllers pass
  // errors here via next(error). ---
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    // eslint-disable-next-line no-console
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  return app;
}
