/**
 * Tests for the FRONTEND_URL parsing helpers. These guard the CORS allow-list
 * and the sitemap's canonical base URL — a subtle bug here (e.g. a trailing
 * slash that stops an origin from matching) silently breaks the live site's
 * API calls, so it's worth pinning down.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { getAllowedOrigins, getCanonicalFrontendUrl } from './config.js';

const ORIGINAL = process.env.FRONTEND_URL;

afterEach(() => {
  // Restore whatever the environment had so tests stay isolated.
  if (ORIGINAL === undefined) delete process.env.FRONTEND_URL;
  else process.env.FRONTEND_URL = ORIGINAL;
});

describe('getAllowedOrigins', () => {
  it('falls back to the local dev origin when FRONTEND_URL is unset', () => {
    delete process.env.FRONTEND_URL;
    expect(getAllowedOrigins()).toEqual(['http://localhost:5173']);
  });

  it('parses a single origin', () => {
    process.env.FRONTEND_URL = 'https://sinkedin.in';
    expect(getAllowedOrigins()).toEqual(['https://sinkedin.in']);
  });

  it('parses a comma-separated list of origins', () => {
    process.env.FRONTEND_URL =
      'https://sinkedin.in,https://www.sinkedin.in,https://sinkedin.vercel.app';
    expect(getAllowedOrigins()).toEqual([
      'https://sinkedin.in',
      'https://www.sinkedin.in',
      'https://sinkedin.vercel.app',
    ]);
  });

  it('trims whitespace and strips trailing slashes', () => {
    process.env.FRONTEND_URL = ' https://sinkedin.in/ , https://www.sinkedin.in/// ';
    expect(getAllowedOrigins()).toEqual([
      'https://sinkedin.in',
      'https://www.sinkedin.in',
    ]);
  });

  it('ignores empty entries from stray commas', () => {
    process.env.FRONTEND_URL = 'https://sinkedin.in,,';
    expect(getAllowedOrigins()).toEqual(['https://sinkedin.in']);
  });
});

describe('getCanonicalFrontendUrl', () => {
  it('returns the first origin in the list', () => {
    process.env.FRONTEND_URL = 'https://sinkedin.in,https://www.sinkedin.in';
    expect(getCanonicalFrontendUrl()).toBe('https://sinkedin.in');
  });

  it('falls back to the local dev origin when unset', () => {
    delete process.env.FRONTEND_URL;
    expect(getCanonicalFrontendUrl()).toBe('http://localhost:5173');
  });
});
