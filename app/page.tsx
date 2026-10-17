"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ShieldCheck,
  Stethoscope,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import UrgencyBadge from "@/components/UrgencyBadge";
import { useStore } from "@/lib/store";
import { sortQueue } from "@/lib/queue";

const PORTALS = [
  {
    href: "/student",
    title: "Student Portal",
    description: "Symptom intake, deterministic triage and smart slot booking.",
    icon: UserRound,
    accent: "bg-blue-600",
  },
  {
    href: "/doctor",
    title: "Doctor Dashboard",
    description: "Priority-ordered live queue and encrypted consultation notes.",
    icon: Stethoscope,
    accent: "bg-emerald-600",
  },
  {
    href: "/admin",
    title: "Admin / Audit",
    description: "Privacy-safe queue metadata and the immutable audit trail.",
    icon: ShieldCheck,
    accent: "bg-slate-700",
  },
];

export default function Home() {
  const { appointments, auditLogs } = useStore();

  const waiting = appointments.filter((a) => a.status !== "Completed");
  const stats = [
    { label: "Total appointments", value: appointments.length },
    { label: "In queue", value: waiting.length },
    {
      label: "High urgency",
      value: appointments.filter((a) => a.urgency === "High").length,
    },
    {
      label: "Completed",
      value: appointments.filter((a) => a.status === "Completed").length,
    },
  ];

  const snapshot = sortQueue(waiting).slice(0, 4);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 p-6 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-100">
          Campus Health Center
        </p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
          MediQueue – Appointment &amp; Triage System
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-blue-50">
          Book a consultation, get triaged by a deterministic priority engine,
          and let clinicians see the most critical patients first.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4">
            <p className="text-xs text-slate-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">
              {stat.value}
            </p>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {PORTALS.map((portal) => {
          const Icon = portal.icon;
          return (
            <Link key={portal.href} href={portal.href} className="group">
              <Card className="flex h-full flex-col transition-shadow group-hover:shadow-md">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-lg text-white ${portal.accent}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <h2 className="mt-3 font-semibold text-slate-800">
                  {portal.title}
                </h2>
                <p className="mt-1 flex-1 text-sm text-slate-500">
                  {portal.description}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600">
                  Open <ArrowRight className="h-4 w-4" />
                </span>
              </Card>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            <h2 className="font-semibold text-slate-800">
              Today&apos;s priority queue
            </h2>
          </div>
          {snapshot.length === 0 ? (
            <p className="text-sm text-slate-400">No patients in the queue.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {snapshot.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5"
                >
                  <span className="w-12 text-sm font-semibold text-slate-700">
                    {a.slot}
                  </span>
                  <span className="flex-1 text-sm text-slate-700">
                    {a.studentName}
                    <span className="ml-2 text-xs text-slate-400">
                      {a.studentId}
                    </span>
                  </span>
                  <UrgencyBadge urgency={a.urgency} />
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-slate-400" />
            <h2 className="font-semibold text-slate-800">System audit</h2>
          </div>
          <div className="flex items-center gap-3">
            <TriangleAlert className="h-8 w-8 text-amber-400" />
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {auditLogs.length}
              </p>
              <p className="text-xs text-slate-500">
                immutable events recorded
              </p>
            </div>
          </div>
          <Link
            href="/admin"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600"
          >
            View audit trail <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      </section>
    </div>
  );
}
