// Server-only Supabase admin client (service role). Bypasses RLS.
// NEVER import this module into a Client Component or ship it to the browser.

import { createClient } from "@supabase/supabase-js";
import {
  assertSupabaseConfigured,
  SUPABASE_SECRET_KEY,
  SUPABASE_URL,
} from "./config";

export function createAdminSupabase() {
  assertSupabaseConfigured();

  if (!SUPABASE_SECRET_KEY) {
    throw new Error(
      "SUPABASE_SECRET_KEY is not set. Add it to .env.local (server only).",
    );
  }

  return createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
