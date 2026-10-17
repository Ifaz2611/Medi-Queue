// FR-05: admin-only read of the immutable audit trail.

import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { toAuditLog, type AuditRow } from "@/lib/server/mappers";
import { getSessionUser } from "@/lib/server/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: "Audit log is restricted to administrators." },
      { status: 403 },
    );
  }

  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from("audit_logs")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    auditLogs: ((data ?? []) as AuditRow[]).map(toAuditLog),
  });
}
