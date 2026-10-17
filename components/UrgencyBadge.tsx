import type { Urgency } from "@/lib/types";

const STYLES: Record<Urgency, string> = {
  High: "bg-red-50 text-red-700 ring-red-200",
  Medium: "bg-amber-50 text-amber-700 ring-amber-200",
  Low: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

const DOT: Record<Urgency, string> = {
  High: "bg-red-500",
  Medium: "bg-amber-500",
  Low: "bg-emerald-500",
};

export default function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STYLES[urgency]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[urgency]}`} />
      {urgency}
    </span>
  );
}
