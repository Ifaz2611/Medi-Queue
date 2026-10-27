# Member 1, Task 4: Manual Test Plan & Scenario Checklist

Prepared: 2026-10-25 (Asia/Dhaka). Scope: Student intake and booking, Doctor
queue and consultation, and Admin audit review and database immutability.

This is an executable test plan, not a completed test run. All cases start as
**Not run**. Source inspection and automated tests do not establish a browser
or live Supabase pass. Record actual results and evidence before signing off.

## Run record and result rules

| Field | Value to record |
| --- | --- |
| Tester / date and time / timezone | Pending |
| Git commit / branch | Pending |
| Base URL / Supabase test project | Pending |
| Browser and version / OS / viewport | Pending |
| Setup and seed response | Pending |
| Student booking UUIDs / selected slots | Pending |
| Audit UUID used for mutation checks | Pending |
| Passed / failed / blocked / not run | Pending |
| Defect links / evidence directory | Pending |

Use **Pass** only when every expected result was observed; **Fail** for a
mismatch; **Blocked** when a prerequisite prevents execution; **Not run**
until attempted. For each case, record the actual behavior, HTTP status where
applicable, and an evidence filename or defect link in the execution checklist.
Use synthetic data. Evidence must omit session cookies, authorization headers,
keys, and real patient information.

## Preconditions and repeatable test data

1. Use a dedicated disposable Supabase test project with `schema.sql` applied.
   Have SQL Editor access for the storage and trigger checks. Do not reset a
   shared database to prepare this run.
2. Install dependencies with `npm install` (or `npm.cmd install` in PowerShell).
   Configure `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`),
   `SUPABASE_SECRET_KEY`, and a stable nonempty `FIELD_ENCRYPTION_KEY`.
   Keep server secrets out of browser code and evidence.
3. Start `npm run dev`; use `http://localhost:3000` unless another URL is
   recorded. Seed the disposable project once:

   ```powershell
   Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/api/seed'
   ```

   Expect `ok: true`. Seeding an empty project creates five appointments;
   seeding again preserves existing appointments and adds a seed audit event.
   If the dataset differs, record it and choose equivalent free slots.
4. Use separate browser profiles for each role. Multiple tabs or private
   windows may share cookies; verify the displayed identity before each case.
   Open Developer Tools > Network and inspect response bodies as well as UI.
5. Use these demo accounts on `/login`. Demo role buttons fill credentials;
   click **Sign in** to authenticate.

   | Role | Campus ID | Password | Expected route |
   | --- | --- | --- | --- |
   | Student A | `STU-2021-045` | `student123` | `/student` |
   | Doctor | `DR-1001` | `doctor123` | `/doctor` |
   | Admin | `ADM-001` | `admin123` | `/admin` |

6. Create a second synthetic **Student** via **Create an account**, using a
   unique campus ID such as `STU-QA-002` and a QA-only password of at least six
   characters. Record the account ID; confirm its assigned role is `student`.
   This is Student B. Do not use privileged self-registration to prepare staff.
7. Run the main workflow in order: S-01 through S-04, D-01 through D-05, then
   A-01 through A-04. Run additional cases afterward. Refresh each role's page
   after another role changes data: the store does not subscribe to live updates.
   Keep the run within one UTC date because booking/seed use UTC dates; record
   the local date too. The list API includes historical records, so a fresh
   dataset avoids confusing queue order and slot availability.

### Booking fixtures

Use complaint `QA visit alpha` with no clinical keywords for the three main
bookings. This avoids counting a keyword in both the complaint and checkboxes.
`P = 2K + 1.5S`. Record the real UUID returned by each booking; seed labels such
as `APT-1001` are not API resource IDs.

| Reference | Selected symptoms | Severity S | K | Expected score / urgency | Suggested slot |
| --- | --- | --- | --- | --- | --- |
| L | None | 2 | 0 | 3 / Low | `11:30` |
| M | High Fever | 5 | 6 | 19.5 / Medium | `13:00` |
| H | Chest Pain | 4 | 10 | 26 / High | `13:30` |

These later High/Medium slots intentionally test priority over arrival time.
On an untouched seeded dataset, `11:30`, `13:00`, and `13:30` are free. Student
A's view cannot show other students' occupancy; the server conflict response
is authoritative. If a suggested slot conflicts, record it and select another
free non-priority slot while preserving L < M < H slot order.

## Student: sign in, enter symptoms, book a slot

