import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { describe, it } from "node:test";
import { context, resetContext } from "./helpers/rbac-context.mjs";

const rootUrl = new URL("../", import.meta.url);
const appUrl = new URL("app/", rootUrl).href;
const replacements = new Set([
  "@/lib/server/session",
  "@/lib/supabase/admin",
]);

// Intercept only the route handlers' external boundaries. Import real Next.js
// responses and real domain helpers so assertions cover serialized API payloads.
registerHooks({
  resolve(specifier, resolutionContext, nextResolve) {
    if (resolutionContext.parentURL?.startsWith(appUrl)) {
      if (replacements.has(specifier)) {
        return nextResolve(new URL("helpers/rbac-context.mjs", import.meta.url).href, resolutionContext);
      }
      if (specifier.startsWith("@/")) {
        return nextResolve(new URL(`${specifier.slice(2)}.ts`, rootUrl).href, resolutionContext);
      }
      if (specifier === "next/server") {
        return nextResolve("next/server.js", resolutionContext);
      }
    }
    return nextResolve(specifier, resolutionContext);
  },
});

const { appointmentsRoute, consultationRoute, auditRoute, encryptNotes, decryptNotes } =
  await (async () => {
    const original = process.env.FIELD_ENCRYPTION_KEY;
    try {
      process.env.FIELD_ENCRYPTION_KEY = "mediqueue-rbac-qa-only-key";
      const appointmentsRoute = await import("../app/api/appointments/route.ts");
      const consultationRoute = await import("../app/api/appointments/[id]/route.ts");
      const auditRoute = await import("../app/api/audit/route.ts");
      const crypto = await import("../lib/server/crypto.ts");
      return { appointmentsRoute, consultationRoute, auditRoute, ...crypto };
    } finally {
      if (original === undefined) delete process.env.FIELD_ENCRYPTION_KEY;
      else process.env.FIELD_ENCRYPTION_KEY = original;
    }
  })();

const users = {
  student: { id: "STU-QA-A", name: "QA Student A", role: "student" },
  otherStudent: { id: "STU-QA-B", name: "QA Student B", role: "student" },
  doctor: { id: "DR-QA", name: "QA Doctor", role: "doctor" },
  admin: { id: "ADM-QA", name: "QA Admin", role: "admin" },
};
const clinicalNote = "Private QA consultation plan";
const rows = [users.student, users.otherStudent].map((student, index) => ({
  id: `qa-appointment-${index}`,
  student_name: student.name,
  student_code: student.id,
  chief_complaint: `Confidential complaint for ${student.id}`,
  symptoms: [`private_qa_symptom_${index}`],
  severity: 5,
  triage_score: "17.5",
  urgency: "Medium",
  slot_time: index === 0 ? "09:00" : "09:30",
  status: "Scheduled",
  notes_encrypted: encryptNotes(clinicalNote),
  created_at: "2026-01-01T00:00:00.000Z",
}));

function patchRequest(id, body) {
  return new Request(`http://localhost/api/appointments/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function patch(id, body) {
  return consultationRoute.PATCH(patchRequest(id, body), {
    params: Promise.resolve({ id }),
  });
}

function assertNoDatabaseAccess() {
  assert.equal(context.clientCalls, 0, "Reject requests before creating a service-role client");
  assert.deepEqual(context.queries, []);
  assert.deepEqual(context.audits, []);
}

describe("appointment visibility (FR-01, FR-04)", () => {
  for (const student of [users.student, users.otherStudent]) {
    it(`returns only ${student.id}'s appointments from a mixed-student dataset`, async () => {
      resetContext(student, rows);
      const response = await appointmentsRoute.GET();
      assert.equal(response.status, 200);
      const payload = await response.json();
      assert.equal(payload.ok, true);
      const own = rows.find((row) => row.student_code === student.id);
      assert.deepEqual(payload.appointments.map((appointment) => appointment.id), [own.id]);
      assert.equal(payload.appointments[0].chiefComplaint, own.chief_complaint);
      assert.ok(!Object.hasOwn(payload.appointments[0], "notes"));
      assert.ok(!JSON.stringify(payload).includes(clinicalNote));
      for (const other of rows.filter((row) => row.student_code !== student.id)) {
        assert.ok(!JSON.stringify(payload).includes(other.student_code));
        assert.ok(!JSON.stringify(payload).includes(other.chief_complaint));
      }
    });
  }

  it("returns an empty list to a student with no appointments", async () => {
    resetContext({ ...users.student, id: "STU-QA-NONE" }, rows);
    const response = await appointmentsRoute.GET();
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, appointments: [] });
  });

  it("returns admin scheduling metadata without complaints, symptoms, or notes", async () => {
    resetContext(users.admin, rows);
    const response = await appointmentsRoute.GET();
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.appointments.length, rows.length);
    for (const [index, appointment] of payload.appointments.entries()) {
      const row = rows[index];
      assert.equal(appointment.id, row.id);
      assert.equal(appointment.studentId, row.student_code);
      assert.equal(appointment.slot, row.slot_time);
      assert.equal(appointment.status, row.status);
      assert.equal(appointment.urgency, row.urgency);
      // The API retains empty fields for compatibility with the shared UI type.
      assert.equal(appointment.chiefComplaint, "");
      assert.deepEqual(appointment.symptoms, []);
      assert.equal(appointment.notesEncrypted, "");
      assert.ok(!Object.hasOwn(appointment, "notes"));
      for (const secret of [row.chief_complaint, ...row.symptoms, row.notes_encrypted, clinicalNote]) {
        assert.ok(!JSON.stringify(payload).includes(secret));
      }
    }
  });

  it("allows doctors to read both students' clinical data and decrypted notes", async () => {
    resetContext(users.doctor, rows);
    const response = await appointmentsRoute.GET();
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.appointments.length, rows.length);
    for (const [index, appointment] of payload.appointments.entries()) {
      assert.equal(appointment.chiefComplaint, rows[index].chief_complaint);
      assert.deepEqual(appointment.symptoms, rows[index].symptoms);
      assert.equal(appointment.notes, clinicalNote);
    }
  });
});

