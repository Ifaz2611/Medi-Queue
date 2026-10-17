"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentType } from "react";
import {
  HeartPulse,
  LogOut,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { ROLE_LABEL } from "@/lib/auth";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const ROLE_NAV: Record<Role, NavItem[]> = {
  student: [{ href: "/student", label: "My Portal", icon: UserRound }],
  doctor: [{ href: "/doctor", label: "Patient Queue", icon: Stethoscope }],
  admin: [{ href: "/admin", label: "Admin & Audit", icon: ShieldCheck }],
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, hydrated } = useStore();

  // Auth pages render their own full-screen layout.
  if (pathname === "/" || pathname === "/login") return null;
  if (!hydrated) return null;

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const items = user ? ROLE_NAV[user.role] : [];

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href={user ? ROLE_NAV[user.role][0].href : "/login"} className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <HeartPulse className="h-4.5 w-4.5" />
          </span>
          <span className="text-base font-semibold tracking-tight text-slate-800">
            MediQueue
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {items.map((item) => {
            const active = pathname.startsWith(item.href);
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
          {user && (
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                {user.name.charAt(0)}
              </span>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium leading-tight text-slate-700">
                  {user.name}
                </p>
                <p className="text-[11px] leading-tight text-slate-400">
                  {ROLE_LABEL[user.role]}
                </p>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
