"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentType } from "react";
import {
  HeartPulse,
  LayoutDashboard,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  role: Role;
  icon: ComponentType<{ className?: string }>;
}

const NAV: NavItem[] = [
  { href: "/", label: "Overview", role: "student", icon: LayoutDashboard },
  { href: "/student", label: "Student", role: "student", icon: UserRound },
  { href: "/doctor", label: "Doctor", role: "doctor", icon: Stethoscope },
  { href: "/admin", label: "Admin", role: "admin", icon: ShieldCheck },
];

const ROLES: { role: Role; label: string }[] = [
  { role: "student", label: "Student" },
  { role: "doctor", label: "Doctor" },
  { role: "admin", label: "Admin" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, setRole, actor } = useStore();

  const switchRole = (next: Role) => {
    setRole(next);
    const item = NAV.find((n) => n.role === next && n.href !== "/");
    if (item) router.push(item.href);
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <HeartPulse className="h-4.5 w-4.5" />
          </span>
          <span className="text-base font-semibold tracking-tight text-slate-800">
            MediQueue
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">
              Signed in as
            </p>
            <p className="text-sm font-medium text-slate-700">{actor.name}</p>
          </div>
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {ROLES.map(({ role: r, label }) => (
              <button
                key={r}
                type="button"
                onClick={() => switchRole(r)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  role === r
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
