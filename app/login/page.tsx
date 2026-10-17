"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ClipboardList,
  Eye,
  EyeOff,
  HeartPulse,
  Lock,
  ShieldCheck,
  Stethoscope,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { CREDENTIALS, ROLE_HOME, ROLE_LABEL } from "@/lib/auth";
import { useStore } from "@/lib/store";

const HIGHLIGHTS = [
  {
    icon: ClipboardList,
    title: "Smart symptom intake",
    text: "Deterministic triage ranks every patient by risk.",
  },
  {
    icon: Stethoscope,
    title: "Priority-first queue",
    text: "Clinicians see critical cases first, in real time.",
  },
  {
    icon: ShieldCheck,
    title: "Private & audited",
    text: "Role-based access with an immutable audit trail.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, user, hydrated } = useStore();

  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (hydrated && user) router.replace(ROLE_HOME[user.role]);
  }, [hydrated, user, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const result = login(id, password);
    if (!result.ok || !result.user) {
      setError(result.error ?? "Unable to sign in.");
      return;
    }
    router.replace(ROLE_HOME[result.user.role]);
  };

  const quickFill = (index: number) => {
    const cred = CREDENTIALS[index];
    setId(cred.id);
    setPassword(cred.password);
    setError("");
  };

  return (
    <div className="grid min-h-[calc(100vh-3rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 p-10 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <HeartPulse className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight">MediQueue</span>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">
            Campus Health Center
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight xl:text-4xl">
            Queue &amp; triage, without the guesswork.
          </h1>
          <p className="mt-3 max-w-md text-sm text-blue-50">
            One platform for students, doctors and administrators — each with
            their own secure workspace.
          </p>

          <ul className="mt-8 space-y-5">
            {HIGHLIGHTS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-xs text-blue-100">{item.text}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="text-xs text-blue-100/80">
          MVP demo · data is stored locally in your browser.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col justify-center p-8 sm:p-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
              <HeartPulse className="h-4.5 w-4.5" />
            </span>
            <span className="text-base font-bold text-slate-800">MediQueue</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-800">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to your role-based workspace.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">
                User ID
              </span>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                <UserRound className="h-4 w-4 text-slate-400" />
                <input
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  placeholder="e.g. STU-2021-045"
                  autoComplete="username"
                  className="w-full bg-transparent py-2.5 text-sm outline-none"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">
                Password
              </span>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                <Lock className="h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-transparent py-2.5 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </label>

            {error && (
              <p className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                <TriangleAlert className="h-3.5 w-3.5" /> {error}
              </p>
            )}

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Sign in <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Demo accounts
            </p>
            <div className="grid gap-2">
              {CREDENTIALS.map((cred, index) => (
                <button
                  key={cred.id}
                  type="button"
                  onClick={() => quickFill(index)}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
                >
                  <span>
                    <span className="block text-xs font-semibold text-slate-700">
                      {ROLE_LABEL[cred.role]}
                    </span>
                    <span className="block font-mono text-[10px] text-slate-400">
                      {cred.id} · {cred.password}
                    </span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
