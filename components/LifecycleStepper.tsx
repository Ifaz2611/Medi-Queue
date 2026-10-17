import { Check } from "lucide-react";
import type { AppointmentStatus } from "@/lib/types";

const STEPS: AppointmentStatus[] = [
  "Initiated",
  "Triaged",
  "Scheduled",
  "In-Consultation",
  "Completed",
];

export default function LifecycleStepper({ status }: { status: AppointmentStatus }) {
  const currentIndex = STEPS.indexOf(status);

  return (
    <ol className="flex flex-wrap items-center gap-y-2 text-[11px] font-medium">
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li key={step} className="flex items-center">
            <div className="flex items-center gap-1.5">
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${
                  done
                    ? "bg-blue-600 text-white"
                    : active
                      ? "bg-blue-100 text-blue-700 ring-1 ring-blue-400"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                {done ? <Check className="h-2.5 w-2.5" /> : index + 1}
              </span>
              <span
                className={
                  active
                    ? "text-blue-700"
                    : done
                      ? "text-slate-600"
                      : "text-slate-400"
                }
              >
                {step}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <span
                className={`mx-1.5 h-px w-3 sm:w-5 ${done ? "bg-blue-300" : "bg-slate-200"}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
