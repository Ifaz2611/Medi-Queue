// Server session + RBAC helpers (FR-01). Server-only.

import { NextResponse } from "next/server";
import { createAdminSupabase } from "../supabase/admin";
import { createServerSupabase } from "../supabase/server";
import type { AuthUser, Role } from "../types";

/** Resolve the signed-in user (Supabase Auth) plus their MediQueue profile. */
export async function getSessionUser(): Promise<AuthUser | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminSupabase();
  const { data: profile } = await admin
    .from("users")
    .select("full_name, campus_id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile) return null;
  return {
    id: profile.campus_id,
    name: profile.full_name,
    role: profile.role as Role,
  };
}

export function unauthorized() {
  return NextResponse.json(
    { ok: false, error: "Not authenticated." },
    { status: 401 },
  );
}

export function forbidden() {
  return NextResponse.json(
    { ok: false, error: "Not authorized for this action." },
    { status: 403 },
  );
}

/** Guard a route handler by required roles. */
export function requireRole(
  user: AuthUser | null,
  roles: Role[],
): NextResponse | null {
  if (!user) return unauthorized();
  if (!roles.includes(user.role)) return forbidden();
  return null;
}
