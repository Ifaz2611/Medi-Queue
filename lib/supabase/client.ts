"use client";

// Browser Supabase client (FR-01). Uses the public publishable key.
// Prefer calling the app's own /api routes from components; this client is
// available for realtime subscriptions and direct auth helpers.

import { createBrowserClient } from "@supabase/ssr";
import {
  assertSupabaseConfigured,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from "./config";

export function createBrowserSupabase() {
  assertSupabaseConfigured();
  return createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}
