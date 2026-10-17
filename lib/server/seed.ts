// Idempotent demo bootstrap (FR-01/FR-05).
// Creates the demo auth users + profiles and (if empty) seeds appointments
// and audit events. Called by POST /api/seed. Server-only.

import { CREDENTIALS } from "../auth";
import { createAdminSupabase } from "../supabase/admin";
import { triage } from "../triage";
import type { AppointmentStatus, Role } from "../types";
import { writeAudit } from "./audit";
import { encryptNotes } from "./crypto";
import { campusIdToEmail } from "./email";

interface SeedRow {
  uuid: string;
  id: string;
  studentName: string;
  studentId: string;
  chiefComplaint: string;
  symptoms: string[];
  severity: number;
  slot: string;
  status: AppointmentStatus;
  minutesAgo: number;
  note: string;
}

const SEED_ROWS: SeedRow[] = [
  {
    uuid: "00000000-0000-4000-8000-000000001001",
    id: "APT-1001",
    studentName: "Ayesha Rahman",
    studentId: "STU-2021-045",
    chiefComplaint: "Sudden chest pain and shortness of breath after PE class",
    symptoms: ["chest_pain", "shortness_of_breath"],
    severity: 8,
    slot: "09:00",
    status: "In-Consultation",
    minutesAgo: 55,
    note: "ECG ordered. Patient monitored; vitals stable. Stay for observation.",
  },
  {
    uuid: "00000000-0000-4000-8000-000000001002",
    id: "APT-1002",
    studentName: "Daniel Okoye",
    studentId: "STU-2022-118",
    chiefComplaint: "Chills and body ache since last night",
    symptoms: ["high_fever"],
    severity: 5,
    slot: "09:30",
    status: "Scheduled",
    minutesAgo: 42,
    note: "Advise fluids and paracetamol. Re-check temperature in 2 hours.",
  },
  {
    uuid: "00000000-0000-4000-8000-000000001003",
    id: "APT-1003",
    studentName: "Mei Lin",
    studentId: "STU-2023-007",
    chiefComplaint: "Headache and mild cold, difficulty focusing in class",
    symptoms: ["headache", "mild_cold"],
    severity: 4,
    slot: "10:00",
    status: "Scheduled",
    minutesAgo: 30,
    note: "",
  },
  {
    uuid: "00000000-0000-4000-8000-000000001004",
    id: "APT-1004",
    studentName: "Tom Becker",
    studentId: "STU-2021-210",
    chiefComplaint: "Twisted ankle during football practice",
    symptoms: ["sprain"],
    severity: 3,
    slot: "10:30",
    status: "Triaged",
    minutesAgo: 18,
    note: "",
  },
  {
    uuid: "00000000-0000-4000-8000-000000001005",
    id: "APT-1005",
    studentName: "Priya Nair",
    studentId: "STU-2020-091",
    chiefComplaint: "Routine cold and sore throat check",
    symptoms: ["mild_cold"],
    severity: 2,
    slot: "11:00",
    status: "Completed",
    minutesAgo: 90,
    note: "Advised rest and warm fluids. Discharged with throat lozenges.",
  },
];

function minutesAgo(min: number): string {
  return new Date(Date.now() - min * 60_000).toISOString();
}

async function ensureAuthUser(
  admin: ReturnType<typeof createAdminSupabase>,
  email: string,
  password: string,
  metadata: { campus_id: string; full_name: string; role: Role },
): Promise<string> {
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (created.data.user) return created.data.user.id;

  // Already exists — look it up.
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = listed.data.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (!existing) {
    throw new Error(`Unable to create or find auth user for ${email}`);
  }
  return existing.id;
}

export interface SeedSummary {
  users: number;
  appointments: number;
  auditLogs: number;
}

export async function runSeed(reset = false): Promise<SeedSummary> {
  const admin = createAdminSupabase();

  // 1. Demo auth users + profiles.
  for (const cred of CREDENTIALS) {
    const email = campusIdToEmail(cred.id);
    const authUserId = await ensureAuthUser(admin, email, cred.password, {
      campus_id: cred.id,
      full_name: cred.name,
      role: cred.role,
    });

    await admin.from("users").upsert(
      {
        auth_user_id: authUserId,
        full_name: cred.name,
        email,
        campus_id: cred.id,
        role: cred.role,
      },
      { onConflict: "auth_user_id" },
    );
  }

  // 2. Optionally wipe appointments so a fresh demo can be re-seeded.
  //    (audit_logs stay intact — they are append-only by design, FR-05.)
  if (reset) {
    await admin.from("appointments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  }

  // 3. Seed appointments + audit logs only when the tables are empty.
  const { count } = await admin
    .from("appointments")
    .select("id", { count: "exact", head: true });

  let appointments = 0;
  let auditLogs = 0;

  if (!count) {
    const rows = SEED_ROWS.map((row) => {
      const result = triage(row.symptoms, row.severity, row.chiefComplaint);
      return {
        id: row.uuid,
        student_name: row.studentName,
        student_code: row.studentId,
        chief_complaint: row.chiefComplaint,
        symptoms: row.symptoms,
        severity: row.severity,
        triage_score: result.score,
        urgency: result.urgency,
        slot_time: row.slot,
        slot_date: new Date().toISOString().slice(0, 10),
        status: row.status,
        notes_encrypted: row.note ? encryptNotes(row.note) : null,
        created_at: minutesAgo(row.minutesAgo),
      };
    });

    const inserted = await admin.from("appointments").insert(rows);
    if (inserted.error) throw new Error(inserted.error.message);
    appointments = rows.length;

    const auditSeed: {
      minutesAgo: number;
      userId: string;
      role: Role;
      action: string;
      resourceId: string;
    }[] = [
      { minutesAgo: 12, userId: "DR-1001", role: "doctor", action: "Status Changed -> In-Consultation", resourceId: "00000000-0000-4000-8000-000000001001" },
      { minutesAgo: 18, userId: "STU-2021-210", role: "student", action: "Appointment Triaged", resourceId: "00000000-0000-4000-8000-000000001004" },
      { minutesAgo: 30, userId: "STU-2023-007", role: "student", action: "Slot Booked", resourceId: "00000000-0000-4000-8000-000000001003" },
      { minutesAgo: 42, userId: "STU-2022-118", role: "student", action: "Slot Booked", resourceId: "00000000-0000-4000-8000-000000001002" },
      { minutesAgo: 55, userId: "STU-2021-045", role: "student", action: "Slot Booked", resourceId: "00000000-0000-4000-8000-000000001001" },
    ];

    await admin.from("audit_logs").insert(
      auditSeed.map((a) => ({
        timestamp: minutesAgo(a.minutesAgo),
        user_id: a.userId,
        role: a.role,
        action: a.action,
        resource_id: a.resourceId,
        ip_address: "192.168.10.24",
      })),
    );
    auditLogs = auditSeed.length;
  }

  await writeAudit(admin, {
    userId: "SYSTEM",
    role: "admin",
    action: "Demo Data Seeded",
    resourceId: "seed",
  });

  return { users: CREDENTIALS.length, appointments, auditLogs };
}
