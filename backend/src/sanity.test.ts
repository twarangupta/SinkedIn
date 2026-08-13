/**
 * Sanity test — proves the Vitest harness itself works and is wired to the
 * ISOLATED test database, before any real service tests exist.
 *
 * When the first service is built (e.g. createSink), its test sits next to it
 * as `*.test.ts` and runs against this same sinkedin_test database.
 */

import { describe, it, expect } from 'vitest';

describe('test harness', () => {
  it('runs a basic assertion', () => {
    expect(1 + 1).toBe(2);
  });

  it('is pointed at the isolated test database (not dev)', () => {
    // vitest.setup.ts loaded .env.test; confirm we are NOT about to run tests
    // against the dev database.
    expect(process.env.DATABASE_URL).toContain('sinkedin_test');
  });
});
