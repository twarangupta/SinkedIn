/**
 * Runtime configuration helpers derived from environment variables.
 *
 * FRONTEND_URL is a COMMA-SEPARATED list of allowed frontend origins. In
 * production the site is reachable at several origins that all point at the
 * same Vercel deployment (the apex domain, the www subdomain, and the
 * auto-generated *.vercel.app alias). CORS must allow every origin a real
 * browser might send, while the sitemap needs a single canonical base URL.
 *
 * Example (Render env):
 *   FRONTEND_URL=https://sinkedin.in,https://www.sinkedin.in,https://sinkedin.vercel.app
 *
 * The FIRST entry is treated as canonical (used to build sitemap URLs); the
 * whole list is used for the CORS allow-list. In dev, with FRONTEND_URL unset,
 * both default to the local Next.js dev server.
 */

const DEV_DEFAULT_ORIGIN = 'http://localhost:5173';

/**
 * Parse FRONTEND_URL into a clean list of origins.
 * - splits on commas
 * - trims whitespace
 * - drops any trailing slash (a browser Origin header never has one, so a
 *   trailing slash in config would silently fail to match)
 * - drops empty entries (e.g. a stray trailing comma)
 */
function parseFrontendOrigins(): string[] {
  const raw = process.env.FRONTEND_URL;
  if (!raw) return [DEV_DEFAULT_ORIGIN];

  const origins = raw
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter((o) => o.length > 0);

  return origins.length > 0 ? origins : [DEV_DEFAULT_ORIGIN];
}

/**
 * The full list of origins CORS should allow. Pass directly to cors({ origin }).
 */
export function getAllowedOrigins(): string[] {
  return parseFrontendOrigins();
}

/**
 * The canonical frontend base URL (first configured origin), used to build
 * absolute URLs the site should be indexed under (e.g. sitemap entries).
 */
export function getCanonicalFrontendUrl(): string {
  return parseFrontendOrigins()[0];
}
