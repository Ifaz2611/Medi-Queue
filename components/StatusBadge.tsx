import type { AppointmentStatus } from "@/lib/types";

const STYLES: Record<AppointmentStatus, string> = {
  Initiated: "bg-slate-100 text-slate-600 ring-slate-200",
  Triaged: "bg-blue-50 text-blue-700 ring-blue-200",
  Scheduled: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  "In-Consultation": "bg-amber-50 text-amber-700 ring-amber-200",
  Completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

export default function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}
