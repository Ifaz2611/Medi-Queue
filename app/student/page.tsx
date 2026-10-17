"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Info,
  Lock,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import Card from "@/components/Card";
import LifecycleStepper from "@/components/LifecycleStepper";
import RequireRole from "@/components/RequireRole";
import StatusBadge from "@/components/StatusBadge";
import UrgencyBadge from "@/components/UrgencyBadge";
import { PRIORITY_SLOTS, SLOTS } from "@/lib/mockData";
import { sortQueue } from "@/lib/queue";
import { useStore } from "@/lib/store";
import { SYMPTOMS, WEIGHTS, triage } from "@/lib/triage";

function StudentPortal() {
  const { user, bookSlot, isSlotAvailable, appointments } = useStore();

  const studentName = user?.name ?? "";
  const studentId = user?.id ?? "";

  const [chiefComplaint, setChiefComplaint] = useState("");
  const [severity, setSeverity] = useState(5);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [bookedId, setBookedId] = useState<string | null>(null);

  const result = useMemo(
    () => triage(symptoms, severity, chiefComplaint),
    [symptoms, severity, chiefComplaint],
  );

  const mine = sortQueue(
    appointments.filter((a) => a.studentId === studentId),
  );
  const justBooked = appointments.find((a) => a.id === bookedId) ?? null;

  const toggleSymptom = (key: string) =>
    setSymptoms((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key],
    );

  const handleBook = async () => {
    setError("");
    if (!selectedSlot) {
      setError("Please select a time slot.");
      return;
    }
    const response = await bookSlot(
      { studentName, studentId, chiefComplaint, symptoms, severity },
      selectedSlot,
      result.score,
      result.urgency,
    );
    if (!response.ok) {
      setError(response.reason ?? "Unable to book this slot.");
      return;
    }
    setBookedId(response.appointment!.id);
    setSelectedSlot(null);
    setChiefComplaint("");
    setSymptoms([]);
  };

  const urgencyRing =
    result.urgency === "High"
      ? "border-red-200 bg-red-50"
      : result.urgency === "Medium"
        ? "border-amber-200 bg-amber-50"
        : "border-emerald-200 bg-emerald-50";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 p-6 text-white shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-100">
            Student Portal
          </p>
          <h1 className="mt-1 text-2xl font-bold">Hi, {studentName}</h1>
          <p className="mt-1 text-sm text-blue-50">
            Describe your symptoms, review your triage priority and book a slot.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-3 backdrop-blur">
          <UserRound className="h-5 w-5" />
          <div>
            <p className="text-[11px] uppercase tracking-wide text-blue-100">
              Signed in
            </p>
            <p className="font-mono text-sm font-semibold">{studentId}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Intake form */}
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-slate-400" />
            <h2 className="font-semibold text-slate-800">Symptom Intake</h2>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">
              Chief Complaint
            </span>
            <textarea
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              rows={3}
              placeholder="Describe how you feel (e.g. chest pain and shortness of breath)"
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Severity (1–10)
              </span>
              <span className="text-sm font-bold text-slate-800">
                {severity}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={severity}
              onChange={(e) => setSeverity(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>1 · Mild</span>
              <span>10 · Severe</span>
            </div>
          </div>

          <div className="mt-4">
            <span className="mb-2 block text-xs font-medium text-slate-500">
              Key symptoms
            </span>
            <div className="grid gap-2 sm:grid-cols-2">
              {SYMPTOMS.map((symptom) => {
                const checked = symptoms.includes(symptom.key);
                return (
                  <label
                    key={symptom.key}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      checked
                        ? "border-blue-300 bg-blue-50 text-blue-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSymptom(symptom.key)}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <span className="flex-1">{symptom.label}</span>
                    <span className="text-[10px] text-slate-400">
                      w{symptom.weight}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Triage + booking */}
        <div className="space-y-5">
          <div className={`rounded-xl border p-5 shadow-sm ${urgencyRing}`}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-500" />
                <h2 className="font-semibold text-slate-800">
                  Live Triage Result
                </h2>
              </div>
              <UrgencyBadge urgency={result.urgency} />
            </div>

            <div className="flex items-end gap-4">
              <div>
                <p className="text-xs text-slate-500">Priority score</p>
                <p className="text-4xl font-bold text-slate-800">
                  {result.score}
                </p>
              </div>
              <div className="grid flex-1 grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-white/70 px-2 py-1.5">
                  <p className="text-[10px] uppercase text-slate-400">
                    Keyword K
                  </p>
                  <p className="text-sm font-semibold text-slate-700">
                    {result.keywordWeight}
                  </p>
                </div>
                <div className="rounded-lg bg-white/70 px-2 py-1.5">
                  <p className="text-[10px] uppercase text-slate-400">
                    Severity S
                  </p>
                  <p className="text-sm font-semibold text-slate-700">
                    {result.severity}
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-3 rounded-lg bg-white/60 px-3 py-2 font-mono text-[11px] text-slate-500">
              P = ({WEIGHTS.keyword} × {result.keywordWeight}) + (
              {WEIGHTS.severity} × {result.severity}) = {result.score}
            </p>
            <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
              <Info className="h-3 w-3" /> ≥25 High · ≥15 Medium · else Low
            </p>
          </div>

          <Card>
            <div className="mb-1 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              <h2 className="font-semibold text-slate-800">Book a slot</h2>
            </div>
            <p className="mb-3 text-xs text-slate-500">
              Today&apos;s available slots · earliest first
            </p>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {SLOTS.map((slot) => {
                const available = isSlotAvailable(slot);
                const isPriority = PRIORITY_SLOTS.includes(slot);
                const locked = isPriority && result.urgency !== "High";
                const disabled = !available || locked;
                const isSelected = selectedSlot === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={disabled}
                    onClick={() => setSelectedSlot(slot)}
                    className={`relative rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${
                      isSelected
                        ? "border-blue-500 bg-blue-600 text-white"
                        : disabled
                          ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                          : "border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    {slot}
                    {isPriority && (
                      <span
                        className={`mt-0.5 flex items-center justify-center gap-0.5 text-[9px] ${
                          isSelected ? "text-blue-100" : "text-amber-600"
                        }`}
                      >
                        {locked && <Lock className="h-2.5 w-2.5" />}
                        Priority
                      </span>
                    )}
                    {!available && (
                      <span className="mt-0.5 block text-[9px] text-slate-400">
                        Booked
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <p className="mt-3 text-[11px] text-slate-500">
              Priority slots (09:00, 09:30) are reserved for High urgency.
              Booked slots cannot be double-booked.
            </p>

            {error && (
              <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                <TriangleAlert className="h-3.5 w-3.5" /> {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleBook}
              className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Confirm Booking
            </button>
          </Card>

          {justBooked && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                <h2 className="font-semibold">Appointment confirmed</h2>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium text-slate-700">
                  {justBooked.slot}
                </span>
                <span className="text-slate-500">{justBooked.id}</span>
                <UrgencyBadge urgency={justBooked.urgency} />
                <StatusBadge status={justBooked.status} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* My appointments */}
      <Card>
        <h2 className="mb-3 font-semibold text-slate-800">My Appointments</h2>
        {mine.length === 0 ? (
          <p className="py-4 text-sm text-slate-400">
            You have no appointments yet. Book a slot above.
          </p>
        ) : (
          <ul className="space-y-3">
            {mine.map((a) => (
              <li
                key={a.id}
                className="rounded-lg border border-slate-100 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-slate-800">
                      {a.slot}
                    </span>
                    <span className="font-mono text-xs text-slate-400">
                      {a.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UrgencyBadge urgency={a.urgency} />
                    <StatusBadge status={a.status} />
                  </div>
                </div>
                <div className="mt-3 rounded-lg bg-slate-50 p-3">
                  <LifecycleStepper status={a.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default function StudentPage() {
  return (
    <RequireRole role="student">
      <StudentPortal />
    </RequireRole>
  );
}
