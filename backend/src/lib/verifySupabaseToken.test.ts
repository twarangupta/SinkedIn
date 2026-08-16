/**
 * Tests for local Supabase-token verification. These pin the security-critical
 * behaviour: a correctly-signed, unexpired token is accepted and its `sub` is
 * returned; anything else (wrong secret, tampered, expired, missing sub, or no
 * configured secret) is rejected.
 *
 * We mint tokens here with `jose` using a test secret — the same HS256 scheme
 * Supabase uses — so no real Supabase call is involved.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SignJWT } from 'jose';
import { verifySupabaseToken } from './verifySupabaseToken.js';

const TEST_SECRET = 'test-jwt-secret-at-least-32-bytes-long-000';
const ORIGINAL = process.env.SUPABASE_JWT_SECRET;

/** Encode a secret the way the verifier does. */
function key(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

/** Mint a signed token like Supabase would (HS256), with overridable claims. */
async function mintToken(options: {
  secret?: string;
  sub?: string | undefined;
  email?: string;
  expiresIn?: string; // e.g. '1h', or '-1h' for already-expired
} = {}): Promise<string> {
  const { secret = TEST_SECRET, email, expiresIn = '1h' } = options;
  // Distinguish "sub key absent" (use default) from "sub: undefined" (omit it),
  // since a plain default parameter would treat both the same.
  const sub = 'sub' in options ? options.sub : 'user-123';
  const builder = new SignJWT({ ...(email ? { email } : {}) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .setAudience('authenticated');
  if (sub !== undefined) builder.setSubject(sub);
  return builder.sign(key(secret));
}

beforeEach(() => {
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
});

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.SUPABASE_JWT_SECRET;
  else process.env.SUPABASE_JWT_SECRET = ORIGINAL;
});

describe('verifySupabaseToken', () => {
  it('accepts a valid token and returns its sub', async () => {
    const token = await mintToken({ sub: 'abc-123' });
    const result = await verifySupabaseToken(token);
    expect(result.sub).toBe('abc-123');
  });

  it('returns the email claim when present', async () => {
    const token = await mintToken({ sub: 'abc-123', email: 'x@example.com' });
    const result = await verifySupabaseToken(token);
    expect(result.email).toBe('x@example.com');
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await mintToken({ secret: 'a-totally-different-secret-value-000000' });
    await expect(verifySupabaseToken(token)).rejects.toThrow();
  });

  it('rejects an expired token', async () => {
    const token = await mintToken({ expiresIn: '-1h' });
    await expect(verifySupabaseToken(token)).rejects.toThrow();
  });

  it('rejects a token with no sub claim', async () => {
    const token = await mintToken({ sub: undefined });
    await expect(verifySupabaseToken(token)).rejects.toThrow(/sub/i);
  });

  it('rejects a garbage token', async () => {
    await expect(verifySupabaseToken('not.a.jwt')).rejects.toThrow();
  });

  it('throws a clear error when SUPABASE_JWT_SECRET is not configured', async () => {
    delete process.env.SUPABASE_JWT_SECRET;
    const token = await mintToken();
    await expect(verifySupabaseToken(token)).rejects.toThrow(/SUPABASE_JWT_SECRET/);
  });
});
