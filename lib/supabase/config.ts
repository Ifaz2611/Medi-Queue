// Shared Supabase configuration (safe to import on client, server and edge).
// Reads the public keys with a fallback chain so both the new
// "publishable" naming and the legacy "anon" naming work.

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

export const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? "";

export const FIELD_ENCRYPTION_KEY = process.env.FIELD_ENCRYPTION_KEY ?? "";

/** True once the public Supabase env vars are present. */
export const supabaseConfigured = Boolean(
  SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY,
);