| ID | Steps | Expected result |
| --- | --- | --- |
| S-01 | Sign in as Student A. Confirm the route and Campus ID. Reload. | `/student`, **Student Portal**, and `STU-2021-045` appear; the session survives reload; `GET /api/appointments` returns 200 and only A's records. |
| S-02 | Enter fixture L. Move the severity slider between 1 and 10, then back to 2. Toggle a symptom on and off. Click **Confirm Booking** without choosing a slot. | The score and urgency update with each change; slider endpoints are 1 and 10. No booking request is sent without a selection; **Please select a time slot.** appears. At L, score is 3 / Low. |
| S-03 | Select `11:30` and click **Confirm Booking**. Save the UUID as L. Reload. | POST returns 200 with `ok: true`, A's identity, score 3, urgency Low, slot `11:30`, and status Scheduled. **Appointment confirmed** and **My Appointments** show L. The complaint, symptoms, and slot selection reset; the severity remains unchanged. L persists after reload and its occupied slot is disabled for A. |
| S-04 | Repeat booking with fixtures M and H. Record each UUID and response. | Both POSTs return 200 with the fixture's score, urgency, and slot. Each starts Scheduled; all three records persist. H sorts before M before L in A's list, even though H's slot is latest. |
| S-05 | Sign in as Student B in another profile. Create a synthetic booking in a different free slot, then inspect both students' UI and GET response bodies after refresh. | Every record returned to A has A's ID; every record returned to B has B's ID. Neither response nor UI contains the other student's UUID, complaint, or notes. No plaintext `notes` is returned to either student. The current API can return ciphertext for a student's own record; record it separately from plaintext disclosure. |
| S-06 | As B, select a regular slot occupied by A (for example M before completion) and try to book. Inspect the response and reload as Doctor. | HTTP 409, `ok: false`, and **is already booked. Choose another slot.**; no confirmation card for this attempt and no second active record at that date/slot. A student may initially see another student's occupied slot as selectable because their list is scoped. |
| S-07 | Without booking, enter complaint `CHEST PAIN`, no symptoms, severity 4; then `shortness of breath`, no symptoms, severity 6. Clear the form afterward. | First preview: K=10, score 26 / High. Second: K=8, score 25 / High. Available priority slots `09:00` and `09:30` unlock only for High; occupied slots remain disabled. Low/Medium leave priority slots locked. This checks the UI restriction only. |

## Doctor: sorted queue, encrypted notes, complete consultation

| ID | Steps | Expected result |
| --- | --- | --- |
| D-01 | Sign in as Doctor. Select **All**, then **Active**. Inspect the entire queue, including L, M, and H. | `/doctor` and **Doctor Dashboard** appear. High records precede Medium, then Low; within each tier, slot strings ascend. H precedes M precedes L. Active excludes Completed; All includes them. Existing seeded rows participate in this ordering. |
| D-02 | Select H by its recorded UUID and click **Start Consultation**. Reload and select H again. | Complaint, selected symptoms, severity 4, score 26, and High match H. PATCH returns 200, status becomes In-Consultation, and the lifecycle stepper updates persistently. **Start Consultation** is disabled for this status. |
| D-03 | Enter `QA-NOTE-ALPHA: synthetic follow-up only.` in **Clinical Notes** and click **Save Notes**. Inspect PATCH, reload, and select H. | PATCH returns 200 with `ok: true`; **Saved & encrypted** appears temporarily. The exact plaintext is restored after reload, only for Doctor. `notesEncrypted` has format `enc:v2:<iv>:<tag>:<ciphertext>` and does not contain the marker. Verify database storage below; the badge alone is insufficient. |
| D-04 | In the test project's SQL Editor, run the storage query below using H's UUID. Save the same note again, then rerun it. | `notes_encrypted` starts `enc:v2:` and contains no literal note marker. The second save produces different ciphertext, while Doctor still reads the same plaintext after reload. No encryption key appears in API responses. The UI's existing “(simulated)” caption is stale; evaluate actual storage, not that caption. |
| D-05 | Click **Mark Completed** on H. Select **Active**, then **Completed**, and refresh A's portal. | PATCH returns 200; status persists as Completed; H leaves Active and appears in Completed. Both status action buttons are disabled on H. Doctor's **In queue** and **High priority** counts each decrease by one relative to the pre-completion baseline, absent concurrent changes. A's stepper shows Completed after reload. |
| D-06 | After completion, refresh A's portal and book H's former slot again with a valid fixture. Record the new UUID. | Completed H remains in history; its slot is available again and a new Scheduled booking succeeds. Exactly one non-Completed appointment occupies the same date/slot. |

Storage query (replace the placeholder with the actual UUID):

```sql
select id, status, notes_encrypted,
       notes_encrypted like 'enc:v2:%' as versioned_ciphertext,
       position('QA-NOTE-ALPHA' in coalesce(notes_encrypted, '')) = 0
         as no_literal_note_marker
from public.appointments
where id = '<H-appointment-uuid>'::uuid;
```

