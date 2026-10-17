// FR-02/FR-03: list and create appointments.
//
//   GET  /api/appointments  — role-scoped list
//   POST /api/appointments  — student symptom intake + deterministic triage + booking

import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { clientIp, writeAudit } from "@/lib/server/audit";
import { toAppointment, type AppointmentRow } from "@/lib/server/mappers";
import { getSessionUser } from "@/lib/server/session";
import { triage } from "@/lib/triage";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated." },
      { status: 401 },
    );
  }

  const admin = createAdminSupabase();
  let query = admin
    .from("appointments")
    .select("*")
    .order("slot_date", { ascending: true })
    .order("slot_time", { ascending: true });

  // Students may only ever see their own record.
  if (user.role === "student") {
    query = query.eq("student_code", user.id);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as AppointmentRow[];
  const withNotes = user.role === "doctor";
  const appointments = rows.map((row) => {
    const appt = toAppointment(row, withNotes);
    // Admins receive metadata only (no clinical fields) — RBAC privacy.
    if (user.role === "admin") {
      return {
        ...appt,
        chiefComplaint: "",
        symptoms: [],
        notesEncrypted: "",
        notes: undefined,
      };
    }
    return appt;
  });

  return NextResponse.json({ ok: true, appointments });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }
  if (user.role !== "student") {
    return NextResponse.json(
      { ok: false, error: "Only students can book appointments." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        chiefComplaint?: unknown;
        symptoms?: unknown;
        severity?: unknown;
        slot?: unknown;
      }
    | null;

  const chiefComplaint =
    typeof body?.chiefComplaint === "string" ? body.chiefComplaint : "";
  const symptoms = Array.isArray(body?.symptoms)
    ? body!.symptoms.filter((s): s is string => typeof s === "string")
    : [];
  const severity = Number(body?.severity);
  const slot = typeof body?.slot === "string" ? body.slot : "";

  if (!slot) {
    return NextResponse.json(
      { ok: false, reason: "Please select a time slot." },
      { status: 400 },
    );
  }
  if (!Number.isFinite(severity) || severity < 1 || severity > 10) {
    return NextResponse.json(
      { ok: false, reason: "Severity must be between 1 and 10." },
      { status: 400 },
    );
  }

  const admin = createAdminSupabase();

  // Prevent double-booking (completed appointments free the slot).
  const { data: clash } = await admin
    .from("appointments")
    .select("id")
    .eq("slot_date", today())
    .eq("slot_time", slot)
    .neq("status", "Completed")
    .maybeSingle();

  if (clash) {
    return NextResponse.json(
      { ok: false, reason: `${slot} is already booked. Choose another slot.` },
      { status: 409 },
    );
  }

  // Resolve the students.id foreign key (optional, for referential integrity).
  const { data: profile } = await admin
    .from("users")
    .select("id")
    .eq("campus_id", user.id)
    .maybeSingle();

  // Triage is computed server-side — never trust a client-supplied score.
  const result = triage(symptoms, severity, chiefComplaint);

  const { data: inserted, error } = await admin
    .from("appointments")
    .insert({
      student_id: profile?.id ?? null,
      student_name: user.name,
      student_code: user.id,
      chief_complaint: chiefComplaint.trim(),
      symptoms,
      severity,
      triage_score: result.score,
      urgency: result.urgency,
      slot_time: slot,
      slot_date: today(),
      status: "Scheduled",
      notes_encrypted: null,
    })
    .select("*")
    .single();

  if (error || !inserted) {
    return NextResponse.json(
      { ok: false, reason: error?.message ?? "Unable to book this slot." },
      { status: 500 },
    );
  }

  const ip = clientIp(request);
  await writeAudit(admin, { userId: user.id, role: "student", action: "Slot Booked", resourceId: inserted.id, ipAddress: ip });
  await writeAudit(admin, {
    userId: user.id,
    role: "student",
    action: `Appointment Triaged (${result.urgency}, score ${result.score})`,
    resourceId: inserted.id,
    ipAddress: ip,
  });

  return NextResponse.json({
    ok: true,
    appointment: toAppointment(inserted as AppointmentRow),
  });
}
