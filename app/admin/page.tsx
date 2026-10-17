"use client";

import { RotateCcw, ShieldCheck, TableProperties } from "lucide-react";
import Card from "@/components/Card";
import RequireRole from "@/components/RequireRole";
import StatusBadge from "@/components/StatusBadge";
import UrgencyBadge from "@/components/UrgencyBadge";
import { sortQueue } from "@/lib/queue";
import { useStore } from "@/lib/store";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function AdminDashboard() {
  const { user, appointments, auditLogs, resetDemo, hydrated } = useStore();
  const queue = sortQueue(appointments);
  const logs = [...auditLogs].sort((a, b) =>
    b.timestamp.localeCompare(a.timestamp),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-600 p-6 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-200">
              Admin / Audit
            </p>
            <h1 className="mt-0.5 text-2xl font-bold">{user?.name}</h1>
          </div>
        </div>
        <button
          type="button"
          onClick={resetDemo}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/25"
        >
          <RotateCcw className="h-4 w-4" /> Reset demo data
        </button>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
        <p className="flex items-center gap-2 text-xs text-blue-700">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          RBAC active — hidden fields: chief complaint, symptoms, severity and
          encrypted clinical notes.
        </p>
      </div>

      {/* Queue metadata only */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
          <TableProperties className="h-4 w-4 text-slate-400" />
          <h2 className="font-semibold text-slate-800">
            Appointment Queue (metadata)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-2.5 font-medium">Student ID</th>
                <th className="px-5 py-2.5 font-medium">Slot Time</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 font-medium">Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {queue.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-6 text-center text-slate-400"
                  >
                    No appointments.
                  </td>
                </tr>
              ) : (
                queue.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5 font-medium text-slate-700">
                      {a.studentId}
                    </td>
                    <td className="px-5 py-2.5 text-slate-600">{a.slot}</td>
                    <td className="px-5 py-2.5">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-5 py-2.5">
                      <UrgencyBadge urgency={a.urgency} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Immutable audit log */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-slate-400" />
            <h2 className="font-semibold text-slate-800">
              Immutable Audit Log
            </h2>
          </div>
          <span className="text-xs text-slate-400">read-only</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-2.5 font-medium">Timestamp</th>
                <th className="px-5 py-2.5 font-medium">User_ID / Role</th>
                <th className="px-5 py-2.5 font-medium">Action</th>
                <th className="px-5 py-2.5 font-medium">Resource_ID</th>
                <th className="px-5 py-2.5 font-medium">IP_Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!hydrated || logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-6 text-center text-slate-400"
                  >
                    {hydrated ? "No events recorded." : "Loading audit trail…"}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-5 py-2.5 text-slate-600">
                      {formatTime(log.timestamp)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-2.5">
                      <span className="font-medium text-slate-700">
                        {log.userId}
                      </span>
                      <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500">
                        {log.role}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-slate-600">{log.action}</td>
                    <td className="whitespace-nowrap px-5 py-2.5 font-mono text-xs text-slate-500">
                      {log.resourceId}
                    </td>
                    <td className="whitespace-nowrap px-5 py-2.5 font-mono text-xs text-slate-500">
                      {log.ipAddress}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  return (
    <RequireRole role="admin">
      <AdminDashboard />
    </RequireRole>
  );
}
