// Maps Supabase rows (snake_case) to the app's domain types (camelCase).
// Server-only.

import { decryptNotes } from "./crypto";
import type {
  Appointment,
  AppointmentStatus,
  AuditLog,
  Role,
  Urgency,
} from "../types";

export interface AppointmentRow {
  id: string;
  student_name: string;
  student_code: string;
  chief_complaint: string | null;
  symptoms: string[] | null;
  severity: number;
  triage_score: number | string;
  urgency: Urgency;
  slot_time: string;
  status: AppointmentStatus;
  notes_encrypted: string | null;
  created_at: string;
}

export interface AuditRow {
  id: string;
  timestamp: string;
  user_id: string;
  role: Role;
  action: string;
  resource_id: string;
  ip_address: string | null;
}

/** Convert a row to an Appointment. `withNotes` decrypts clinical notes. */
export function toAppointment(
  row: AppointmentRow,
  withNotes = false,
): Appointment {
  return {
    id: row.id,
    studentName: row.student_name,
    studentId: row.student_code,
    chiefComplaint: row.chief_complaint ?? "",
    symptoms: row.symptoms ?? [],
    severity: row.severity,
    triageScore: Number(row.triage_score),
    urgency: row.urgency,
    slot: row.slot_time,
    status: row.status,
    notesEncrypted: row.notes_encrypted ?? "",
    notes: withNotes ? decryptNotes(row.notes_encrypted ?? "") : undefined,
    createdAt: row.created_at,
  };
}

export function toAuditLog(row: AuditRow): AuditLog {
  return {
    id: row.id,
    timestamp: row.timestamp,
    userId: row.user_id,
    role: row.role,
    action: row.action,
    resourceId: row.resource_id,
    ipAddress: row.ip_address ?? "",
  };
}
