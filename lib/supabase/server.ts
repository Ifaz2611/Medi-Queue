// Server Supabase client bound to the request cookies (FR-01).
// Reads the signed-in user's session so Row Level Security applies.

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import {
  assertSupabaseConfigured,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from "./config";

export async function createServerSupabase() {
  assertSupabaseConfigured();

  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component where cookies are read-only.
          // Session refresh is handled by middleware instead.
        }
      },
    },
  });
}
