/**
 * SinkedIn backend — server entry point.
 *
 * Loads environment variables, builds the app (see app.ts), and starts
 * listening. Kept tiny on purpose: all wiring lives in app.ts, all logic in
 * services.
 *
 * `dotenv/config` is imported FIRST so process.env is populated before any
 * other module (e.g. the Prisma client) reads it.
 */

import 'dotenv/config';
import { createApp } from './app.js';

const app = createApp();

// Render injects PORT in production; fall back to 4000 for local dev.
const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`SinkedIn backend listening on http://localhost:${PORT}`);
});
