# MediQueue — Project Roadmap & Task Delegation

**Project Lead & Full-Stack Architect:** Ifaz Md Zahin  
**Application:** MediQueue — Campus Clinic Appointment & Priority Triage System  
**Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Supabase (PostgreSQL, Auth, RLS), Node.js Crypto (AES-256-GCM)  
**Context:** University / Coursework Project (Practical, Clean, and Manageable)

---

## 1. Project Overview & Architecture Status

The entire core full-stack system has been designed and implemented end-to-end by **Ifaz Md Zahin**, encompassing:
1. **Full Backend:**
   - Supabase database schema (`schema.sql`) with custom enums, RLS policies, and immutable triggers.
   - Server-side REST API route handlers (`/api/auth/*`, `/api/appointments/*`, `/api/audit`, `/api/seed`).
   - Server-side deterministic triage engine validation (`lib/triage.ts`).
   - Real field-level AES-256-GCM encryption for confidential clinical notes (`lib/server/crypto.ts`).
   - Append-only, database-enforced immutable audit trail (`lib/server/audit.ts`).
   - Server session management and request proxy (`proxy.ts`, `lib/server/session.ts`, `lib/supabase/*`).
2. **Full Frontend:**
   - Universal responsive layout, navbar with dynamic role contexts, and footer branding.
   - Comprehensive authentication UI (`app/login/page.tsx`) with role routing and demo quick-fill.
   - Student Portal (`app/student/page.tsx`) with dynamic symptom selection, severity weighting, live triage preview, slot selection, and status stepper.
   - Doctor Consultation Dashboard (`app/doctor/page.tsx`) with priority queue sorting, lifecycle status progression, and encrypted clinical note management.
   - Admin & Audit Control Center (`app/admin/page.tsx`) with privacy-preserving metadata projection, immutable audit log table, and demo database reset.
   - Centralized React state management layer (`lib/store.tsx`).

---

## 2. Team Member Delegation & Workstreams

To keep the project simple, collaborative, and tailored for a university course project, team tasks are structured cleanly without unnecessary cloud/DevOps complexity.

```
                               ┌──────────────────────────────────────────────┐
                               │             Ifaz Md Zahin (Lead)             │
                               │       Full Backend & Frontend Architect      │
                               └──────────────────────┬───────────────────────┘
                                                      │
         ┌────────────────────────────────────────────┼────────────────────────────────────────────┐
         ▼                                            ▼                                            ▼
┌─────────────────────────────────┐   ┌─────────────────────────────────┐   ┌─────────────────────────────────┐
│            Member 1             │   │            Member 2             │   │            Member 3             │
│   QA, Testing & Verification    │   │    UI Polish, Search & Clinic   │   │    Technical Documentation,     │
│        (Testing & Cases)        │   │       Statistics Dashboard      │   │    Report & Presentation Deck   │
└─────────────────────────────────┘   └─────────────────────────────────┘   └─────────────────────────────────┘
```

---

## Member 1 — QA, Automated Testing & Verification

**Owner:** Member 1  
**Track:** Quality Assurance & Testing  
**Branch:** `feature/qa-testing`  
**Goal:** Verify system logic, test the triage calculation with boundary inputs, and ensure data integrity across user roles.

### Tasks
- [ ] **Triage Engine Test Cases (`lib/triage.ts`):**
  - Verify boundary scores: exact threshold triggers for `High` ($\ge 25$), `Medium` ($\ge 15$), and `Low` ($< 15$).
  - Test keyword matching variations (e.g., uppercase `"CHEST PAIN"`, `"shortness of breath"`).
  - Verify severity limits ($1 \le \text{severity} \le 10$).
- [ ] **Cryptographic Encryption Verification (`lib/server/crypto.ts`):**
  - Verify round-trip AES-256-GCM encryption and decryption.
  - Assert modified/corrupted ciphertext fails gracefully without leaking secrets.
- [ ] **Role-Based Access (RBAC) Verification:**
  - Verify students cannot see other students' appointments.
  - Verify students and administrators receive `403 Forbidden` if attempting to access doctor endpoints.
  - Verify admin appointment list does not contain clinical complaints or notes.
- [ ] **Manual Test Plan & Scenario Checklist:**
  - Create a test scenario document testing all 3 user roles:
    1. Student signs in $\rightarrow$ inputs symptoms $\rightarrow$ books slot.
    2. Doctor signs in $\rightarrow$ views sorted queue $\rightarrow$ writes encrypted notes $\rightarrow$ completes consultation.
    3. Admin signs in $\rightarrow$ reviews audit log $\rightarrow$ verifies immutability.

### Acceptance Criteria
- Triage test functions execute and pass all boundary scenarios.
- Written QA test sheet confirming zero security leaks between roles.

---

## Member 2 — UI Polish, Queue Search & Clinic Statistics

