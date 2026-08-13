/**
 * SinkedIn backend — application entry point.
 *
 * Responsibilities of THIS file (kept deliberately small):
 *   1. Load environment variables from backend/.env.
 *   2. Create the Express app and wire up global middleware.
 *   3. Expose a health-check endpoint so hosting (Render) can tell we're alive.
 *   4. Start listening on a port.
 *
 * NO business logic and NO routes live here yet. As features are built, feature
 * routers from src/routes/ will be mounted under the /api/v1 prefix — the
 * request flow is always: routes -> controllers -> services -> prisma.
 */

import 'dotenv/config';
import express from 'express';

// Create the Express application instance.
const app = express();

// Parse incoming JSON request bodies into req.body. Every API route that
// accepts a body relies on this running first.
app.use(express.json());

/**
 * Health check.
 *
 * Not under /api/v1 on purpose: it's infrastructure, not product API. Hosting
 * platforms ping an endpoint like this to decide whether the service is up.
 */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'sinkedin-backend' });
});

// ---------------------------------------------------------------------------
// Feature routers will be mounted here as they are built, e.g.:
//   app.use('/api/v1/sinks', sinksRouter);
//   app.use('/api/v1/categories', categoriesRouter);
// ---------------------------------------------------------------------------

// Read the port from the environment (Render injects one); fall back to 4000
// for local development.
const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`SinkedIn backend listening on http://localhost:${PORT}`);
});
