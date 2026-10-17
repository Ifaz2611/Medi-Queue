// FR-01: User registration for Campus Clinic.
// Registers a new user with Supabase Auth, links their profile in the users
// table, establishes the session cookie, and writes an audit event.

import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { clientIp, writeAudit } from "@/lib/server/audit";
import { campusIdToEmail } from "@/lib/server/email";
import type { Role } from "@/lib/types";

const ALLOWED_ROLES: Role[] = ["student", "doctor", "admin"];

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    fullName?: unknown;
    campusId?: unknown;
    password?: unknown;
    role?: unknown;
  } | null;

  const fullName =
    typeof body?.fullName === "string" ? body.fullName.trim() : "";
  const campusId =
    typeof body?.campusId === "string" ? body.campusId.trim().toUpperCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const roleRaw =
    typeof body?.role === "string"
      ? (body.role.trim().toLowerCase() as Role)
      : "student";
  const role: Role = ALLOWED_ROLES.includes(roleRaw) ? roleRaw : "student";

  if (!fullName || fullName.length < 2) {
    return NextResponse.json(
      { ok: false, error: "Please enter your full name (at least 2 characters)." },
      { status: 400 },
    );
  }

  if (!campusId || campusId.length < 3) {
    return NextResponse.json(
      { ok: false, error: "Please enter a valid Campus / User ID (e.g. STU-2024-001)." },
      { status: 400 },
    );
  }

  if (!password || password.length < 6) {
    return NextResponse.json(
      { ok: false, error: "Password must be at least 6 characters long." },
      { status: 400 },
    );
  }

  const admin = createAdminSupabase();

  // 1. Verify campus ID is not already registered in users table
  const { data: existingProfile } = await admin
    .from("users")
    .select("id, campus_id")
    .ilike("campus_id", campusId)
    .maybeSingle();

  if (existingProfile) {
    return NextResponse.json(
      {
        ok: false,
        error: `Campus ID "${campusId}" is already registered. Please sign in instead.`,
      },
      { status: 409 },
    );
  }

  const email = campusIdToEmail(campusId);

  // 2. Create the user in Supabase Auth
  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        campus_id: campusId,
        full_name: fullName,
        role,
      },
    });

  if (authError || !authData?.user) {
    const msg = authError?.message?.toLowerCase() ?? "";
    if (
      msg.includes("already registered") ||
      msg.includes("already exists") ||
      msg.includes("unique")
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: `An account for Campus ID "${campusId}" already exists. Please sign in.`,
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      {
        ok: false,
        error: authError?.message ?? "Registration failed. Please try again.",
      },
      { status: 400 },
    );
  }

  const authUserId = authData.user.id;

  // 3. Upsert user record into users table
  const { error: profileError } = await admin.from("users").upsert(
    {
      auth_user_id: authUserId,
      full_name: fullName,
      email,
      campus_id: campusId,
      role,
    },
    { onConflict: "auth_user_id" },
  );

  if (profileError) {
    console.error("Profile creation error:", profileError);
    return NextResponse.json(
      { ok: false, error: "Failed to create user profile. Please try again." },
      { status: 500 },
    );
  }

  // 4. Automatically sign in the user to establish cookie session
  const serverSupabase = await createServerSupabase();
  const { error: signInError } = await serverSupabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    console.warn("Auto sign-in notice:", signInError.message);
  }

  // 5. Append-only audit record
  await writeAudit(admin, {
    userId: campusId,
    role,
    action: "User Registered",
    resourceId: authUserId,
    ipAddress: clientIp(request),
  });

  return NextResponse.json({
    ok: true,
    user: {
      id: campusId,
      name: fullName,
      role,
    },
  });
}
