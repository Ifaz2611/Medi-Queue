// FR-01: ID + password sign-in. Maps the campus ID to a Supabase Auth email,
// establishes the cookie session and returns the role profile.

import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { clientIp, writeAudit } from "@/lib/server/audit";
import { campusIdToEmail } from "@/lib/server/email";
import type { Role } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { id?: unknown; password?: unknown }
    | null;

  const id = typeof body?.id === "string" ? body.id : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!id.trim() || !password) {
    return NextResponse.json(
      { ok: false, error: "ID and password are required." },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: campusIdToEmail(id),
    password,
  });

  if (error || !data.user) {
    return NextResponse.json(
      { ok: false, error: "Invalid ID or password. Try a demo account." },
      { status: 401 },
    );
  }

  const admin = createAdminSupabase();
  const { data: profile } = await admin
    .from("users")
    .select("full_name, campus_id, role")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { ok: false, error: "No profile is linked to this account." },
      { status: 403 },
    );
  }

  await writeAudit(admin, {
    userId: profile.campus_id,
    role: profile.role as Role,
    action: "User Signed In",
    resourceId: data.user.id,
    ipAddress: clientIp(request),
  });

  return NextResponse.json({
    ok: true,
    user: {
      id: profile.campus_id,
      name: profile.full_name,
      role: profile.role,
    },
  });
}
