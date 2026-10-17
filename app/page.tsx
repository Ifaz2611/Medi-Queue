"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { HeartPulse } from "lucide-react";
import { ROLE_HOME } from "@/lib/auth";
import { useStore } from "@/lib/store";

export default function Home() {
  const router = useRouter();
  const { user, hydrated } = useStore();

  useEffect(() => {
    if (!hydrated) return;
    router.replace(user ? ROLE_HOME[user.role] : "/login");
  }, [hydrated, user, router]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 text-slate-400">
      <span className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-blue-600 text-white">
        <HeartPulse className="h-6 w-6" />
      </span>
      <p className="text-sm">Taking you to the right place…</p>
    </div>
  );
}
