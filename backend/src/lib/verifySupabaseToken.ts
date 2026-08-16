/**
 * Verify a Supabase-issued access token LOCALLY (no network round-trip).
 *
 * We still use Supabase Auth for everything — signup, sign-in, and issuing
 * these tokens. This module only changes HOW the backend *checks* a token it
 * receives. Instead of calling `supabaseAdmin.auth.getUser(token)` (a network
 * request to Supabase on every authenticated call, ~1–2s), we verify the JWT's
 * cryptographic signature ourselves using the project's JWT secret. Supabase
 * signed the token; anyone holding the same secret can confirm it's genuine and
 * untampered — offline, in ~1ms.
 *
 * TRADEOFF (documented, deliberate): a locally-verified token is trusted until
 * it EXPIRES (Supabase default: 1 hour). We don't detect a sign-out or ban that
 * happens mid-token. For a pseudonymous community this is the standard, accepted
 * pattern. If a future action needs instant revocation, it can fall back to a
 * live `getUser()` check for just that action.
 *
 * ALGORITHM: Supabase's classic access tokens are signed HS256 with the shared
 * "JWT Secret" (Supabase dashboard → Settings → API → JWT Secret). If a project
 * is migrated to the newer asymmetric signing keys (ES256), verification here
 * fails and we'd switch to JWKS-based verification — a small change with the
 * same `jose` library.
 */

import { jwtVerify } from 'jose';

/**
 * The claims we rely on from a verified Supabase access token.
 * `sub` is the Supabase user id — the same value we previously read from
 * `getUser().data.user.id` and map to our local User row.
 */
export interface VerifiedToken {
  sub: string;
  email?: string;
}

/**
 * Read the signing secret from the environment, encoded for `jose`.
 * Read lazily (per call) rather than at import time so the module can be loaded
 * in tests/tools without the env var, and so a missing secret surfaces as a
 * clear runtime error at the point of use.
 */
function getSecretKey(): Uint8Array {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    throw new Error('Missing SUPABASE_JWT_SECRET in the environment.');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Verify a raw access token (the string after "Bearer ").
 *
 * Resolves with the token's subject (+ email if present) when the signature is
 * valid AND the token is unexpired. Rejects otherwise — callers translate a
 * rejection into a 401 (requireAuth) or simply treat the caller as anonymous
 * (optionalAuth).
 *
 * `jwtVerify` checks the signature and the `exp` claim; we additionally require
 * a `sub` so downstream code always has a user id to map.
 */
export async function verifySupabaseToken(token: string): Promise<VerifiedToken> {
  const { payload } = await jwtVerify(token, getSecretKey(), {
    algorithms: ['HS256'],
  });

  if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
    throw new Error('Token is missing a valid `sub` (subject) claim.');
  }

  return {
    sub: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : undefined,
  };
}
