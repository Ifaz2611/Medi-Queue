// Supabase integration placeholder (FR-01 / backend).
//
// The MVP currently runs on a self-contained local store (lib/store.tsx) so the
// demo works immediately after `npm run dev` without any keys.
//
// To connect a real backend / auth:
//   1. npm install @supabase/supabase-js
//   2. Copy .env.example to .env.local and fill in the Supabase values.
//   3. Run schema.sql in the Supabase SQL editor.
//   4. Uncomment the client below and swap the store's actions for queries.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** True once real Supabase env vars are present. */
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// import { createClient } from "@supabase/supabase-js";
// export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