describe("doctor-only consultation updates (FR-01, FR-04)", () => {
  for (const user of [users.student, users.admin]) {
    for (const [label, body] of [
      ["status change", { status: "Completed" }],
      ["clinical note write", { notes: "Unauthorized QA note" }],
      ["combined change", { status: "In-Consultation", notes: "Unauthorized QA note" }],
    ]) {
      it(`rejects a ${user.role}'s ${label} with 403, even for a known appointment ID`, async () => {
        resetContext(user, rows);
        const response = await patch(rows[0].id, body);
        assert.equal(response.status, 403);
        assert.deepEqual(await response.json(), {
          ok: false,
          error: "Only doctors can update consultations.",
        });
        assertNoDatabaseAccess();
        assert.deepEqual(context.rows, rows);
      });
    }
  }

  it("rejects a student attempting to update another student's appointment", async () => {
    resetContext(users.student, rows);
    const response = await patch(rows[1].id, { status: "Completed" });
    assert.equal(response.status, 403);
    assertNoDatabaseAccess();
    assert.deepEqual(context.rows, rows);
  });

  it("allows a doctor to change status and store encrypted notes for the selected appointment", async () => {
    resetContext(users.doctor, rows);
    const note = "Authorized QA follow-up plan";
    const response = await patch(rows[1].id, { status: "Completed", notes: note });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.appointment.id, rows[1].id);
    assert.equal(payload.appointment.status, "Completed");
    assert.equal(payload.appointment.notes, note);
    assert.deepEqual(context.rows[0], rows[0]);
    assert.equal(context.rows[1].status, "Completed");
    assert.match(context.rows[1].notes_encrypted, /^enc:v2:/);
    assert.notEqual(context.rows[1].notes_encrypted, note);
    assert.equal(decryptNotes(context.rows[1].notes_encrypted), note);
    assert.equal(context.audits.length, 2);
    for (const event of context.audits) {
      assert.equal(event.user_id, users.doctor.id);
      assert.equal(event.role, "doctor");
      assert.equal(event.resource_id, rows[1].id);
    }
  });
});

describe("adjacent role and authentication boundaries (FR-01)", () => {
  for (const [name, invoke] of [
    ["appointment list", () => appointmentsRoute.GET()],
    ["booking", () => appointmentsRoute.POST(new Request("http://localhost/api/appointments", { method: "POST" }))],
    ["consultation update", () => patch(rows[0].id, { status: "Completed" })],
    ["audit list", () => auditRoute.GET()],
  ]) {
    it(`returns 401 for an unauthenticated ${name} request`, async () => {
      resetContext(null, rows);
      const response = await invoke();
      assert.equal(response.status, 401);
      assert.equal((await response.json()).ok, false);
      assertNoDatabaseAccess();
    });
  }

  for (const user of [users.doctor, users.admin]) {
    it(`rejects a ${user.role} attempting student-only booking`, async () => {
      resetContext(user, rows);
      const response = await appointmentsRoute.POST(new Request("http://localhost/api/appointments", { method: "POST" }));
      assert.equal(response.status, 403);
      assert.equal((await response.json()).ok, false);
      assertNoDatabaseAccess();
    });
  }

  for (const user of [users.student, users.doctor]) {
    it(`rejects a ${user.role} attempting to read the admin audit endpoint`, async () => {
      resetContext(user, rows);
      const response = await auditRoute.GET();
      assert.equal(response.status, 403);
      assert.equal((await response.json()).ok, false);
      assertNoDatabaseAccess();
    });
  }

  it("allows an administrator to read audit metadata", async () => {
    const event = {
      id: "qa-audit", timestamp: "2026-01-01T00:00:00.000Z",
      user_id: users.doctor.id, role: "doctor", action: "Status Changed -> Completed",
      resource_id: rows[0].id, ip_address: null,
    };
    resetContext(users.admin, [event]);
    const response = await auditRoute.GET();
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.auditLogs[0].resourceId, rows[0].id);
    assert.equal(payload.auditLogs[0].userId, users.doctor.id);
  });
});
