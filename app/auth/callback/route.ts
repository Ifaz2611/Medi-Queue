// FR-01: OAuth (Google) callback.
// Supabase redirects here after the provider consent screen with a `code`.
// We exchange it for a cookie session, make sure a MediQueue profile exists,
// record an audit event and bounce the user to their role home page.

import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { clientIp, writeAudit } from "@/lib/server/audit";
import { ROLE_HOME } from "@/lib/auth";
import type { Role } from "@/lib/types";

const ALLOWED_ROLES: Role[] = ["student", "doctor", "admin"];

/** Only allow same-site relative redirects (prevents open redirects). */
function safeNext(next: string | null): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

function metadataName(metadata: Record<string, unknown>): string {
  const candidate =
    (typeof metadata.full_name === "string" && metadata.full_name) ||
    (typeof metadata.name === "string" && metadata.name) ||
    "";
  return candidate.trim();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  const denied =
    url.searchParams.get("error_description") ??
    url.searchParams.get("error");

  if (denied) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(denied)}`, url.origin),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/login?error=Missing%20OAuth%20code.%20Please%20try%20again.",
        url.origin,
      ),
    );
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    const message = error?.message ?? "Google sign-in failed.";
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(message)}`, url.origin),
    );
  }

  const authUser = data.user;
  const admin = createAdminSupabase();

  const { data: existing } = await admin
    .from("users")
    .select("campus_id, role")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();

  let campusId = existing?.campus_id ?? null;
  let role: Role = ALLOWED_ROLES.includes(existing?.role as Role)
    ? (existing?.role as Role)
    : "student";

  // OAuth users have no campus ID; use their email as the unique handle and
  // default them to the student role.
  if (!campusId) {
    const fullName =
      metadataName(authUser.user_metadata ?? {}) ||
      authUser.email?.split("@")[0] ||
      "Google User";

    campusId = authUser.email ?? authUser.id;
    role = "student";

    const { error: profileError } = await admin.from("users").upsert(
      {
        auth_user_id: authUser.id,
        full_name: fullName,
        email: authUser.email,
        campus_id: campusId,
        role,
      },
      { onConflict: "auth_user_id" },
    );

    if (profileError) {
      console.error("OAuth profile upsert failed:", profileError);
      await supabase.auth.signOut();
      return NextResponse.redirect(
        new URL(
          "/login?error=Could%20not%20create%20your%20profile.%20Please%20try%20again.",
          url.origin,
        ),
      );
    }
  }

  await writeAudit(admin, {
    userId: campusId,
    role,
    action: "User Signed In (Google)",
    resourceId: authUser.id,
    ipAddress: clientIp(request),
  });

  const destination = next ?? ROLE_HOME[role];
  return NextResponse.redirect(new URL(destination, url.origin));
}
