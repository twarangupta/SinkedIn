/**
 * sitemap.xml — lists every public Sink URL so search engines can discover
 * them. URLs point at the FRONTEND domain (where the pages actually render).
 *
 * NOTE: search engines look for the sitemap at the site root
 * (sinkedin.in/sitemap.xml). At deploy, the frontend host should serve or proxy
 * this. It lives on the backend because only the backend can query the DB.
 */

import { Router } from 'express';
import { getSinkSitemapEntries } from '../services/sinks.service.js';
import { getCanonicalFrontendUrl } from '../lib/config.js';

const router = Router();

router.get('/sitemap.xml', async (_req, res, next) => {
  try {
    const base = getCanonicalFrontendUrl();
    const entries = await getSinkSitemapEntries();
    const urls = [
      `<url><loc>${base}/</loc></url>`,
      ...entries.map(
        (entry) =>
          `<url><loc>${base}/s/${entry.id}</loc><lastmod>${entry.createdAt.toISOString()}</lastmod></url>`,
      ),
    ].join('');
    res.header('Content-Type', 'application/xml');
    res.send(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    );
  } catch (err) {
    next(err);
  }
});

export default router;