Expect exactly one row, with both boolean checks true. This checks the saved
fixture at rest; the [crypto suite](../../tests/crypto.test.mjs) separately
checks authenticated encryption and corruption handling.

## Admin: review audit log and verify immutability

| ID | Steps | Expected result |
| --- | --- | --- |
| A-01 | Sign in as Admin after the Student/Doctor workflow. Inspect **Appointment Queue (metadata)** and the raw `GET /api/appointments` response. | `/admin` and **Admin / Audit** appear; the table shows Student ID, Slot Time, Status, and Priority. Response is 200; `chiefComplaint` and `notesEncrypted` are empty strings, `symptoms` is empty, and plaintext `notes` is absent. Search the response for both synthetic markers: neither is present. Record severity exposure separately under Known source observations. |
| A-02 | In **Immutable Audit Log**, find H's booking, triage, consultation start, note save, and completion events using H's UUID. Compare against captured network requests. | `GET /api/audit` returns 200. Entries appear newest first, with timestamp, correct actor ID/role, action, resource UUID, and IP value. Expect `Slot Booked`, `Appointment Triaged (High, score 26)`, `Status Changed -> In-Consultation`, `Clinical Note Added`, and `Status Changed -> Completed`. A repeated note save creates another note event. No complaint or plaintext note content is logged. Compare IP with the recorded request/proxy context rather than assuming the tester's public IP. |
| A-03 | Check the log UI, then execute the two SQL mutation probes below against one recorded audit UUID. Refresh Admin afterward. | UI has no edit/delete controls. Both database probes fail with exactly `audit_logs is append-only (immutable)`, and the row remains unchanged. UI read-only behavior or an API 403 alone does not prove the trigger works. |
| A-04 | Requery the selected audit UUID after both rollbacks and compare every column with the baseline. Refresh the Admin page. | Exactly the original row is present with identical values. Other workflow events remain. Admin API shows only the newest 200 entries; use the UUID query for older records rather than treating pagination limits as deletion. |
| A-05 | Optional, last: in the disposable project only, capture selected old audit rows and appointment IDs, then click **Reset demo data**. Refresh. | `/api/seed?reset=true` returns `ok: true`; current appointments are replaced by five seed records. Old audit rows retain their values and a `Demo Data Seeded` event is added. Do not expect audit history to be wiped. The current reset button has no confirmation prompt. |

### Database mutation probes for A-03 and A-04

Use a database-owner SQL Editor session on the disposable project so RLS or
missing grants do not hide whether the trigger fires. First select a real row
and copy its UUID and all column values as the baseline:

```sql
select * from public.audit_logs order by timestamp desc limit 1;
```

Replace `<audit-uuid>` below with that existing UUID. Run UPDATE and DELETE
as **separate transactions**. The target must exist: zero affected rows is not
a pass. Each transaction must end with `ROLLBACK`, even if a missing trigger
allows the mutation. If the editor stops at an error, execute `ROLLBACK;`
separately before the next probe. Do not commit, disable triggers, or truncate.

```sql
begin;
select * from public.audit_logs where id = '<audit-uuid>'::uuid;
update public.audit_logs
set action = 'QA mutation probe'
where id = '<audit-uuid>'::uuid;
-- Expected ERROR: audit_logs is append-only (immutable)
rollback;
```

```sql
begin;
select * from public.audit_logs where id = '<audit-uuid>'::uuid;
delete from public.audit_logs where id = '<audit-uuid>'::uuid;
-- Expected ERROR: audit_logs is append-only (immutable)
rollback;
```

Then run `select * from public.audit_logs where id = '<audit-uuid>'::uuid;`
and compare with the baseline. Permission denied, a missing row, or a different
error is **Blocked/Fail**, not confirmation of the immutability trigger.

## Access, validation, and failure checks

