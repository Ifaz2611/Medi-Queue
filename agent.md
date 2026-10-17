# MediQueue — AI Agent & Developer Operational Guide (`agent.md`)

Welcome to the **MediQueue** codebase. This file serves as the definitive reference manual for AI agents (and human contributors) operating on this repository. Always review these guidelines, architecture maps, and architectural invariants before proposing or executing code changes.

---

## 1. Project Context & Team Structure

- **System Name:** MediQueue — Campus Clinic Appointment & Priority Triage System
- **Domain:** Healthcare Management, Clinical Intake, Priority Queueing & Secure Audit Trails
- **Lead Developer & Full-Stack Architect:** **Ifaz Md Zahin**
  - **Ownership:** Full backend architecture, database schema, API route handlers, business logic, security layers, client state management, and all frontend portals.
- **Collaborator / Member Roles:**
  - **Member 1:** QA Engineering, Test Scenarios & Logic Verification
  - **Member 2:** Frontend Features, Patient Search/Filter & Clinic Statistics Dashboard
  - **Member 3:** Technical Documentation, Compliance Report & Presentation Deck

---

## 2. Technology Stack & System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MediQueue Application                           │
├────────────────────────────────────────────────────────────────────────┤
│ Frontend (Client Layer)                                                │
│  • Next.js 16.4.2 App Router (Turbopack, React 19.3)                   │
│  • Tailwind CSS v4 + Lucide React Icons                                │
│  • Client Store: lib/store.tsx (Context + lightweight caching)          │
│  • Portals: /student (Intake), /doctor (Queue/Notes), /admin (Audit)  │
├────────────────────────────────────────────────────────────────────────┤
│ Middleware / Proxy Layer                                               │
│  • proxy.ts (Next.js 16 session refresh via lib/supabase/middleware)   │
├────────────────────────────────────────────────────────────────────────┤
│ Backend (Server / API Route Handlers)                                  │
│  • /api/auth/*        — Campus ID to Supabase Auth mapping             │
│  • /api/appointments  — Server-side triage & conflict-free booking     │
│  • /api/audit         — Immutable audit logging & admin queries        │
│  • /api/seed          — Seed demo accounts & sample data               │
├────────────────────────────────────────────────────────────────────────┤
│ Security & Business Logic                                              │
│  • lib/triage.ts        — Pure deterministic triage engine             │
│  • lib/server/crypto.ts — AES-256-GCM clinical notes encryption        │
│  • lib/server/audit.ts  — Append-only audit logger                     │
│  • lib/queue.ts         — Priority queue comparator                    │
├────────────────────────────────────────────────────────────────────────┤
│ Persistence Layer                                                      │
│  • Supabase (PostgreSQL 15+) with Row-Level Security (RLS)             │
│  • schema.sql: Triggers, partial unique indexes, custom enums          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Directory Map & File Responsibilities

| Path | Purpose | Environment |
| :--- | :--- | :--- |
| `app/layout.tsx` | Global HTML shell, fonts (`Geist`), StoreProvider wrapper | Server/Client |
| `app/page.tsx` | Root landing page with role-based automatic redirection | Client |
| `app/login/page.tsx` | Authentication screen (Sign In & Register tabs), demo cards, error banners | Client |
| `app/student/page.tsx` | Symptom checklist, severity slider, live score, slot booking | Client |
| `app/doctor/page.tsx` | Priority sorted queue, consultation status stepper, encrypted notes | Client |
| `app/admin/page.tsx` | Queue metadata view (privacy-preserved), audit log, reset button | Client |
| `app/api/auth/login/route.ts` | Authenticates campus ID via Supabase Auth email alias | Server |
| `app/api/auth/register/route.ts` | Registers new campus user, establishes cookie session & audit log | Server |
| `app/api/auth/logout/route.ts` | Signs user out and clears auth cookies | Server |
| `app/api/auth/session/route.ts`| Returns currently authenticated session user & role profile | Server |
| `app/api/appointments/route.ts`| GET (role-scoped list) & POST (triage & book slot) | Server |
| `app/api/appointments/[id]/route.ts` | PATCH (status changes & encrypted notes updates) | Server |
| `app/api/audit/route.ts` | GET (admin-only audit log reader) | Server |
| `app/api/seed/route.ts` | POST (seeds student/doctor/admin accounts & mock data) | Server |
| `components/*` | Reusable UI widgets: Card, Navbar, Footer, Stepper, Badges | Client |
| `lib/types.ts` | Shared domain TypeScript interfaces and enums | Universal |
| `lib/triage.ts` | Pure deterministic priority triage algorithm | Universal |
| `lib/queue.ts` | Sorts appointments by Urgency (High→Low), then slot time | Universal |
| `lib/store.tsx` | Central React Context store & API caller | Client |
| `lib/auth.ts` | Demo account credentials & role metadata | Universal |
| `lib/server/crypto.ts` | Field-level AES-256-GCM encryption for notes | Server-only |
| `lib/server/audit.ts` | Append-only audit log helper (`writeAudit`) | Server-only |
| `lib/server/mappers.ts`| Converts PostgreSQL snake_case rows to camelCase domain types | Server-only |
| `lib/server/session.ts`| Resolves current authenticated user from request cookies | Server-only |
| `lib/supabase/*` | Supabase SSR clients: `client.ts`, `server.ts`, `admin.ts` | Server/Client |
| `proxy.ts` | Next.js 16 root proxy / middleware for session cookies | Server |
| `schema.sql` | PostgreSQL DDL, triggers, indexes, and RLS policies | Database |

---

## 4. Fundamental Rules & System Invariants

Whenever an agent or developer modifies code, **these invariants must never be broken:**

### 1. Deterministic Triage Rule (FR-03)
- The formula is:
  $$\text{Score} = (w_k \times K) + (w_s \times S)$$
  where $w_k = 2.0$, $w_s = 1.5$, $K$ is symptom/keyword weights, and $S$ is severity ($1 \le S \le 10$).
- **Rule:** Never trust a client-supplied triage score or urgency. The server (`app/api/appointments/route.ts`) must always recompute the score deterministically using `triage(symptoms, severity, chiefComplaint)`.

### 2. Clinical Confidentiality & Field-Level Encryption (FR-04)
- Clinical consultation notes (`notes_encrypted`) must **always** be encrypted using AES-256-GCM (`lib/server/crypto.ts`) prior to storage in PostgreSQL.
- Ciphertext format: `enc:v2:<iv_b64>:<tag_b64>:<ciphertext_b64>`.
- Plaintext notes are **only ever returned to doctors** (`user.role === 'doctor'`).
- In `GET /api/appointments`, when the requester is an `admin`, all clinical fields (`chiefComplaint`, `symptoms`, `notes`, `notesEncrypted`) are stripped/blanked out. Admins only see scheduling metadata.

### 3. Audit Trail Immutability (FR-05)
- All audit actions are logged to `audit_logs`.
- PostgreSQL trigger `trg_audit_immutable` explicitly blocks any `UPDATE` or `DELETE` on `audit_logs`.
- In application code, `writeAudit(...)` is best-effort (`try/catch`) so auditing failures never crash user-facing requests.
- Only users with `role === 'admin'` can read audit logs (`GET /api/audit`).

### 4. Double Booking Prevention (FR-02)
- Database level: Unique partial index `appointments_slot_unique` on `(slot_date, slot_time)` where `status <> 'Completed'`.
- Application level: `POST /api/appointments` checks for existing non-completed slots on the same date and returns `409 Conflict`.

### 5. Server-Side Route & API Guarding (FR-01)
- Never rely solely on client-side components like `<RequireRole />`.
- All API handlers (`app/api/*`) must authenticate the user via `getSessionUser()` and verify `user.role` before executing privileged operations.

---

## 5. Development & Verification Workflow

### Common Commands
```bash
# Start Next.js Turbopack development server
npm run dev

# Seed or reset demo accounts and appointments
curl -X POST http://localhost:3000/api/seed

# Verify TypeScript types
npx tsc --noEmit

# Run ESLint
npm run lint

# Compile production build
npm run build
```

### Demo Accounts for Verification
| Role | ID | Password | Home Page |
| :--- | :--- | :--- | :--- |
| **Student** | `STU-2021-045` | `student123` | `/student` |
| **Doctor** | `DR-1001` | `doctor123` | `/doctor` |
| **Admin** | `ADM-001` | `admin123` | `/admin` |

---

## 6. Guidelines for AI Agents

1. **Maintain Type Integrity:** Strictly adhere to interfaces in `lib/types.ts`. Do not use `any` unless absolutely necessary with type guards.
2. **Server/Client Separation:** Ensure `"use client"` is only placed where React state/hooks are utilized. Never import server-only modules (`node:crypto`, `lib/server/*`, `lib/supabase/admin.ts`) into client components.
3. **Environment Security:** Never commit `.env.local` or expose `SUPABASE_SECRET_KEY` or `FIELD_ENCRYPTION_KEY` to client payloads.
4. **Preserve Documentation:** Keep comments explaining functional requirement markers (`FR-01` through `FR-05`).
5. **Pre-commit Sanity Check:** Always run `npx tsc --noEmit` and `npm run lint` before completing any task.
