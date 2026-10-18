"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  HeartPulse,
  Loader2,
  ShieldCheck,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react";
import GoogleIcon from "@/components/GoogleIcon";
import IubLogo from "@/components/IubLogo";
import { CREDENTIALS, ROLE_HOME, ROLE_LABEL } from "@/lib/auth";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";

const ROLES: {
  role: Role;
  label: string;
  icon: typeof UserRound;
  hint: string;
  placeholder: string;
  prefix: string;
}[] = [
  {
    role: "student",
    label: "Student",
    icon: GraduationCap,
    hint: "Submit symptoms, check triage urgency, and book clinic visits.",
    placeholder: "STU-2021-045",
    prefix: "STU-",
  },
  {
    role: "doctor",
    label: "Doctor",
    icon: Stethoscope,
    hint: "Review triage-ranked queue and record encrypted clinical notes.",
    placeholder: "DR-1001",
    prefix: "DR-",
  },
  {
    role: "admin",
    label: "Admin",
    icon: ShieldCheck,
    hint: "Monitor queue operations, audit trails, and clinic throughput.",
    placeholder: "ADM-001",
    prefix: "ADM-",
  },
];

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register, user, hydrated } = useStore();

  // Errors handed back from /auth/callback land in the query string.
  const oauthError = searchParams.get("error") ?? "";

  const [mode, setMode] = useState<"login" | "register">("login");

  // Sign-in state
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);

  // Register state
  const [regFullName, setRegFullName] = useState("");
  const [regCampusId, setRegCampusId] = useState("");
  const [regRole, setRegRole] = useState<Role>("student");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [regShowConfirmPassword, setRegShowConfirmPassword] = useState(false);

  // Form feedback
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (hydrated && user) {
      router.replace(ROLE_HOME[user.role as Role]);
    }
  }, [hydrated, user, router]);

  const dismissError = () => {
    setError("");
    if (oauthError) router.replace("/login");
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setSuccess("");
    setGoogleLoading(true);

    try {
      const supabase = createBrowserSupabase();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: "select_account" },
        },
      });

      // On success the browser is redirected to Google, so we only handle
      // the failure branch here.
      if (oauthError) {
        setError(oauthError.message);
        setGoogleLoading(false);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Unable to start Google sign-in."
      );
      setGoogleLoading(false);
    }
  };

  const switchMode = (nextMode: "login" | "register") => {
    setMode(nextMode);
    setError("");
    setSuccess("");
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const cleanId = id.trim().toUpperCase();

    if (!cleanId) {
      setError("Please enter your Campus ID.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const result = await login(cleanId, password);

      if (!result.ok || !result.user) {
        setError(result.error ?? "Invalid ID or password.");
        setLoading(false);
        return;
      }

      router.replace(ROLE_HOME[result.user.role as Role]);
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
      setError("Full name must be at least 2 characters.");
      return;
    }

    if (!regCampusId.trim() || regCampusId.trim().length < 3) {
      setError("Please enter a valid Campus ID.");
      return;
    }

    if (regPassword.length < 6) {
      setError("Password must be at least 6 characters.");
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
        setError(result.error ?? "Registration failed.");
        setLoading(false);
        return;
      }

      setSuccess("Account created. Redirecting...");
      router.replace(ROLE_HOME[result.user.role as Role]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
      setLoading(false);
    }
  };

  const fillDemo = (index: number) => {
    const cred = CREDENTIALS[index];

    if (mode !== "login") {
      setMode("login");
    }

    setId(cred.id);
    setPassword(cred.password);
    setActiveDemo(cred.id);
    setError("");
    setSuccess("");
  };

  const handleRoleChange = (newRole: Role) => {
    setRegRole(newRole);

    const targetPrefix =
      ROLES.find((r) => r.role === newRole)?.prefix ?? "";

    if (regCampusId.match(/^(STU-|DR-|ADM-)/i)) {
      setRegCampusId(
        `${targetPrefix}${regCampusId.replace(
          /^(STU-|DR-|ADM-)/i,
          ""
        )}`
      );
    }
  };

  const currentRoleConfig =
    ROLES.find((r) => r.role === regRole) ?? ROLES[0];

  // Validation helpers for sign up
  const isMinLength = regPassword.length >= 6;

  const isPasswordMatch =
    regPassword.length > 0 &&
    regPassword === regConfirmPassword;

  const isPasswordMismatch =
    regConfirmPassword.length > 0 &&
    regPassword !== regConfirmPassword;

  return (
    <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="grid lg:grid-cols-2">

        {/* =========================================================
            LEFT SIDE
        ========================================================= */}
        <div className="flex flex-col justify-between border-b border-slate-200 bg-slate-50/70 p-8 sm:p-10 lg:border-r lg:border-b-0 lg:p-12">

          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
                <HeartPulse className="h-4.5 w-4.5" />
              </span>

              <div>
                <span className="text-sm font-semibold tracking-tight text-slate-900">
                  MediQueue
                </span>

                <span className="block text-[11px] text-slate-500">
                  Campus Health Center
                </span>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Triage Online
            </span>
          </div>

          {/* =====================================================
              ILLUSTRATION + IUB COLLABORATION
          ===================================================== */}
          <div className="my-8 flex flex-col items-center">

            <div className="relative aspect-[740/528] w-full max-w-md overflow-hidden rounded-xl border border-slate-200/80 bg-white p-2 shadow-2xs">
              <Image
                src="/login1.png"
                alt="Medical consultation between doctor and student"
                fill
                sizes="(max-width: 1024px) 100vw, 440px"
                className="object-contain"
                priority
              />
            </div>

            {/* Collaboration Branding */}
            <div className="mt-6 text-center">

              <div className="flex flex-wrap items-center justify-center gap-2">
                <h2 className="text-base font-semibold text-slate-900">
                  MediQueue
                </h2>

                <span
                  className="text-sm font-medium text-slate-400"
                  aria-hidden="true"
                >
                  ×
                </span>

                <h2 className="text-base font-semibold text-slate-900">
                  Independent University, Bangladesh
                </h2>
              </div>

              <p className="mt-1 text-xs font-semibold text-slate-600 sm:text-sm">
                In collaboration with IUB Health System
              </p>

              <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500 sm:text-sm">
                Deterministic triage and prioritized clinic queuing
                for students, doctors, and staff.
              </p>

            </div>
          </div>

          {/* =====================================================
              IUB PARTNER FOOTER
          ===================================================== */}
          <div className="flex items-center justify-between gap-4 border-t border-slate-200/70 pt-4 text-[11px] text-slate-500">

            <div className="flex items-center gap-2.5">
              <IubLogo className="h-6 w-auto" />

              <div className="flex flex-col">
                <span className="font-medium text-slate-600">
                  In collaboration with IUB
                </span>

                <span className="text-[10px] text-slate-400">
                  Independent University, Bangladesh
                </span>
              </div>
            </div>

            <span className="shrink-0">
              v2.4 · Audited
            </span>

          </div>
        </div>

        {/* =========================================================
            RIGHT SIDE: AUTHENTICATION FORM
        ========================================================= */}
        <div className="flex flex-col justify-center p-8 sm:p-10 lg:p-12">
          <div className="w-full">

            {/* Mode Selector Tabs */}
            <div
              role="tablist"
              aria-label="Authentication Mode"
              className="mb-6 flex border-b border-slate-200"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "login"}
                onClick={() => switchMode("login")}
                className={`pb-3 text-sm font-medium transition-colors ${
                  mode === "login"
                    ? "-mb-px border-b-2 border-slate-900 text-slate-900"
                    : "text-slate-400 hover:text-slate-700"
                }`}
              >
                Sign In
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={mode === "register"}
                onClick={() => switchMode("register")}
                className={`ml-6 pb-3 text-sm font-medium transition-colors ${
                  mode === "register"
                    ? "-mb-px border-b-2 border-slate-900 text-slate-900"
                    : "text-slate-400 hover:text-slate-700"
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error Message */}
            {(error || oauthError) && (
              <div
                role="alert"
                className="mb-4 flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50/80 px-3.5 py-2.5 text-xs text-red-700"
              >
                <span>{error || oauthError}</span>

                <button
                  type="button"
                  onClick={dismissError}
                  className="rounded p-0.5 text-red-400 hover:text-red-700"
                  aria-label="Dismiss error"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div
                role="status"
                className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3.5 py-2.5 text-xs text-emerald-800"
              >
                {success}
              </div>
            )}

            {mode === "login" ? (
              /* =====================================================
                 SIGN IN FORM
              ===================================================== */
              <form
                onSubmit={handleLogin}
                className="space-y-4"
                noValidate
              >
                {/* Google OAuth */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading || googleLoading}
                  className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-slate-300 bg-white py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
                >
                  {googleLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <GoogleIcon className="h-4.5 w-4.5" />
                  )}
                  {googleLoading
                    ? "Connecting to Google..."
                    : "Continue with Google"}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-slate-200" />
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    or use Campus ID
                  </span>
                  <span className="h-px flex-1 bg-slate-200" />
                </div>

                {/* Demo Logins */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span className="text-[11px] font-medium text-slate-500">
                      Quick Demo:
                    </span>

                    <div className="flex items-center gap-1.5">
                      {CREDENTIALS.map((cred, index) => {
                        const isSelected = activeDemo === cred.id;

                        return (
                          <button
                            key={cred.id}
                            type="button"
                            onClick={() => fillDemo(index)}
                            className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                              isSelected
                                ? "bg-slate-900 text-white"
                                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {ROLE_LABEL[cred.role]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Campus ID */}
                <div>
                  <label
                    htmlFor="campus-id"
                    className="mb-1.5 block text-xs font-medium text-slate-700"
                  >
                    Campus ID
                  </label>

                  <div className="relative">
                    <input
                      id="campus-id"
                      type="text"
                      value={id}
                      onChange={(e) => {
                        setId(e.target.value.toUpperCase());
                        setActiveDemo(null);
                      }}
                      placeholder="e.g. STU-2021-045"
                      disabled={loading}
                      autoComplete="username"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 pr-9 font-mono text-sm uppercase text-slate-900 placeholder:font-sans placeholder:normal-case placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:opacity-60"
                    />

                    {id && !loading && (
                      <button
                        type="button"
                        onClick={() => {
                          setId("");
                          setActiveDemo(null);
                        }}
                        className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600"
                        aria-label="Clear Campus ID"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-1.5 block text-xs font-medium text-slate-700"
                  >
                    Password
                  </label>

                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setActiveDemo(null);
                      }}
                      placeholder="Enter password"
                      disabled={loading}
                      autoComplete="current-password"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:opacity-60"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((prev) => !prev)
                      }
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    "Sign in"
                  )}
                </button>

                {/* Register Link */}
                <p className="pt-1 text-center text-xs text-slate-500">
                  Don&apos;t have an account yet?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("register")}
                    className="font-medium text-slate-900 underline hover:text-slate-700"
                  >
                    Create an account
                  </button>
                </p>
              </form>
            ) : (
              /* =====================================================
                 CREATE ACCOUNT FORM
              ===================================================== */
              <form
                onSubmit={handleRegister}
                className="space-y-4"
                noValidate
              >
                {/* Role Picker */}
                <div>
                  <span className="mb-1.5 block text-xs font-medium text-slate-700">
                    Role
                  </span>

                  <div className="grid grid-cols-3 gap-2">
                    {ROLES.map((r) => {
                      const isSelected = regRole === r.role;
                      const Icon = r.icon;

                      return (
                        <button
                          key={r.role}
                          type="button"
                          onClick={() => handleRoleChange(r.role)}
                          className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors ${
                            isSelected
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span>{r.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <p className="mt-1.5 text-[11px] text-slate-500">
                    {currentRoleConfig.hint}
                  </p>
                </div>

                {/* Full Name */}
                <div>
                  <label
                    htmlFor="reg-name"
                    className="mb-1.5 block text-xs font-medium text-slate-700"
                  >
                    Full Name
                  </label>

                  <input
                    id="reg-name"
                    type="text"
                    value={regFullName}
                    onChange={(e) =>
                      setRegFullName(e.target.value)
                    }
                    placeholder="e.g. Ayesha Rahman"
                    disabled={loading}
                    autoComplete="name"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:opacity-60"
                  />
                </div>

                {/* Campus ID */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label
                      htmlFor="reg-campus-id"
                      className="text-xs font-medium text-slate-700"
                    >
                      Campus ID
                    </label>

                    {!regCampusId.startsWith(
                      currentRoleConfig.prefix
                    ) && (
                      <button
                        type="button"
                        onClick={() =>
                          setRegCampusId(
                            `${currentRoleConfig.prefix}${regCampusId.replace(
                              /^(STU-|DR-|ADM-)/i,
                              ""
                            )}`
                          )
                        }
                        className="text-[11px] text-slate-500 underline hover:text-slate-900"
                      >
                        Prefix with {currentRoleConfig.prefix}
                      </button>
                    )}
                  </div>

                  <input
                    id="reg-campus-id"
                    type="text"
                    value={regCampusId}
                    onChange={(e) =>
                      setRegCampusId(
                        e.target.value.toUpperCase()
                      )
                    }
                    placeholder={currentRoleConfig.placeholder}
                    disabled={loading}
                    autoComplete="username"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-mono text-sm uppercase text-slate-900 placeholder:font-sans placeholder:normal-case placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:opacity-60"
                  />
                </div>

                {/* Password & Confirm */}
                <div className="grid gap-3 sm:grid-cols-2">

                  {/* Password */}
                  <div>
                    <label
                      htmlFor="reg-pw"
                      className="mb-1.5 block text-xs font-medium text-slate-700"
                    >
                      Password
                    </label>

                    <div className="relative">
                      <input
                        id="reg-pw"
                        type={
                          regShowPassword
                            ? "text"
                            : "password"
                        }
                        value={regPassword}
                        onChange={(e) =>
                          setRegPassword(e.target.value)
                        }
                        placeholder="Min 6 chars"
                        disabled={loading}
                        autoComplete="new-password"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:opacity-60"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setRegShowPassword((v) => !v)
                        }
                        className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600"
                        aria-label={
                          regShowPassword
                            ? "Hide password"
                            : "Show password"
                        }
                      >
                        {regShowPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label
                      htmlFor="reg-confirm-pw"
                      className="mb-1.5 block text-xs font-medium text-slate-700"
                    >
                      Confirm Password
                    </label>

                    <div className="relative">
                      <input
                        id="reg-confirm-pw"
                        type={
                          regShowConfirmPassword
                            ? "text"
                            : "password"
                        }
                        value={regConfirmPassword}
                        onChange={(e) =>
                          setRegConfirmPassword(
                            e.target.value
                          )
                        }
                        placeholder="Repeat password"
                        disabled={loading}
                        autoComplete="new-password"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:opacity-60"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setRegShowConfirmPassword(
                            (v) => !v
                          )
                        }
                        className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600"
                        aria-label={
                          regShowConfirmPassword
                            ? "Hide password"
                            : "Show password"
                        }
                      >
                        {regShowConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Validation */}
                {(regPassword.length > 0 ||
                  regConfirmPassword.length > 0) && (
                  <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[11px]">

                    <span
                      className={`inline-flex items-center gap-1 font-medium ${
                        isMinLength
                          ? "text-emerald-700"
                          : "text-slate-400"
                      }`}
                    >
                      <Check className="h-3 w-3" />
                      6+ characters
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 font-medium ${
                        isPasswordMatch
                          ? "text-emerald-700"
                          : isPasswordMismatch
                            ? "text-red-600"
                            : "text-slate-400"
                      }`}
                    >
                      <CheckCircle2 className="h-3 w-3" />

                      {isPasswordMismatch
                        ? "Passwords do not match"
                        : "Passwords match"}
                    </span>
                  </div>
                )}

                {/* Register Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating account...
                    </span>
                  ) : (
                    `Create ${currentRoleConfig.label} account`
                  )}
                </button>

                {/* Login Link */}
                <p className="pt-1 text-center text-xs text-slate-500">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="font-medium text-slate-900 underline hover:text-slate-700"
                  >
                    Sign in here
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-5xl items-center justify-center rounded-2xl border border-slate-200 bg-white p-16 shadow-xs">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}