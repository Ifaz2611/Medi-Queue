"use client";

import { useState } from "react";
import {
  Activity,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  Flame,
  Search,
  Lock,
  Play,
  Save,
  Stethoscope,
  UserRound,
} from "lucide-react";
import Card from "@/components/Card";
import ConfirmModal from "@/components/ConfirmModal";
import LifecycleStepper from "@/components/LifecycleStepper";
import RequireRole from "@/components/RequireRole";
import StatusBadge from "@/components/StatusBadge";
import StatCards from "@/components/StatCards";
import UrgencyBadge from "@/components/UrgencyBadge";
import { sortQueue } from "@/lib/queue";
import { useStore } from "@/lib/store";
import { SYMPTOMS } from "@/lib/triage";
import type { Appointment, Urgency } from "@/lib/types";

type Filter = "All" | "Active" | "Completed";

type UrgencyFilter = "All" | Urgency;

const FILTERS: Filter[] = ["All", "Active", "Completed"];

const URGENCY_FILTERS: UrgencyFilter[] = ["All", "High", "Medium", "Low"];

function DoctorDashboard() {
  const { user, appointments, updateStatus, saveNotes, readNotes } = useStore();

  const [filter, setFilter] = useState<Filter>("All");
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>("All");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const [confirmCompleteId, setConfirmCompleteId] = useState<string | null>(
    null,
  );

  const filtered = appointments.filter((a) => {
    if (filter === "Active") return a.status !== "Completed";
    if (filter === "Completed") return a.status === "Completed";
    return true;
  });

  // Urgency filter: quickly narrow the queue to a priority group.
  const byUrgency =
    urgencyFilter === "All"
      ? filtered
      : filtered.filter((a) => a.urgency === urgencyFilter);

  // Real-time patient search: matches Student ID or chief complaint
  // (case-insensitive), combinable with the status and urgency filters.
  const query = search.trim().toLowerCase();
  const searched = query
    ? byUrgency.filter(
        (a) =>
          a.studentId.toLowerCase().includes(query) ||
          a.chiefComplaint.toLowerCase().includes(query) ||
          a.studentName.toLowerCase().includes(query),
      )
    : byUrgency;
  const queue = sortQueue(searched);

  const selected = appointments.find((a) => a.id === selectedId) ?? null;

  const handleSelect = (appointment: Appointment) => {
    setSelectedId(appointment.id);
    setDraft(readNotes(appointment));
    setSavedFlash(false);
  };

  const handleSave = async () => {
    if (!selected) return;
    await saveNotes(selected.id, draft);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  };

  const labelFor = (key: string) =>
    SYMPTOMS.find((s) => s.key === key)?.label ?? key;

  const openCount = appointments.filter((a) => a.status !== "Completed").length;
  const highCount = appointments.filter(
    (a) => a.urgency === "High" && a.status !== "Completed",
  ).length;
  const completedCount = appointments.length - openCount;
  const avgSeverity = appointments.length
    ? (
        appointments.reduce((sum, a) => sum + a.severity, 0) /
        appointments.length
      ).toFixed(1)
    : "—";

  const stats = [
    {
      label: "Total Appointments",
      value: String(appointments.length),
      hint: `${openCount} active · ${completedCount} completed`,
      icon: CalendarClock,
      tone: "bg-blue-50 text-blue-600",
    },
    {
      label: "High Priority",
      value: String(highCount),
      hint: "High urgency, still in queue",
      icon: Flame,
      tone: "bg-rose-50 text-rose-600",
    },
    {
      label: "Active vs Completed",
      value: `${openCount}/${completedCount}`,
      hint: "Current queue vs finished today",
      icon: Activity,
      tone: "bg-amber-50 text-amber-600",
    },
    {
      label: "Avg Severity",
      value: avgSeverity,
      hint: "Across all appointments (0–10)",
      icon: CheckCircle2,
      tone: "bg-emerald-50 text-emerald-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 p-6 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <Stethoscope className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-100">
              Doctor Dashboard
            </p>
            <h1 className="mt-0.5 text-2xl font-bold">{user?.name}</h1>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="rounded-xl bg-white/15 px-4 py-2 text-center backdrop-blur">
            <p className="text-2xl font-bold">{openCount}</p>
            <p className="text-[11px] uppercase tracking-wide text-emerald-100">
              In queue
            </p>
          </div>
          <div className="rounded-xl bg-white/15 px-4 py-2 text-center backdrop-blur">
            <p className="text-2xl font-bold">{highCount}</p>
            <p className="text-[11px] uppercase tracking-wide text-emerald-100">
              High priority
            </p>
          </div>
        </div>
      </div>

      {/* Clinic summary stats */}
      <StatCards stats={stats} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-slate-500">
          Sorted by priority (High → Low), then earliest slot.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
            Urgency
            <select
              value={urgencyFilter}
              onChange={(e) =>
                setUrgencyFilter(e.target.value as UrgencyFilter)
              }
              aria-label="Filter by urgency"
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              {URGENCY_FILTERS.map((u) => (
                <option key={u} value={u}>
                  {u === "All" ? "All priorities" : u}
                </option>
              ))}
            </select>
          </label>
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filter === f
                    ? "bg-blue-600 text-white"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Patient search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search patient by Student ID, name or chief complaint…"
          aria-label="Search patients"
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:max-w-md"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 transition-colors hover:text-slate-600"
          >
            Clear
          </button>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Queue */}
        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-slate-400" />
            <h2 className="font-semibold text-slate-800">Queue</h2>
          </div>

          {queue.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              {query
                ? `No patients match "${search.trim()}".`
                : "No appointments in this view."}
            </p>
          ) : (
            <ul className="space-y-2">
              {queue.map((a) => {
                const active = a.id === selectedId;
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(a)}
                      className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                        active
                          ? "border-blue-400 bg-blue-50"
                          : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-700">
                          {a.slot}
                          <span className="ml-2 font-normal text-slate-600">
                            {a.studentName}
                          </span>
                        </span>
                        <UrgencyBadge urgency={a.urgency} />
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                        <span>
                          {a.studentId} · score {a.triageScore}
                        </span>
                        <StatusBadge status={a.status} />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Consultation */}
        <div className="lg:col-span-3">
          {!selected ? (
            <Card className="flex h-full flex-col items-center justify-center py-16 text-center">
              <Stethoscope className="h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm text-slate-400">
                Select a patient from the queue to open the consultation view.
              </p>
            </Card>
          ) : (
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    {selected.studentName}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selected.studentId} · {selected.slot} · {selected.id}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <UrgencyBadge urgency={selected.urgency} />
                  <StatusBadge status={selected.status} />
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-slate-50 p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Symptom Summary &amp; Triage
                </p>
                <p className="text-sm text-slate-700">
                  <span className="font-medium">Complaint:</span>{" "}
                  {selected.chiefComplaint || "—"}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selected.symptoms.length === 0 ? (
                    <span className="text-xs text-slate-400">
                      No symptoms selected
                    </span>
                  ) : (
                    selected.symptoms.map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-white px-2.5 py-0.5 text-xs text-slate-600 ring-1 ring-inset ring-slate-200"
                      >
                        {labelFor(s)}
                      </span>
                    ))
                  )}
                </div>
                <div className="mt-3 flex gap-4 text-sm">
                  <span className="text-slate-500">
                    Triage score:{" "}
                    <span className="font-bold text-slate-800">
                      {selected.triageScore}
                    </span>
                  </span>
                  <span className="text-slate-500">
                    Severity:{" "}
                    <span className="font-bold text-slate-800">
                      {selected.severity}/10
                    </span>
                  </span>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-slate-100 p-3">
                <p className="mb-2 text-[11px] uppercase tracking-wide text-slate-400">
                  Appointment lifecycle
                </p>
                <LifecycleStepper status={selected.status} />
              </div>

              {/* Clinical notes */}
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                    <FileText className="h-4 w-4 text-slate-400" /> Clinical
                    Notes
                  </span>
                  {savedFlash && (
                    <span className="text-xs font-medium text-emerald-600">
                      Saved &amp; encrypted
                    </span>
                  )}
                </div>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={4}
                  placeholder="Record diagnosis, prescriptions and follow-up plan…"
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Lock className="h-3 w-3" /> Field-level AES-256
                    (simulated) before save
                  </p>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                  >
                    <Save className="h-4 w-4" /> Save Notes
                  </button>
                </div>
                {selected.notesEncrypted && (
                  <p className="mt-2 truncate rounded-md bg-slate-50 px-2 py-1.5 font-mono text-[10px] text-slate-400">
                    {selected.notesEncrypted}
                  </p>
                )}
              </div>

              {/* State actions */}
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={
                    selected.status === "In-Consultation" ||
                    selected.status === "Completed"
                  }
                  onClick={() => updateStatus(selected.id, "In-Consultation")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Play className="h-4 w-4" /> Start Consultation
                </button>
                <button
                  type="button"
                  disabled={selected.status === "Completed"}
                  onClick={() => setConfirmCompleteId(selected.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <UserRound className="h-4 w-4" /> Mark Completed
                </button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Completion confirmation */}
      <ConfirmModal
        open={confirmCompleteId !== null}
        title="Mark as Completed?"
        message={
          <>
            This will close the consultation for{" "}
            <span className="font-semibold text-slate-700">
              {appointments.find((a) => a.id === confirmCompleteId)
                ?.studentName ?? "this patient"}
            </span>{" "}
            and remove them from the active queue. This action cannot be undone.
          </>
        }
        confirmLabel="Mark Completed"
        onConfirm={async () => {
          const id = confirmCompleteId;
          setConfirmCompleteId(null);
          if (id) await updateStatus(id, "Completed");
        }}
        onCancel={() => setConfirmCompleteId(null)}
      />
    </div>
  );
}

export default function DoctorPage() {
  return (
    <RequireRole role="doctor">
      <DoctorDashboard />
    </RequireRole>
  );
}
