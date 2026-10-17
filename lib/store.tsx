"use client";

// Self-contained local store (mock database + session) for the MVP.
// Persists to localStorage so data and the login session survive a refresh,
// and seeds realistic demo data on first run. Swap these actions for Supabase
// queries later.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authenticate } from "./auth";
import { decryptField, encryptField } from "./crypto";
import { createSeedAppointments, createSeedAuditLogs, MOCK_IP } from "./mockData";
import type {
  Actor,
  Appointment,
  AppointmentStatus,
  AuditLog,
  AuthUser,
} from "./types";

const STORAGE_KEY = "mediqueue.store.v1";
const SESSION_KEY = "mediqueue.session.v1";

interface PersistedState {
  appointments: Appointment[];
  auditLogs: AuditLog[];
}

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
  login: (id: string, password: string) => LoginResult;
  logout: () => void;
  isSlotAvailable: (slot: string) => boolean;
  bookSlot: (
    input: BookingInput,
    slot: string,
    score: number,
    urgency: Appointment["urgency"],
  ) => BookingResult;
  updateStatus: (id: string, status: AppointmentStatus) => void;
  saveNotes: (id: string, plaintext: string) => void;
  readNotes: (appointment: Appointment) => string;
  resetDemo: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function freshState(): PersistedState {
  return {
    appointments: createSeedAppointments(),
    auditLogs: createSeedAuditLogs(),
  };
}

function makeAudit(
  actor: Pick<Actor, "id" | "role">,
  action: string,
  resourceId: string,
): AuditLog {
  return {
    id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    userId: actor.id,
    role: actor.role,
    action,
    resourceId,
    ipAddress: MOCK_IP,
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  // Start empty so server and client render identically; hydrate on mount.
  const [state, setState] = useState<PersistedState>(() => ({
    appointments: [],
    auditLogs: [],
  }));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let nextData = freshState();
    let nextUser: AuthUser | null = null;
    try {
      const rawData = window.localStorage.getItem(STORAGE_KEY);
      if (rawData) nextData = JSON.parse(rawData) as PersistedState;
      const rawSession = window.localStorage.getItem(SESSION_KEY);
      if (rawSession) nextUser = JSON.parse(rawSession) as AuthUser;
    } catch {
      // ignore malformed storage, fall back to seeds / logged-out
    }
    // Hydrating from an external system (localStorage) on mount.
    /* eslint-disable react-hooks/set-state-in-effect */
    setState(nextData);
    setUser(nextUser);
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage unavailable (private mode) — keep in-memory state
    }
  }, [state, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (user) {
        window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      } else {
        window.localStorage.removeItem(SESSION_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }, [user, hydrated]);

  const login = useCallback<StoreValue["login"]>((id, password) => {
    const authed = authenticate(id, password);
    if (!authed) {
      return { ok: false, error: "Invalid ID or password. Try a demo account." };
    }
    setUser(authed);
    return { ok: true, user: authed };
  }, []);

  const logout = useCallback(() => setUser(null), []);

  const isSlotAvailable = useCallback(
    (slot: string) =>
      !state.appointments.some(
        (a) => a.slot === slot && a.status !== "Completed",
      ),
    [state.appointments],
  );

  const bookSlot = useCallback<StoreValue["bookSlot"]>(
    (input, slot, score, urgency) => {
      if (!input.studentName.trim() || !input.studentId.trim()) {
        return { ok: false, reason: "Student name and ID are required." };
      }
      if (
        state.appointments.some(
          (a) => a.slot === slot && a.status !== "Completed",
        )
      ) {
        return {
          ok: false,
          reason: `${slot} is already booked. Choose another slot.`,
        };
      }

      const appointment: Appointment = {
        id: `APT-${Date.now()}`,
        studentName: input.studentName.trim(),
        studentId: input.studentId.trim(),
        chiefComplaint: input.chiefComplaint.trim(),
        symptoms: input.symptoms,
        severity: input.severity,
        triageScore: score,
        urgency,
        slot,
        status: "Scheduled",
        notesEncrypted: "",
        createdAt: new Date().toISOString(),
      };

      const studentActor = {
        id: input.studentId.trim(),
        role: "student" as const,
      };

      setState((prev) => ({
        appointments: [...prev.appointments, appointment],
        auditLogs: [
          makeAudit(studentActor, "Slot Booked", appointment.id),
          makeAudit(
            studentActor,
            `Appointment Triaged (${urgency}, score ${score})`,
            appointment.id,
          ),
          ...prev.auditLogs,
        ],
      }));

      return { ok: true, appointment };
    },
    [state.appointments],
  );

  const updateStatus = useCallback(
    (id: string, status: AppointmentStatus) => {
      if (!user) return;
      setState((prev) => {
        if (!prev.appointments.some((a) => a.id === id)) return prev;
        return {
          appointments: prev.appointments.map((a) =>
            a.id === id ? { ...a, status } : a,
          ),
          auditLogs: [
            makeAudit({ id: user.id, role: user.role }, `Status Changed -> ${status}`, id),
            ...prev.auditLogs,
          ],
        };
      });
    },
    [user],
  );

  const saveNotes = useCallback(
    (id: string, plaintext: string) => {
      if (!user) return;
      const encrypted = encryptField(plaintext);
      setState((prev) => ({
        appointments: prev.appointments.map((a) =>
          a.id === id ? { ...a, notesEncrypted: encrypted } : a,
        ),
        auditLogs: [
          makeAudit({ id: user.id, role: user.role }, "Clinical Note Added", id),
          ...prev.auditLogs,
        ],
      }));
    },
    [user],
  );

  const readNotes = useCallback<StoreValue["readNotes"]>(
    (appointment) => decryptField(appointment.notesEncrypted),
    [],
  );

  const resetDemo = useCallback(() => setState(freshState()), []);

  const value = useMemo<StoreValue>(
    () => ({
      appointments: state.appointments,
      auditLogs: state.auditLogs,
      user,
      hydrated,
      login,
      logout,
      isSlotAvailable,
      bookSlot,
      updateStatus,
      saveNotes,
      readNotes,
      resetDemo,
    }),
    [
      state,
      user,
      hydrated,
      login,
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
