# Member 1, Task 3: Role-Based Access Verification

Verified on 2026-10-22 using Node.js 22.19.0.

Result: all 22 API RBAC tests pass. No cross-student appointment disclosure,
unauthorized consultation mutation, or admin complaint/note disclosure was
observed in the tested API responses. This is an API-handler verification;
the source-review concerns below prevent a system-wide security sign-off.

## Reproduce

```bash
npm run test:rbac
npm test
npx tsc --noEmit
npm run lint
```

On Windows PowerShell, use `npm.cmd` and `npx.cmd` if script execution policy
blocks the PowerShell wrappers.

| Check | Result |
| --- | --- |
| RBAC suite | PASS: 22 tests, 3 suites |
| Full test suite | PASS: 109 tests, 8 suites |
| TypeScript | PASS |
| ESLint | PASS |

## Scenario sheet

| Scenario | Expected behavior | Result |
| --- | --- | --- |
| Student A lists appointments with records for A and B present | HTTP 200; only A's record, complaint, and identifier; no decrypted notes | PASS |
| Student B lists the same dataset | HTTP 200; only B's record, complaint, and identifier; no decrypted notes | PASS |
| Student with no appointments lists a mixed dataset | HTTP 200; empty list | PASS |
| Administrator lists appointments containing complaints, symptoms, and encrypted notes | HTTP 200; scheduling metadata retained; complaints and encrypted notes empty; symptoms empty; plaintext notes absent; no clinical fixture content in serialized response | PASS |
| Doctor lists appointments | HTTP 200; both students' clinical records and correctly decrypted notes | PASS |
| Student attempts status, notes, or combined consultation update | HTTP 403 for each request; no database client, writes, or audit events | PASS (3 tests) |
| Administrator attempts status, notes, or combined consultation update | HTTP 403 for each request; no database client, writes, or audit events | PASS (3 tests) |
| Student guesses another student's appointment ID and attempts an update | HTTP 403; records unchanged; no database access | PASS |
| Doctor updates an appointment's status and notes | HTTP 200; selected record updated; notes encrypted in storage and decrypted in response; other record unchanged; two doctor audit events | PASS |
| Anonymous caller lists appointments, books, updates a consultation, or reads audits | HTTP 401; no database access | PASS (4 tests) |
| Doctor or administrator attempts student-only booking | HTTP 403; no database access | PASS (2 tests) |
| Student or doctor attempts to read audits | HTTP 403; no database access | PASS (2 tests) |
| Administrator reads audit metadata | HTTP 200; mapped audit records | PASS |

## Method and boundaries

The suite imports the real handlers from `app/api/appointments/route.ts`,
`app/api/appointments/[id]/route.ts`, and `app/api/audit/route.ts`. It uses real
Next.js responses, mappers, AES-256-GCM encryption/decryption, and audit writing.
Only session resolution and the service-role database client are replaced by
test fixtures. The database double applies equality filters to a mixed-student
dataset, so omitting the student ownership filter exposes the other student's
record and fails the test. Doctor success checks ensure the same fixture also
supports authorized reads and writes.

All records are synthetic. The encryption key is QA-only; the environment is
restored after import. The suite does not read `.env.local`, contact Supabase,
seed/reset data, or alter the application's runtime behavior. Admin responses
currently retain empty clinical properties to match the shared appointment
type; the tests assert that their contents are removed.

Cookie validation, `getSessionUser()` itself, browser routing, and deployed
Supabase RLS/grants are outside this suite. Database filtering is simulated;
the suite does not prove that the deployed policies match `schema.sql`.
The separate manual workflow checklist remains Member 1's task 4.

## Source-review concerns requiring follow-up

These observations are from repository code, not exploitation of a live database.
They were recorded separately from the three requested API checks:

| Source | Observation and implication |
| --- | --- |
| `schema.sql`: `staff_read_appointments` | The SELECT policy includes administrators and does not redact columns. If authenticated table SELECT grants are present, direct Supabase reads can expose complaints and symptoms despite the API's redaction. Confirm deployed grants and restrict direct clinical-column access. |
| `schema.sql`: `users_update_self` | The policy allows a user to update their own row without restricting the `role` column. If authenticated UPDATE grants include that column, a user can change their role. Restrict role assignment to trusted staff/server operations. |
| `schema.sql`: `students_own_appointments` | The ownership policy uses `FOR ALL`, so it can permit students to update/delete their own consultations directly if table grants allow those operations. Verify grants and restrict students to intended intake operations. |
| `app/api/auth/register/route.ts`: `ALLOWED_ROLES` | Public registration accepts `doctor` and `admin` from the request. The tested route guards assume a trusted assigned role; they do not protect against self-registration into a privileged role. Restrict privileged account provisioning before claiming system-wide role isolation. |

Live Supabase verification and remediation of these broader access paths remain
follow-up work. Passing this suite confirms the specified API behavior for
already-resolved roles; it does not establish zero security leaks across every
entry point.
