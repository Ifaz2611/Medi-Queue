// Shared Supabase configuration (safe to import on client, server and edge).
//
// Next.js only inlines `NEXT_PUBLIC_*` variables into the browser bundle when
// they are referenced statically, so every `process.env.X` access below must
// stay literal.
//
// Values copied from `.env.example` are often present but empty. Treat empty
// (or whitespace-only) values as "unset" so the fallback chain still works —
// `??` alone does not fall back when a variable is an empty string.

function readEnv(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

const publicUrl = readEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
const serverUrl = readEnv(process.env.SUPABASE_URL);

const publicPublishableKey = readEnv(
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
const publicAnonKey = readEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const serverPublishableKey = readEnv(process.env.SUPABASE_PUBLISHABLE_KEY);
const serverAnonKey = readEnv(process.env.SUPABASE_ANON_KEY);

export const SUPABASE_URL = (publicUrl || serverUrl).replace(/\/+$/, "");

export const SUPABASE_PUBLISHABLE_KEY =
  publicPublishableKey ||
  publicAnonKey ||
  serverPublishableKey ||
  serverAnonKey;

export const SUPABASE_SECRET_KEY =
  readEnv(process.env.SUPABASE_SECRET_KEY) ||
  readEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);

export const FIELD_ENCRYPTION_KEY = readEnv(process.env.FIELD_ENCRYPTION_KEY);

/** True once the public Supabase env vars are present. */
export const supabaseConfigured = Boolean(
  SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY,
);

/**
 * Throw an actionable error instead of Supabase's generic
 * "Your project's URL and Key are required" message.
 */
export function assertSupabaseConfigured(): void {
  if (supabaseConfigured) return;

  const missing = [
    !SUPABASE_URL && "NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)",
    !SUPABASE_PUBLISHABLE_KEY &&
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)",
  ].filter(Boolean);

  throw new Error(
    `Supabase is not configured — missing ${missing.join(" and ")}. ` +
      "Add both values to `.env.local` in the project root, then restart the " +
      "dev server (environment changes are not picked up while it is running). " +
      "Find the values at https://supabase.com/dashboard/project/_/settings/api",
  );
}
