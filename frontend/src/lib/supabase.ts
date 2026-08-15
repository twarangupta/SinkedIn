/**
 * Supabase browser client.
 *
 * Built with the PUBLIC anon key (safe to ship to the browser). Handles the
 * user's login session — sign up, sign in, and issuing the JWT we attach to
 * backend API calls. The service_role key never appears here; it's server-only.
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env and fill them in.',
  );
}

export const supabase = createClient(url, anonKey);
