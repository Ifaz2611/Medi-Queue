<div align="center">

# MediQueue
### Campus Clinic Appointment & Priority Triage System

*A clinical intake, deterministic priority queueing, and zero-trust healthcare management platform built for modern campus clinics.*

[![Next.js](https://img.shields.io/badge/Next.js-16.4.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_15+-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Security](https://img.shields.io/badge/Encryption-AES--256--GCM-critical?style=for-the-badge&logo=letsencrypt&logoColor=white)](#security--architectural-invariants)

[Overview](#-overview) • [Core Features](#-core-features) • [System Architecture](#-system-architecture) • [Quick Start](#-quick-start) • [Demo Credentials](#-demo-credentials) • [Team](#-team--ownership)

</div>

---

## Overview

**MediQueue** replaces traditional first-come, first-served campus clinic bottlenecks with an intelligent, deterministic **Priority Triage Engine**. Designed around strict clinical confidentiality and regulatory compliance, MediQueue ensures that high-acuity patients are prioritized automatically while safeguarding sensitive medical notes with server-side **AES-256-GCM field-level encryption** and **immutable PostgreSQL audit logs**.

---

## Core Features

### Three Dedicated Role Portals
* **Student Portal (`/student`):** Interactive symptom checklist, dynamic severity slider ($1\text{–}10$), live triage preview, and conflict-free appointment slot booking.
* **Doctor Portal (`/doctor`):** Real-time priority-sorted clinical queue (ordered by Urgency $\rightarrow$ Slot Time), consultation lifecycle stepper, and decrypted clinical notes workspace.
* **Admin Portal (`/admin`):** Privacy-preserved operational queue overview (all clinical data stripped at the API boundary), database seed/reset controls, and a tamper-proof security audit log viewer.

### Security & Architectural Invariants

| Req ID | Feature | Engineering Implementation |
| :--- | :--- | :--- |
| **FR-01** | **Server-Side Route & API Guarding** | Maps Campus IDs to Supabase Auth sessions via `proxy.ts` and `getSessionUser()`. Every `/api/*` route strictly verifies session validity and role permissions server-side. |
| **FR-02** | **Double-Booking Prevention** | Enforced at both the application layer (`409 Conflict` check) and the database layer via PostgreSQL partial unique index `appointments_slot_unique` on `(slot_date, slot_time) WHERE status <> 'Completed'`. |
| **FR-03** | **Deterministic Triage Engine** | Client-side scores are never trusted. `POST /api/appointments` recomputes urgency server-side via `lib/triage.ts` using weighted symptom keywords and severity scores. |
| **FR-04** | **Field-Level Clinical Encryption** | Consultation notes are encrypted prior to database persistence using **AES-256-GCM** (`enc:v2:<iv_b64>:<tag_b64>:<ciphertext_b64>`). Plaintext is only decrypted for authenticated doctors; admins receive stripped metadata. |
| **FR-05** | **Immutable Audit Trail** | Critical state mutations write to `audit_logs`. A PostgreSQL trigger (`trg_audit_immutable`) strictly blocks any `UPDATE` or `DELETE` operations on audit records. |

---

## Deterministic Triage Algorithm

Every intake submission is evaluated on the server using a deterministic priority formula:

$$\text{Score} = (w_k \times K) + (w_s \times S)$$

* **$w_k = 2.0$** — Symptom & chief-complaint keyword weight multiplier
* **$K$** — Cumulative clinical weight of selected symptoms and recognized high-risk keywords
* **$w_s = 1.5$** — Patient-reported severity multiplier
* **$S$** — Self-reported pain/distress severity scale ($1 \le S \le 10$)

Appointments in the Doctor Portal are automatically sorted by **Urgency Tier (`High` $\rightarrow$ `Medium` $\rightarrow$ `Low`)** first, and **Scheduled Slot Time** second.

---

## System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                         MediQueue Application                          │
├────────────────────────────────────────────────────────────────────────┤
│ Frontend (Client Layer)                                                │
│  • Next.js 16.4.2 App Router (Turbopack, React 19.3)                   │
│  • Tailwind CSS v4 + Lucide React Icons                                │
│  • Client Store: lib/store.tsx (Context + lightweight caching)         │
│  • Portals: /student (Intake), /doctor (Queue/Notes), /admin (Audit)   │
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

## Project Structure

```text
├── app/
│   ├── layout.tsx                  # Global shell, Geist fonts & StoreProvider
│   ├── page.tsx                    # Root landing with role-based redirection
│   ├── login/page.tsx              # Sign In, Registration & quick demo login cards
│   ├── student/page.tsx            # Student intake, live triage & slot booking
│   ├── doctor/page.tsx             # Priority queue, status stepper & encrypted notes
│   ├── admin/page.tsx              # Privacy-safe queue metadata & audit log viewer
│   └── api/
│       ├── auth/                   # login, register, logout, and session endpoints
│       ├── appointments/           # Role-scoped GET, triage POST & [id] PATCH
│       ├── audit/route.ts          # Admin-only audit trail reader
│       └── seed/route.ts           # Demo environment seeder & reset handler
├── components/                     # Reusable UI primitives (Navbar, Stepper, Badges)
├── lib/
│   ├── types.ts                    # Shared domain TypeScript interfaces & enums
│   ├── triage.ts                   # Deterministic triage scoring algorithm
│   ├── queue.ts                    # Priority queue comparator (Urgency → Slot Time)
│   ├── store.tsx                   # Central React Context state & API client
│   ├── auth.ts                     # Demo account definitions & role metadata
│   ├── supabase/                   # SSR Supabase clients (client, server, admin)
│   └── server/
│       ├── crypto.ts               # Server-only AES-256-GCM encryption/decryption
│       ├── audit.ts                # Append-only writeAudit() helper
│       ├── mappers.ts              # PostgreSQL snake_case to camelCase mappers
│       └── session.ts              # Cookie-based session & role resolver
├── proxy.ts                        # Next.js 16 session refresh middleware
└── schema.sql                      # PostgreSQL DDL, RLS policies & immutability triggers
```

---

## Quick Start

### 1. Prerequisites
* **Node.js** `>= 20.x`
* A **Supabase** project (PostgreSQL 15+)

### 2. Installation & Database Setup
Clone the repository and install dependencies:

```bash
git clone <your-repo-url>
cd mediqueue
npm install
```

Execute `schema.sql` inside your **Supabase SQL Editor** to provision tables, custom enums, partial unique indexes, Row-Level Security (RLS) policies, and the `trg_audit_immutable` trigger.

### 3. Environment Configuration
Create a `.env.local` file in the root directory (never commit this file):

```env
NEXT_PUBLIC_SUPABASE_URL=[https://your-project-id.supabase.co](https://your-project-id.supabase.co)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SECRET_KEY=your-service-role-secret-key
FIELD_ENCRYPTION_KEY=your-64-char-hex-or-32-byte-base64-aes-256-key
```

### 4. Run the Development Server
```bash
npm run dev
```

### 5. Seed Demo Accounts & Sample Data
With the dev server running on `http://localhost:3000`, seed the initial accounts and sample appointments:

```bash
curl -X POST http://localhost:3000/api/seed
```

---

## Demo Credentials

Use these pre-configured accounts on `/login` (or click the quick-fill demo cards in the UI) to test role isolation and workflows:

| Role | Campus ID | Password | Default Portal | Key Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Student** | `STU-2021-045` | `student123` | `/student` | Submit symptoms, view triage score, book available slots |
| **Doctor** | `DR-1001` | `doctor123` | `/doctor` | Manage priority queue, advance status, write AES-256-GCM notes |
| **Admin** | `ADM-001` | `admin123` | `/admin` | Inspect immutable audit logs, view anonymized queue, reset data |

---

## Quality Assurance & Verification

Run the unit tests with **Node.js 22.19 or later** (native TypeScript support):

```bash
npm test
```

These tests run without Supabase or `.env.local`. They cover urgency thresholds,
symptom weights, case-insensitive complaint keywords, and valid/invalid severity values,
plus AES-256-GCM round trips, independent cipher compatibility, fresh IVs, and corrupted notes.
The triage engine throws `RangeError` for non-finite severity or values outside 1–10.
Encryption tests use a temporary QA-only key and restore the process environment after import.
Run only the encryption suite with `npm run test:crypto`. Malformed, unsupported-version,
or unauthenticated `enc:` notes return an empty string without logging sensitive details;
existing legacy plaintext notes still pass through.
On Windows PowerShell, use `npm.cmd test` if script execution policy blocks `npm.ps1`.

Run the role-based API verification separately with `npm run test:rbac`.
Its 22 tests execute the actual appointment and audit handlers with simulated
sessions and an in-memory database, checking student isolation, doctor-only
updates, admin clinical-data redaction, and unauthenticated requests. The full
`npm test` command also includes these tests. See the
[RBAC QA sheet](docs/qa/rbac-verification.md) for results and the limits of this
verification, including database-policy and role-assignment concerns found in
source review. These tests do not connect to Supabase or load `.env.local`.

For browser and live database verification, use the
[manual test plan and execution checklist](docs/qa/manual-test-plan.md).
It covers Student booking, Doctor queue/notes/completion, Admin audit review,
and rollback-only audit mutation probes. Manual results are pending; record
evidence before treating those workflows as verified.

Before opening a pull request or deploying, run the verification suite:

```bash
# Type-check across client and server modules
npx tsc --noEmit

# Run ESLint checks
npm run lint

# Verify production build compilation
npm run build
```

---

## Team & Ownership

* **Ifaz Md Zahin** — *Lead Developer & Full-Stack Architect*
  * End-to-end system architecture, PostgreSQL schema & triggers, API route handlers, deterministic triage & AES-256-GCM security layers, client state management, and role portals.
* **Member 1 - Mirza ** — *QA Engineering, Test Scenarios & Logic Verification*
* **Member 2 - Tausif ** — *Frontend Features, Patient Search/Filter & Clinic Statistics Dashboard*
* **Member 3 - Kazi ** — *Technical Documentation, Compliance Report & Presentation Deck*

---

<div align="center">
  <sub>Built with heart for safer, faster, and privacy-first campus healthcare.</sub>
</div>
