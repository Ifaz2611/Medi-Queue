"use client";

// Client data layer (FR-01 ... FR-05). Talks to the Supabase-backed API routes
// under /api and keeps a lightweight in-memory cache for the dashboards.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  Appointment,
  AppointmentStatus,
  AuditLog,
  AuthUser,
  Role,
} from "./types";

export interface BookingInput {
  studentName: string;
  studentId: string;
  chiefComplaint: string;
  symptoms: string[];
  severity: number;
}

export interface BookingResult {
  ok: boolean;
  reason?: string;
  appointment?: Appointment;
}

export interface RegisterInput {
  fullName: string;
  campusId: string;
  password: string;
  role: Role;
}

export interface LoginResult {
  ok: boolean;
  error?: string;
  user?: AuthUser;
}

interface StoreValue {
  appointments: Appointment[];
  auditLogs: AuditLog[];
  user: AuthUser | null;
  hydrated: boolean;
  login: (id: string, password: string) => Promise<LoginResult>;
  register: (input: RegisterInput) => Promise<LoginResult>;
  logout: () => Promise<void>;
  isSlotAvailable: (slot: string) => boolean;
  bookSlot: (
    input: BookingInput,
    slot: string,
    score: number,
    urgency: Appointment["urgency"],
  ) => Promise<BookingResult>;
  updateStatus: (id: string, status: AppointmentStatus) => Promise<void>;
  saveNotes: (id: string, plaintext: string) => Promise<void>;
  readNotes: (appointment: Appointment) => string;
  resetDemo: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

async function request<T>(
  url: string,
  init?: RequestInit,
): Promise<T & { error?: string; reason?: string }> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    return (await res.json()) as T & { error?: string; reason?: string };
  } catch {
    return { error: "Network error. Please retry." } as T & {
      error?: string;
      reason?: string;
    };
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  /** Reload role-scoped data from the backend. */
  const refresh = useCallback(async (current: AuthUser | null) => {
    if (!current) {
      setAppointments([]);
      setAuditLogs([]);
      return;
    }
    const apps = await request<{ appointments: Appointment[] }>(
      "/api/appointments",
    );
    setAppointments(apps.appointments ?? []);

    if (current.role === "admin") {
      const logs = await request<{ auditLogs: AuditLog[] }>("/api/audit");
      setAuditLogs(logs.auditLogs ?? []);
    } else {
      setAuditLogs([]);
    }
  }, []);

  // Restore the session on mount.
  useEffect(() => {
    let active = true;
    (async () => {
      const session = await request<{ user: AuthUser | null }>(
        "/api/auth/session",
      );
      if (!active) return;
      setUser(session.user ?? null);
      if (session.user) await refresh(session.user);
      if (active) setHydrated(true);
    })();
    return () => {
      active = false;
    };
  }, [refresh]);

  const login = useCallback<StoreValue["login"]>(
    async (id, password) => {
      const res = await request<LoginResult>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ id, password }),
      });
      if (!res.ok || !res.user) {
        return { ok: false, error: res.error ?? "Unable to sign in." };
      }
      setUser(res.user);
      await refresh(res.user);
      return { ok: true, user: res.user };
    },
    [refresh],
  );

  const register = useCallback<StoreValue["register"]>(
    async (input) => {
      const res = await request<LoginResult>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(input),
      });
      if (!res.ok || !res.user) {
        return { ok: false, error: res.error ?? "Unable to register." };
      }
      setUser(res.user);
      await refresh(res.user);
      return { ok: true, user: res.user };
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    await request("/api/auth/logout", { method: "POST" });
    setUser(null);
    setAppointments([]);
    setAuditLogs([]);
  }, []);

  const isSlotAvailable = useCallback(
    (slot: string) =>
      !appointments.some((a) => a.slot === slot && a.status !== "Completed"),
    [appointments],
  );

  const bookSlot = useCallback<StoreValue["bookSlot"]>(
    async (input, slot) => {
      const res = await request<BookingResult>("/api/appointments", {
        method: "POST",
        // Identity + triage score are derived server-side; only the
        // clinical intake fields are sent from the client.
        body: JSON.stringify({
          chiefComplaint: input.chiefComplaint,
          symptoms: input.symptoms,
          severity: input.severity,
          slot,
        }),
      });
      if (!res.ok || !res.appointment) {
        return { ok: false, reason: res.reason ?? res.error ?? "Unable to book this slot." };
      }
      await refresh(user);
      return { ok: true, appointment: res.appointment };
    },
    [refresh, user],
  );

  const updateStatus = useCallback<StoreValue["updateStatus"]>(
    async (id, status) => {
      await request(`/api/appointments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await refresh(user);
    },
    [refresh, user],
  );

  const saveNotes = useCallback(
    async (id: string, plaintext: string) => {
      await request(`/api/appointments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ notes: plaintext }),
      });
      await refresh(user);
    },
    [refresh, user],
  );

  const readNotes = useCallback<StoreValue["readNotes"]>(
    (appointment) => appointment.notes ?? "",
    [],
  );

  const resetDemo = useCallback(async () => {
    await request("/api/seed?reset=true", { method: "POST" });
    await refresh(user);
  }, [refresh, user]);

  const value = useMemo<StoreValue>(
    () => ({
      appointments,
      auditLogs,
      user,
      hydrated,
      login,
      register,
      logout,
      isSlotAvailable,
      bookSlot,
      updateStatus,
      saveNotes,
      readNotes,
      resetDemo,
    }),
    [
      appointments,
      auditLogs,
      user,
      hydrated,
      login,
      register,
      logout,
      isSlotAvailable,
      bookSlot,
      updateStatus,
      saveNotes,
      readNotes,
      resetDemo,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within a StoreProvider");
  return ctx;
}
