import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Simulate a hand-copied .env.local where the NEXT_PUBLIC_ variables exist but
// are empty, while the legacy/anon and server-side names hold real values.
// The config module must treat empty strings as unset instead of letting them
// block the fallback chain.
const MANAGED_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const original = Object.fromEntries(
  MANAGED_KEYS.map((key) => [key, process.env[key]]),
);

try {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "";
  process.env.SUPABASE_URL = "https://example.supabase.co/";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "   ";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "legacy-anon-key";
  process.env.SUPABASE_SECRET_KEY = "";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, supabaseConfigured } =
    await import("../lib/supabase/config.ts");

  describe("Supabase config fallbacks", () => {
    it("ignores empty env values and uses the server-side URL", () => {
      assert.equal(SUPABASE_URL, "https://example.supabase.co");
    });

    it("falls back from the publishable key to the legacy anon key", () => {
      assert.equal(SUPABASE_PUBLISHABLE_KEY, "legacy-anon-key");
    });

    it("accepts SUPABASE_SERVICE_ROLE_KEY as an alias for the secret key", () => {
      assert.equal(SUPABASE_SECRET_KEY, "service-role-key");
    });

    it("reports the project as configured", () => {
      assert.equal(supabaseConfigured, true);
    });
  });
} finally {
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
