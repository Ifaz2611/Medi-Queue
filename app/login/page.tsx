"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Eye,
  EyeOff,
  GraduationCap,
  HeartPulse,
  IdCard,
  Lock,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TriangleAlert,
  UserPlus,
  UserRound,
} from "lucide-react";
import { CREDENTIALS, ROLE_HOME, ROLE_LABEL } from "@/lib/auth";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";

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

const ROLE_OPTIONS: {
  role: Role;
  label: string;
  icon: typeof UserRound;
  hint: string;
  placeholder: string;
}[] = [
  {
    role: "student",
    label: "Student",
    icon: GraduationCap,
    hint: "Symptom intake & triage booking",
    placeholder: "e.g. STU-2024-001",
  },
  {
    role: "doctor",
    label: "Doctor",
    icon: Stethoscope,
    hint: "Queue & consultation notes",
    placeholder: "e.g. DR-1002",
  },
  {
    role: "admin",
    label: "Admin",
    icon: ShieldCheck,
    hint: "Clinic oversight & audit logs",
    placeholder: "e.g. ADM-002",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, register, user, hydrated } = useStore();

  const [mode, setMode] = useState<"login" | "register">("login");

  // Sign-in form state
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Register form state
  const [regFullName, setRegFullName] = useState("");
  const [regCampusId, setRegCampusId] = useState("");
  const [regRole, setRegRole] = useState<Role>("student");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [regShowConfirmPassword, setRegShowConfirmPassword] = useState(false);

  // Feedback & submission state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (hydrated && user) router.replace(ROLE_HOME[user.role]);
  }, [hydrated, user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!id.trim()) {
      setError("Please enter your User / Campus ID.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      const result = await login(id.trim(), password);
      if (!result.ok || !result.user) {
        setError(result.error ?? "Unable to sign in.");
        setLoading(false);
        return;
      }
      router.replace(ROLE_HOME[result.user.role]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!regFullName.trim() || regFullName.trim().length < 2) {
      setError("Please enter your full name (at least 2 characters).");
      return;
    }
    if (!regCampusId.trim() || regCampusId.trim().length < 3) {
      setError("Please enter a valid Campus / User ID (e.g. STU-2024-001).");
      return;
    }
    if (regPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const result = await register({
        fullName: regFullName.trim(),
        campusId: regCampusId.trim().toUpperCase(),
        password: regPassword,
        role: regRole,
      });

      if (!result.ok || !result.user) {
        setError(result.error ?? "Registration failed. Please try again.");
        setLoading(false);
        return;
      }

      setSuccess("Account created successfully! Redirecting to workspace...");
      router.replace(ROLE_HOME[result.user.role]);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
      setLoading(false);
    }
  };

  const quickFill = (index: number) => {
    const cred = CREDENTIALS[index];
    setId(cred.id);
    setPassword(cred.password);
    setError("");
    setSuccess("");
  };

  const selectedRoleOption =
    ROLE_OPTIONS.find((r) => r.role === regRole) ?? ROLE_OPTIONS[0];

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
          Campus clinic queue system with deterministic triage &amp; Supabase RBAC.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col justify-center overflow-y-auto p-6 sm:p-10">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile brand header */}
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
              <HeartPulse className="h-4.5 w-4.5" />
            </span>
            <span className="text-base font-bold text-slate-800">MediQueue</span>
          </div>

          {/* Tab switcher: Sign In vs Register */}
          <div className="mb-6 flex rounded-xl border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
                setSuccess("");
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                mode === "login"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError("");
                setSuccess("");
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                mode === "register"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Register
            </button>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-800">
              {mode === "login" ? "Welcome back" : "Create an account"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {mode === "login"
                ? "Sign in to your role-based workspace."
                : "Register for campus clinic access and care queue."}
            </p>
          </div>

          {/* Error & Success alerts */}
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-600">
              <TriangleAlert className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          {/* Sign In Form */}
          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500">
                  User / Campus ID
                </span>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                  <UserRound className="h-4 w-4 text-slate-400" />
                  <input
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder="e.g. STU-2021-045"
                    autoComplete="username"
                    disabled={loading}
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
                    disabled={loading}
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

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign in"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>

              <div className="text-center pt-1">
                <p className="text-xs text-slate-500">
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("register");
                      setError("");
                      setSuccess("");
                    }}
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    Register here
                  </button>
                </p>
              </div>

              {/* Demo accounts */}
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
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Full Name */}
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500">
                  Full Name
                </span>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                  <UserRound className="h-4 w-4 text-slate-400" />
                  <input
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="e.g. Sarah Connor"
                    autoComplete="name"
                    disabled={loading}
                    className="w-full bg-transparent py-2.5 text-sm outline-none"
                  />
                </div>
              </label>

              {/* Role Selector */}
              <div>
                <span className="mb-1.5 block text-xs font-medium text-slate-500">
                  Account Role
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {ROLE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = regRole === opt.role;
                    return (
                      <button
                        key={opt.role}
                        type="button"
                        onClick={() => setRegRole(opt.role)}
                        className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/70 text-blue-700 shadow-xs ring-1 ring-blue-600"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <Icon
                          className={`h-4.5 w-4.5 ${
                            isSelected ? "text-blue-600" : "text-slate-400"
                          }`}
                        />
                        <span className="mt-1 text-xs font-semibold">
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  {selectedRoleOption.hint}
                </p>
              </div>

              {/* Campus ID */}
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500">
                  Campus / User ID
                </span>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                  <IdCard className="h-4 w-4 text-slate-400" />
                  <input
                    value={regCampusId}
                    onChange={(e) => setRegCampusId(e.target.value.toUpperCase())}
                    placeholder={selectedRoleOption.placeholder}
                    autoComplete="username"
                    disabled={loading}
                    className="w-full bg-transparent py-2.5 text-sm font-mono outline-none uppercase"
                  />
                </div>
              </label>

              {/* Password */}
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500">
                  Password (min 6 characters)
                </span>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                  <Lock className="h-4 w-4 text-slate-400" />
                  <input
                    type={regShowPassword ? "text" : "password"}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    disabled={loading}
                    className="w-full bg-transparent py-2.5 text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setRegShowPassword((v) => !v)}
                    className="text-slate-400 hover:text-slate-600"
                    aria-label={
                      regShowPassword ? "Hide password" : "Show password"
                    }
                  >
                    {regShowPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </label>

              {/* Confirm Password */}
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500">
                  Confirm Password
                </span>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                  <Lock className="h-4 w-4 text-slate-400" />
                  <input
                    type={regShowConfirmPassword ? "text" : "password"}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    disabled={loading}
                    className="w-full bg-transparent py-2.5 text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setRegShowConfirmPassword((v) => !v)}
                    className="text-slate-400 hover:text-slate-600"
                    aria-label={
                      regShowConfirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    {regShowConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? "Creating account..." : "Create account"}
                {!loading && <UserPlus className="h-4 w-4" />}
              </button>

              <div className="text-center pt-1">
                <p className="text-xs text-slate-500">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setError("");
                      setSuccess("");
                    }}
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    Sign in here
                  </button>
                </p>
              </div>

              {/* Information Card */}
              <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 text-xs text-blue-900">
                <p className="flex items-center gap-1.5 font-semibold text-blue-800">
                  <Sparkles className="h-4 w-4 text-blue-600" /> Instant Access
                </p>
                <p className="mt-1 text-slate-600 leading-relaxed">
                  Your Campus ID is your sign-in identifier. Your role determines
                  your workspace: triage intake for Students, live queue for
                  Doctors, or clinic analytics for Admins.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
