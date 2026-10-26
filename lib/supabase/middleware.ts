// Middleware helper that keeps the Supabase auth session fresh on every
// request and writes refreshed cookies back to the browser (FR-01).

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  assertSupabaseConfigured,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from "./config";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  assertSupabaseConfigured();

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // IMPORTANT: getUser() refreshes the session and must be called before the
  // response is returned, otherwise tokens can expire silently.
  await supabase.auth.getUser();

  return response;
}
