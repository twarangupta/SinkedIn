/**
 * Supabase server client (admin).
 *
 * Built with the SERVICE_ROLE key, so it must only ever be used on the backend
 * — never shipped to the browser. We use it to verify a caller's JWT via
 * `supabaseAdmin.auth.getUser(token)`: given an access token, Supabase confirms
 * it's valid and returns the authenticated user.
 *
 * Session persistence/refresh are disabled — this is a stateless server client,
 * not a logged-in browser session.
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.',
  );
}

export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
