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
import cors from 'cors';
import { getAllowedOrigins } from './lib/config.js';
import categoriesRouter from './routes/categories.routes.js';
import usersRouter from './routes/users.routes.js';
import sinksRouter from './routes/sinks.routes.js';
import commentsRouter from './routes/comments.routes.js';
import reportsRouter from './routes/reports.routes.js';
import applicationsRouter from './routes/applications.routes.js';
import companiesRouter from './routes/companies.routes.js';
import sitemapRouter from './routes/sitemap.routes.js';
import { AppError } from './lib/errors.js';

/**
 * Create a fully-wired Express app.
 */
export function createApp() {
  const app = express();

  // Allow the frontend (a different origin in dev: :5173 → :4000) to call the
  // API. FRONTEND_URL is a comma-separated list of allowed origins (apex
  // domain, www, and the *.vercel.app alias all point at the same deploy), and
  // overrides the dev default. Without this, the browser blocks cross-origin
  // requests before they reach any route. Passing an array lets the cors
  // package echo back whichever allowed origin the request actually came from.
  app.use(cors({ origin: getAllowedOrigins(), credentials: true }));

  // Parse JSON request bodies into req.body.
  app.use(express.json());

  // Health check (infrastructure, not product API — deliberately not under /api).
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'sinkedin-backend' });
  });

  // --- Feature routers, all under the versioned /api/v1 prefix ---
  app.use('/api/v1/categories', categoriesRouter);
  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1/sinks', sinksRouter);
  app.use('/api/v1/comments', commentsRouter);
  app.use('/api/v1/reports', reportsRouter);
  app.use('/api/v1/applications', applicationsRouter);
  app.use('/api/v1/companies', companiesRouter);
  app.use(sitemapRouter);

  // --- Centralized error handler (must be LAST, and must take 4 args so
  // Express recognizes it as error-handling middleware). Controllers pass
  // errors here via next(error). ---
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    // Expected errors carry a status code; everything else is a 500.
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    // eslint-disable-next-line no-console
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  return app;
}