For API cases, use same-origin Developer Tools `fetch` with the current
profile's cookies. Example: `fetch('/api/audit').then(async r =>
console.log(r.status, await r.json()))`. For a PATCH, add `method: 'PATCH'`,
`headers: {'Content-Type': 'application/json'}`, and
`body: JSON.stringify({status: 'Completed'})` to the options for
`/api/appointments/<recorded-uuid>`. Capture status and body; confirm stored
data after rejected writes. Do not copy session credentials into this document.

| ID | Steps | Expected result |
| --- | --- | --- |
| X-01 | In a signed-out profile, visit each portal and call GET appointments, GET audit, POST appointments, and PATCH H with valid JSON bodies. | Portals redirect to `/login`; API requests return 401. No appointment, note, or audit write results from these requests. |
| X-02 | As Student, visit `/doctor` and `/admin`; as Admin, visit `/doctor` and `/student`; as Doctor, visit `/student` and `/admin`. | **Access denied** appears and the protected role UI does not render. This UI check is separate from server authorization. |
| X-03 | As Student and then Admin, PATCH H with `{status:"Completed"}`, `{notes:"QA rejected note"}`, and both fields together. Include a Student attempt against B's UUID. | Every request returns 403; Doctor reload shows no changes to the targeted records, and Admin finds no success audit events for these attempts. |
| X-04 | As Student and Doctor, GET `/api/audit`; as Doctor and Admin, POST `/api/appointments` with a valid fixture. | Each call returns 403, with no audit disclosure or booking creation. |
| X-05 | As Student, POST a fixture with no slot; then with an unused regular slot and severity 0, 11, and `"invalid"` separately. Finally submit a valid Low fixture plus forged `studentId`, `studentName`, `triageScore:999`, and `urgency:"High"` fields. | Missing slot/invalid severity return 400 without creating records. The valid forged request uses session identity and recomputes Low/score from intake; client-supplied identity and triage are ignored. Record the new UUID and slot to avoid later clashes. |
| X-06 | Sign out of each role; reload the protected route and use browser Back. Then sign in as another role in that same profile. | Protected content is not restored after sign-out. Role-scoped data reloads for the new identity; prior clinical notes or audit rows do not persist in the new role's UI or responses. |
| X-07 | As Doctor, edit a note and block the PATCH in Developer Tools; click **Save Notes**, then unblock and reload. Repeat for a status change. | Acceptance target: failures are visible and no success claim is made for an unsaved change; stored data remains unchanged. Current source may flash success despite failure (see below); record a defect if reproduced. |

## Known source observations to verify, not assumed passes

- Admin UI says severity is hidden, but the appointment API currently retains
  `severity` and `triageScore` in its response. Record this discrepancy in A-01;
  passing complaint/note redaction does not establish complete clinical privacy.
- Priority-slot reservation is enforced by the Student UI; the booking handler
  does not enforce High urgency for `09:00`/`09:30` or validate against `SLOTS`.
  S-07 must not be cited as proof of server enforcement.
- Doctor save/status methods do not propagate API failures to the UI, and the
  saved message is set after awaiting the request regardless of success. X-07
  is a failure-path acceptance check, not a claim that the current UI passes.
- The seed/reset route currently has no session/role guard. Its presence in the
  Admin UI does not make the endpoint admin-only. This plan does not execute it
  against shared data or certify that access path as secure.
- Existing RLS/grant and privileged-registration concerns are documented in the
  [RBAC QA sheet](rbac-verification.md#source-review-concerns-requiring-follow-up).
  Live policy/grant checks remain separate work; the API suite uses test doubles.

These are source observations, not results from live exploitation. Keep defects
visible in the run record; do not sign off “zero security leaks” while relevant
findings remain unresolved.

## Execution checklist and sign-off

Replace **Not run** and **Pending** as each case is executed. Record evidence
and actual behavior even when the case passes.

| Case | Result | Actual behavior / evidence / defect |
| --- | --- | --- |
| S-01 | Not run | Pending |
| S-02 | Not run | Pending |
| S-03 | Not run | Pending |
| S-04 | Not run | Pending |
| S-05 | Not run | Pending |
| S-06 | Not run | Pending |
| S-07 | Not run | Pending |
| D-01 | Not run | Pending |
| D-02 | Not run | Pending |
| D-03 | Not run | Pending |
| D-04 | Not run | Pending |
| D-05 | Not run | Pending |
| D-06 | Not run | Pending |
| A-01 | Not run | Pending |
| A-02 | Not run | Pending |
| A-03 | Not run | Pending |
| A-04 | Not run | Pending |
| A-05 (optional) | Not run | Pending |
| X-01 | Not run | Pending |
| X-02 | Not run | Pending |
| X-03 | Not run | Pending |
| X-04 | Not run | Pending |
| X-05 | Not run | Pending |
| X-06 | Not run | Pending |
| X-07 | Not run | Pending |

Task 4's document deliverable is complete when this plan is linked from the
roadmap. Manual execution sign-off remains pending until required cases have
actual results, unresolved failures are reported, and the reviewer records a
decision. If SQL access is unavailable, mark D-04/A-03/A-04 Blocked; UI evidence
cannot substitute for encryption-at-rest or database-trigger verification.

After evidence capture, sign out and close the role profiles. Reset/remove QA
appointments and accounts only in the disposable project as needed; retain
audit history and never disable its trigger for cleanup.

Tester / date: Pending. Reviewer / date: Pending. Decision: **Not executed**.
