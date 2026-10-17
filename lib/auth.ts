// Mock authentication (FR-01).
//
// Users log in with an ID + password and are locked to their own role area.
// Replace `authenticate()` with Supabase Auth (signInWithPassword) later; the
// rest of the app only depends on the returned AuthUser.

import type { AuthUser, Role } from "./types";

export interface Credential extends AuthUser {
  password: string;
}

/** Demo accounts — shown on the login page for convenience. */
export const CREDENTIALS: Credential[] = [
  {
    id: "STU-2021-045",
    name: "Ayesha Rahman",
    role: "student",
    password: "student123",
  },
  {
    id: "DR-1001",
    name: "Dr. Sarah Malik",
    role: "doctor",
    password: "doctor123",
  },
  {
    id: "ADM-001",
    name: "Admin Ops",
    role: "admin",
    password: "admin123",
  },
];

export const ROLE_HOME: Record<Role, string> = {
  student: "/student",
  doctor: "/doctor",
  admin: "/admin",
};

export const ROLE_LABEL: Record<Role, string> = {
  student: "Student",
  doctor: "Doctor",
  admin: "Administrator",
};

/** Returns the authenticated user, or null on bad credentials. */
export function authenticate(id: string, password: string): AuthUser | null {
  const match = CREDENTIALS.find(
    (c) =>
      c.id.toLowerCase() === id.trim().toLowerCase() &&
      c.password === password,
  );
  if (!match) return null;
  return { id: match.id, name: match.name, role: match.role };
}
