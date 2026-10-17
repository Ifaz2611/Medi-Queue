// FR-04: doctor updates — appointment status transitions and encrypted notes.
//
//   PATCH /api/appointments/:id   { status?, notes? }

import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { clientIp, writeAudit } from "@/lib/server/audit";
import { encryptNotes } from "@/lib/server/crypto";
import { toAppointment, type AppointmentRow } from "@/lib/server/mappers";
import { getSessionUser } from "@/lib/server/session";
import type { AppointmentStatus } from "@/lib/types";

const STATUSES: AppointmentStatus[] = [
  "Initiated",
  "Triaged",
  "Scheduled",
  "In-Consultation",
  "Completed",
];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }
  if (user.role !== "doctor") {
    return NextResponse.json(
      { ok: false, error: "Only doctors can update consultations." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as
    | { status?: unknown; notes?: unknown }
    | null;

  const update: Record<string, unknown> = {};

  if (typeof body?.status === "string") {
    if (!STATUSES.includes(body.status as AppointmentStatus)) {
      return NextResponse.json(
        { ok: false, error: `Invalid status: ${body.status}` },
        { status: 400 },
      );
    }
    update.status = body.status as AppointmentStatus;
  }

  if (typeof body?.notes === "string") {
    update.notes_encrypted = body.notes ? encryptNotes(body.notes) : null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { ok: false, error: "Nothing to update." },
      { status: 400 },
    );
  }

  const admin = createAdminSupabase();
  const { data: updated, error } = await admin
    .from("appointments")
    .update(update)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json(
      { ok: false, error: "Appointment not found." },
      { status: 404 },
    );
  }

  const ip = clientIp(request);
  if (update.status) {
    await writeAudit(admin, {
      userId: user.id,
      role: "doctor",
      action: `Status Changed -> ${update.status}`,
      resourceId: id,
      ipAddress: ip,
    });
  }
  if (update.notes_encrypted !== undefined) {
    await writeAudit(admin, {
      userId: user.id,
      role: "doctor",
      action: "Clinical Note Added",
      resourceId: id,
      ipAddress: ip,
    });
  }

  return NextResponse.json({
    ok: true,
    appointment: toAppointment(updated as AppointmentRow, true),
  });
}
