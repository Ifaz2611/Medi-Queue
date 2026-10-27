"use client";

// Reusable clinic summary stat cards (Member 2 — Day 3/4).
// Cards are presentational only; all metrics are derived by the caller
// from the role-scoped appointments array in the store.

import type { LucideIcon } from "lucide-react";

export interface Stat {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  /** Tailwind classes for the icon chip (e.g. "bg-emerald-50 text-emerald-600"). */
  tone: string;
}

export default function StatCards({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${s.tone}`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {s.label}
              </p>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-800">{s.value}</p>
            {s.hint && (
              <p className="mt-0.5 text-[11px] text-slate-400">{s.hint}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
