// Self-contained demo / seed data so the dashboards look alive on `npm run dev`.

import { encryptField } from "./crypto";
import { triage } from "./triage";
import type { Appointment, AppointmentStatus, AuditLog, Role } from "./types";

/** Today's consultation slots. The first two are reserved for High urgency. */
export const SLOTS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
];

export const PRIORITY_SLOTS = SLOTS.slice(0, 2); // 09:00, 09:30

export const MOCK_IP = "192.168.10.24";

function minutesAgo(min: number): string {
  return new Date(Date.now() - min * 60_000).toISOString();
}

interface SeedRow {
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

export function createSeedAppointments(): Appointment[] {
  return SEED_ROWS.map((row) => {
    const result = triage(row.symptoms, row.severity, row.chiefComplaint);
    return {
      id: row.id,
      studentName: row.studentName,
      studentId: row.studentId,
      chiefComplaint: row.chiefComplaint,
      symptoms: row.symptoms,
      severity: row.severity,
      triageScore: result.score,
      urgency: result.urgency,
      slot: row.slot,
      status: row.status,
      notesEncrypted: row.note ? encryptField(row.note) : "",
      createdAt: minutesAgo(row.minutesAgo),
    };
  });
}

function log(
  id: string,
  minutesAgoValue: number,
  userId: string,
  role: Role,
  action: string,
  resourceId: string,
): AuditLog {
  return {
    id,
    timestamp: minutesAgo(minutesAgoValue),
    userId,
    role,
    action,
    resourceId,
    ipAddress: MOCK_IP,
  };
}

export function createSeedAuditLogs(): AuditLog[] {
  return [
    log("LOG-7005", 12, "DR-1001", "doctor", "Status Changed -> In-Consultation", "APT-1001"),
    log("LOG-7004", 18, "STU-2021-210", "student", "Appointment Triaged", "APT-1004"),
    log("LOG-7003", 30, "STU-2023-007", "student", "Slot Booked", "APT-1003"),
    log("LOG-7002", 42, "STU-2022-118", "student", "Slot Booked", "APT-1002"),
    log("LOG-7001", 55, "STU-2021-045", "student", "Slot Booked", "APT-1001"),
  ];
}
