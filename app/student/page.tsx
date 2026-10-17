"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  Check,
  ClipboardList,
  Info,
  Lock,
  TriangleAlert,
} from "lucide-react";
import Card from "@/components/Card";
import LifecycleStepper from "@/components/LifecycleStepper";
import StatusBadge from "@/components/StatusBadge";
import UrgencyBadge from "@/components/UrgencyBadge";
import { PRIORITY_SLOTS, SLOTS } from "@/lib/mockData";
import { useStore } from "@/lib/store";
import { SYMPTOMS, WEIGHTS, triage } from "@/lib/triage";

export default function StudentPage() {
  const { bookSlot, isSlotAvailable, appointments } = useStore();

  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [severity, setSeverity] = useState(5);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [bookedId, setBookedId] = useState<string | null>(null);

  const booked = appointments.find((a) => a.id === bookedId) ?? null;

  const result = useMemo(
    () => triage(symptoms, severity, chiefComplaint),
    [symptoms, severity, chiefComplaint],
  );

  const toggleSymptom = (key: string) => {
    setSymptoms((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key],
    );
  };

  const handleBook = () => {
    setError("");
    if (!selectedSlot) {
      setError("Please select a time slot.");
      return;
    }
    const response = bookSlot(
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
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
          FR-02 · FR-03 · Student Portal
        </p>
        <h1 className="text-xl font-bold text-slate-800">
          Symptom Intake &amp; Slot Booking
        </h1>
        <p className="text-sm text-slate-500">
          Describe your symptoms, review your triage priority, then reserve a
          slot for today.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Intake form */}
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-slate-400" />
            <h2 className="font-semibold text-slate-800">Symptom Intake</h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">
                Student Name
              </span>
              <input
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Ayesha Rahman"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">
                Student ID
              </span>
              <input
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="e.g. STU-2024-001"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>

          <label className="mt-3 block">
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
          <Card className={urgencyRing}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-500" />
                <h2 className="font-semibold text-slate-800">
                  Deterministic Triage
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
              P = ({WEIGHTS.keyword} × {result.keywordWeight}) + ({WEIGHTS.severity} ×{" "}
              {result.severity}) = {result.score}
            </p>
            <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
              <Info className="h-3 w-3" /> ≥25 High · ≥15 Medium · else Low
            </p>
          </Card>

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
              Priority slots (09:00, 09:30) are reserved for High urgency and
              are locked for other scores. Booked slots cannot be double-booked.
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

          {booked && (
            <Card className="border-emerald-200 bg-emerald-50">
              <div className="flex items-center gap-2 text-emerald-700">
                <Check className="h-4 w-4" />
                <h2 className="font-semibold">Appointment confirmed</h2>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium text-slate-700">
                  {booked.slot}
                </span>
                <span className="text-slate-500">{booked.id}</span>
                <UrgencyBadge urgency={booked.urgency} />
                <StatusBadge status={booked.status} />
              </div>
              <div className="mt-4 rounded-lg bg-white p-3">
                <p className="mb-2 text-[11px] uppercase tracking-wide text-slate-400">
                  Appointment lifecycle
                </p>
                <LifecycleStepper status={booked.status} />
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
