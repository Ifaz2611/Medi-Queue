Got it — I’ll clean up the grammar, break the content into clear sections, and organize it so it’s easier to digest. Here’s a structured version of your **limitation.md** file:

---

# MediQueue Limitations

Before addressing these limitations, there should be a **group meeting** to decide how to solve each issue and assign responsibilities.

---

## Memebers -- ---------

1. Ifaz Md Zahin - Project Lead 
2. Mirza Rafi ---
3. Taousif ---
4. Kazi --- 






## 1. Security and Privacy Risks

- **Unprotected Reset Route**  
  - `POST /api/seed` can reset the system without authentication.  
  - `?reset=true` deletes all appointments and reseeds demo data.  
  - This is destructive if deployed outside a demo environment.

- **Public Role Assignment**  
  - Registration allows users to select roles (`doctor`, `admin`, `patient`) without verification.  
  - Accounts are confirmed without campus identity checks or invitations.

- **Broad RLS Policy**  
  - `users_update_self` lets users update their own row without column restrictions.  
  - Users could change sensitive fields like role or campus ID.

- **Weak Encryption Defaults**  
  - If `FIELD_ENCRYPTION_KEY` is unset, a hard-coded fallback (`mediqueue-dev-field-key-change-me`) is used.  
  - No startup check enforces strong production keys.

- **Demo Credentials Exposed**  
  - Demo accounts are shown on the login page.  
  - Keeping them enabled in production exposes known accounts and sample records.

- **Unreliable Audit Logging**  
  - `writeAudit` ignores database errors, so logs may be lost.  
  - Any authenticated user can insert audit rows without verification.  
  - Logs are not tamper-proof against privileged operators.

- **Weak Authentication Flow**  
  - No rate limiting, password reset, or account recovery.  
  - Passwords require only six characters.  
  - No campus account verification.

---

## 2. Clinical Workflow and Booking Limits

- **Simplistic Triage System**  
  - Uses fixed weights and keyword matches.  
  - Cannot handle negation (e.g., “no chest pain”).  
  - No clinician override or emergency guidance.

- **Rigid Booking System**  
  - UI offers fixed daily slots.  
  - API accepts any non-empty string without validation.  
  - Bookings use UTC date, which may differ from local clinic time.

- **Missing Appointment Management**  
  - No cancellation, rescheduling, or future-date booking.  
  - Appointments are created only for the current day.

- **Concurrent Booking Errors**  
  - Race conditions cause server errors instead of clear “slot already booked” messages.

- **Unrestricted Status Changes**  
  - Doctors can set any status for any appointment.  
  - No enforced lifecycle or doctor assignment.

---

## 3. Usability, Scale, and Completeness

- **Incomplete Dashboard Features**  
  - Missing patient search, urgency filtering, clinic statistics, confirmation prompts, print schedule, and mobile polish.

- **Poor Data Refresh and Error Handling**  
  - In-memory store does not refresh in real time.  
  - UI may show success even when API requests fail.

- **Limited Scalability**  
  - Appointment queries are unpaginated.  
  - Audit endpoint returns only 200 records, with no filters.  
  - Appointment dates are stored but not mapped to client models.


---

## 4. Engineering and Operations

- **No Automated Testing**  
  - No test suite for triage, role isolation, booking races, encryption, or audit behavior.

- **Missing Deployment Procedures**  
  - No CI/CD workflow, monitoring, backup/restore, or key management.  
  - No rotation process for production keys.


---