**Owner:** Member 2  
**Track:** Frontend Features, Search/Filter & Clinic Stats  
**Branch:** `feature/ui-stats-filter`  
**Goal:** Make the doctor and admin portals more interactive with patient search, urgency filters, visual clinic statistics, and mobile styling adjustments.

### Tasks
- [ ] **Doctor Queue Patient Search & Filter:**
  - Add a search input bar on the Doctor Dashboard (`app/doctor/page.tsx`) to filter patients by Student ID or chief complaint.
  - Add an urgency filter dropdown (`All`, `High`, `Medium`, `Low`) to quickly view specific patient groups.
- [ ] **Clinic Summary Stats Cards:**
  - Add simple statistical metric cards at the top of the Doctor and Admin pages:
    - *Total Appointments Today*
    - *High Priority Cases Count*
    - *Active in Queue vs. Completed*
    - *Average Severity Score*
  - Derived simply from the existing `appointments` array in `lib/store.tsx`.
- [ ] **User Feedback & Confirmation Modals:**
  - Add a confirmation popup modal when a doctor clicks to mark an appointment as `Completed`.
  - Add a confirmation prompt before resetting demo data on the admin page.
  - Add a temporary success notification toast or banner when an appointment is booked.
- [ ] **Mobile Responsiveness Polish:**
  - Ensure the appointment tables collapse cleanly into easy-to-read cards on mobile/tablet viewports.
  - Ensure touch targets and button spacing work comfortably on small screens.
- [ ] **Print Daily Schedule View:**
  - Add a "Print Schedule" button on the Doctor Dashboard that triggers a clean `window.print()` view of the day's patient queue.

### Acceptance Criteria
- Search and filter controls filter the patient list in real time without refreshing the page.
- Summary statistics cards accurately calculate counts from the appointments list.
- Responsive mobile view renders cleanly on simulated phone displays.

---

## Member 3 — Technical Documentation, Security Audit & UI/UX Compliance

**Owner:** Member 3  
**Track:** Documentation, Presentation & Compliance  
**Branch:** `feature/docs-presentation`  
**Goal:** Author the project documentation, prepare the university slide deck, document security/privacy compliance, and record the demo presentation.

### Tasks
- [ ] **Project Documentation & User Manual:**
  - Update `README.md` with project setup instructions, feature overview, and screenshots.
  - Write a step-by-step User Manual explaining how Students, Doctors, and Admins use the system.
  - Include an architecture diagram illustrating the flow between Client, API, and Supabase Database.
- [ ] **Security & Privacy Analysis Report:**
  - Write a brief compliance report explaining how MediQueue protects patient health data:
    - Password authentication and campus ID mapping.
    - Field-level AES-256-GCM encryption of clinical notes.
    - Immutable audit logs via PostgreSQL triggers preventing tampering.
    - Role-based privacy (admins cannot view clinical complaints).
- [ ] **Presentation Slide Deck:**
  - Prepare a concise slide deck (Google Slides or PowerPoint / PDF) for the course presentation:
    - Slide 1: Title, Team Members, and Project Purpose.
    - Slide 2: Problem Statement (Campus clinic overcrowding and lack of priority triage).
    - Slide 3: Solution Architecture & Technology Stack.
    - Slide 4: Deterministic Triage Engine Math & Urgency Levels.
    - Slide 5: Security, Encryption & Audit Trails.
    - Slide 6: Live Demo Walkthrough.
- [ ] **Demo Video / Walkthrough Script:**
  - Create a 3–5 minute presentation script or recorded video demonstration showing all 3 user roles working in real time.

### Acceptance Criteria
- Complete, polished documentation in `README.md` and user manual.
- Ready-to-present slide deck for the university evaluation.
- Security and compliance report explaining system protections.

---

## 3. Shared Quickstart & Verification Commands

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
# Copy .env.example to .env.local and populate Supabase keys

# 3. Seed demo accounts & appointments
npm run dev
# In another terminal:
curl -X POST http://localhost:3000/api/seed

# 4. Run quality checks
npx tsc --noEmit
npm run lint
npm run build
```

### Demo Accounts Reference
| Role | Campus ID | Password | Portal Route | Key Capability |
| :--- | :--- | :--- | :--- | :--- |
| **Student** | `STU-2021-045` | `student123` | `/student` | Symptom intake, live triage score, slot booking |
| **Doctor** | `DR-1001` | `doctor123` | `/doctor` | Priority queue, status progression, encrypted notes |
| **Admin** | `ADM-001` | `admin123` | `/admin` | Metadata queue, immutable audit log, data reset |

---

## 4. Git Workflow & Definition of Done

1. Every member creates their branch from `main`:
   ```bash
   git checkout main && git pull origin main
   git checkout -b feature/<your-workstream>
   ```
2. Make clean, descriptive commits (`feat: ...`, `test: ...`, `docs: ...`).
3. Push branch and open a GitHub Pull Request into `main`.
4. Request review from **Ifaz Md Zahin**.
5. Ensure `npx tsc --noEmit` and `npm run lint` pass before merging.
