"use client";

// Self-contained local store (mock database + auth) for the MVP.
// Persists to localStorage so changes survive a refresh, and seeds realistic
// demo data on first run. Swap these actions for Supabase queries later.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { decryptField, encryptField } from "./crypto";
import {
  createSeedAppointments,
  createSeedAuditLogs,
  MOCK_IP,
} from "./mockData";
import type { Actor, Appointment, AppointmentStatus, AuditLog, Role } from "./types";

const STORAGE_KEY = "mediqueue.store.v1";

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

interface StoreValue {
  appointments: Appointment[];
  auditLogs: AuditLog[];
  role: Role;
  actor: Actor;
  hydrated: boolean;
  setRole: (role: Role) => void;
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

const ACTORS: Record<Role, Actor> = {
  student: { id: "STU-2021-045", role: "student", name: "Ayesha Rahman" },
  doctor: { id: "DR-1001", role: "doctor", name: "Dr. Sarah Malik" },
  admin: { id: "ADM-001", role: "admin", name: "Admin Ops" },
};

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
  const [role, setRole] = useState<Role>("student");
  // Start empty so server and client render identically; seed on mount.
  const [state, setState] = useState<PersistedState>(() => ({
    appointments: [],
    auditLogs: [],
  }));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let next = freshState();
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) next = JSON.parse(raw) as PersistedState;
    } catch {
      // ignore malformed storage, fall back to seeds
    }
    // Hydrating from an external system (localStorage) on mount.
    /* eslint-disable react-hooks/set-state-in-effect */
    setState(next);
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

  const actor = ACTORS[role];

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
        return { ok: false, reason: `${slot} is already booked. Choose another slot.` };
      }

      const now = new Date().toISOString();
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
        createdAt: now,
      };

      setState((prev) => ({
        appointments: [...prev.appointments, appointment],
        auditLogs: [
          makeAudit({ id: input.studentId.trim(), role: "student" }, "Slot Booked", appointment.id),
          makeAudit(
            { id: input.studentId.trim(), role: "student" },
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
      setState((prev) => {
        const target = prev.appointments.find((a) => a.id === id);
        if (!target) return prev;
        return {
          appointments: prev.appointments.map((a) =>
            a.id === id ? { ...a, status } : a,
          ),
          auditLogs: [
            makeAudit(actor, `Status Changed -> ${status}`, id),
            ...prev.auditLogs,
          ],
        };
      });
    },
    [actor],
  );

  const saveNotes = useCallback(
    (id: string, plaintext: string) => {
      const encrypted = encryptField(plaintext);
      setState((prev) => ({
        appointments: prev.appointments.map((a) =>
          a.id === id ? { ...a, notesEncrypted: encrypted } : a,
        ),
        auditLogs: [
          makeAudit(actor, "Clinical Note Added", id),
          ...prev.auditLogs,
        ],
      }));
    },
    [actor],
  );

  const readNotes = useCallback<StoreValue["readNotes"]>(
    (appointment) => decryptField(appointment.notesEncrypted),
    [],
  );

  const resetDemo = useCallback(() => {
    setState(freshState());
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      appointments: state.appointments,
      auditLogs: state.auditLogs,
      role,
      actor,
      hydrated,
      setRole,
      isSlotAvailable,
      bookSlot,
      updateStatus,
      saveNotes,
      readNotes,
      resetDemo,
    }),
    [
      state,
      role,
      actor,
      hydrated,
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
