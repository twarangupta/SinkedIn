/**
 * Verify a Supabase-issued access token LOCALLY (no per-request network call to
 * Supabase Auth).
 *
 * We still use Supabase Auth for everything — signup, sign-in, and issuing
 * these tokens. This module only changes HOW the backend *checks* a token it
 * receives. Instead of calling `supabaseAdmin.auth.getUser(token)` (a network
 * request to Supabase on every authenticated call, ~1–2s), we verify the JWT's
 * signature ourselves in ~1ms.
 *
 * TWO SIGNING SCHEMES (Supabase is mid-migration, so we support both):
 *   - HS256 (legacy): tokens signed with the shared "Legacy JWT Secret"
 *     (dashboard → Settings → API → JWT Keys → Legacy JWT Secret). Verified with
 *     that secret in SUPABASE_JWT_SECRET.
 *   - ES256/RS256 (new "JWT Signing Keys"): tokens signed with an asymmetric
 *     key. Verified against the project's PUBLIC keys, published at the JWKS
 *     endpoint `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`. `jose` fetches
 *     that key set ONCE and caches it (refetching only when it sees an unknown
 *     key id), so this is not a per-request round-trip.
 *
 * We pick the path from the token's own `alg` header, so it keeps working
 * before, during, and after the project rotates from the legacy secret to
 * asymmetric signing keys.
 *
 * TRADEOFF (documented, deliberate): a locally-verified token is trusted until
 * it EXPIRES (Supabase default: 1 hour). We don't detect a sign-out or ban that
 * happens mid-token. For a pseudonymous community this is the standard, accepted
 * pattern. A future action needing instant revocation can fall back to a live
 * `getUser()` check for just that action.
 */

import {
  jwtVerify,
  createRemoteJWKSet,
  decodeProtectedHeader,
  type JWTPayload,
} from 'jose';

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
 * Read the HS256 signing secret from the environment, encoded for `jose`.
 * Read lazily (per call) so the module loads in tests/tools without the env var,
 * and a missing secret surfaces as a clear runtime error at the point of use.
 */
function getSecretKey(): Uint8Array {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    throw new Error('Missing SUPABASE_JWT_SECRET in the environment.');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Lazily-built, cached JWKS resolver for the project's asymmetric public keys.
 * `createRemoteJWKSet` handles fetching + caching + rotation internally, so we
 * build it once per process.
 */
let jwksCache: ReturnType<typeof createRemoteJWKSet> | undefined;
function getJwks(): ReturnType<typeof createRemoteJWKSet> {
  if (!jwksCache) {
    const base = process.env.SUPABASE_URL;
    if (!base) {
      throw new Error('Missing SUPABASE_URL in the environment (needed for JWKS).');
    }
    const url = new URL('/auth/v1/.well-known/jwks.json', base);
    jwksCache = createRemoteJWKSet(url);
  }
  return jwksCache;
}

/**
 * Verify a raw access token (the string after "Bearer ").
 *
 * Resolves with the token's subject (+ email if present) when the signature is
 * valid AND the token is unexpired. Rejects otherwise — callers translate a
 * rejection into a 401 (requireAuth) or treat the caller as anonymous
 * (optionalAuth).
 */
export async function verifySupabaseToken(token: string): Promise<VerifiedToken> {
  // Read the algorithm from the (unverified) header to choose the key source.
  // This is safe: we still fully verify the signature below with that key.
  const { alg } = decodeProtectedHeader(token);

  let payload: JWTPayload;
  if (alg === 'HS256') {
    ({ payload } = await jwtVerify(token, getSecretKey(), { algorithms: ['HS256'] }));
  } else {
    // Asymmetric signing keys (new Supabase default).
    ({ payload } = await jwtVerify(token, getJwks(), { algorithms: ['ES256', 'RS256'] }));
  }

  if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
    throw new Error('Token is missing a valid `sub` (subject) claim.');
  }

  return {
    sub: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : undefined,
  };
}
