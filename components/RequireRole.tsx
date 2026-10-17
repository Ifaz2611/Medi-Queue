"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HeartPulse, ShieldAlert } from "lucide-react";
import { ROLE_HOME, ROLE_LABEL } from "@/lib/auth";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";

function Loading({ message = "Loading your workspace…" }: { message?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-400">
      <span className="flex h-10 w-10 animate-pulse items-center justify-center rounded-xl bg-blue-600 text-white">
        <HeartPulse className="h-5 w-5" />
      </span>
      <p className="text-sm">{message}</p>
    </div>
  );
}

export default function RequireRole({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const { user, hydrated, logout } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && !user) router.replace("/login");
  }, [hydrated, user, router]);

  if (!hydrated) return <Loading />;
  if (!user) return <Loading message="Redirecting to sign in…" />;

  if (user.role !== role) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
          <ShieldAlert className="h-6 w-6" />
        </span>
        <h1 className="mt-3 text-lg font-bold text-slate-800">Access denied</h1>
        <p className="mt-1 text-sm text-slate-500">
          You are signed in as a {ROLE_LABEL[user.role]} and cannot view this
          area.
        </p>
        <div className="mt-5 flex gap-2">
          <Link
            href={ROLE_HOME[user.role]}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Go to my dashboard
          </Link>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
