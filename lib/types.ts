// Shared domain types for MediQueue (FR-01 ... FR-05).

export type Role = "student" | "doctor" | "admin";

export type Urgency = "Low" | "Medium" | "High";

export type AppointmentStatus =
  | "Initiated"
  | "Triaged"
  | "Scheduled"
  | "In-Consultation"
  | "Completed";

export interface Appointment {
  id: string;
  studentName: string;
  studentId: string;
  chiefComplaint: string;
  symptoms: string[];
  severity: number;
  triageScore: number;
  urgency: Urgency;
  slot: string;
  status: AppointmentStatus;
  /** Field-level "AES-256" encrypted clinical notes (see lib/crypto.ts). */
  notesEncrypted: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  role: Role;
  action: string;
  resourceId: string;
  ipAddress: string;
}

export interface TriageResult {
  score: number;
  urgency: Urgency;
  keywordWeight: number;
  severity: number;
}

export interface Actor {
  id: string;
  role: Role;
  name: string;
}

/** Authenticated session user (see lib/auth.ts). */
export interface AuthUser {
  id: string;
  name: string;
  role: Role;
}
