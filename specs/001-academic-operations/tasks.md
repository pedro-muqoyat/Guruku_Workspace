---
description: "Task list for Guruku Academic Operations"
---

# Tasks: Guruku Academic Operations

**Input**: Design documents from `specs/001-academic-operations/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, and `quickstart.md`

**Tests**: Included because the feature brief specifies database isolation, invalid-payload, spreadsheet-load, responsive-layout, and grading verification.

**Organization**: Tasks are grouped by the five user stories in `spec.md`. Shared database, authentication, and RSC foundations block all stories.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Tasks can run in parallel because they touch independent files and have no unfinished dependencies.
- **[Story]**: Story label maps a task to `spec.md`.
- Every task includes its target file path.

## Phase 1: Setup

**Purpose**: Prepare application dependencies, local Supabase, and test runners.

- [ ] T001 Add `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `xlsx`, Vitest, and Playwright dependencies and scripts in `package.json`.
- [ ] T002 [P] Initialize local Supabase services and database test configuration in `supabase/config.toml`.
- [x] T003 [P] Document required public Supabase URL and anon-key variable names without adding secrets in `.env.example`.
- [ ] T004 Configure application unit and browser test runners in `vitest.config.ts` and `playwright.config.ts`.

---

## Phase 2: Foundational

**Purpose**: Establish normalized academic tables, database authorization, authenticated server access, and shared validation before story UI work begins.

**Checkpoint**: All exposed-table policies and grants pass database isolation tests; request-scoped server auth and shared action validation are available.

- [ ] T005 [P] Write pgTAP allow/deny tests for exposed tables, including `roles`, `user_profiles`, `user_roles`, `schedules`, `class_sessions`, `attendance_logs`, `student_grades`, `notifications`, and `schedule_change_requests`, in `supabase/tests/rls_isolation.test.sql`.
- [ ] T006 [P] Write PostgREST integration tests using only the Supabase anon key; assert protected-table reads and writes return HTTP 401/403 in `tests/security/supabase-anon-key.spec.ts`.
- [ ] T007 Create the initial relational schema migration in `supabase/migrations/202609290001_core_schema.sql` for identity/roles, periods, classes, subjects, students, teachers, enrollments, teaching assignments, schedules, sessions, attendance, journals, assessments, grades, grading policies/components, athlete statuses, notifications, audit logs, import batches/chunks, and schedule-change requests; enforce stable keys, foreign keys, unique attendance `(class_session_id, student_id)`, valid time ordering `start_time < end_time`, and score range `0..maximum`.
- [ ] T008 Apply least-privilege grants and role/assignment-scoped RLS to every exposed table in `supabase/migrations/202609290002_rls_grants.sql`; revoke anonymous access and grant only required authenticated operations.
- [x] T009 Create a request-scoped Supabase SSR client that uses the current user's cookies and never loads a service-role key in `src/lib/supabase/server.ts`.
- [x] T010 Add Next.js 16 Supabase session refresh and protected-route matching in `src/proxy.ts`.
- [ ] T011 Implement verified-claim, active-role, and assignment checks in `src/lib/auth/authorization.ts`; do not trust role or actor identifiers from submitted form data.
- [ ] T012 Define shared Zod action schemas and typed `ActionResult`/`fieldErrors` helpers in `src/lib/validation/action-result.ts` and `src/lib/validation/common.ts`.
- [ ] T013 Convert the root and dashboard shells to Server Components, retaining theme, navigation, and other browser interactions only in leaf components in `src/app/layout.tsx` and `src/app/(DashboardLayout)/layout.tsx`.

---

## Phase 3: User Story 1 - Siapkan Data dan Akses Akademik (Priority: P1) MVP

**Goal**: Administrators manage school master data and user assignments; unauthorized actors cannot access or mutate those records.

**Independent Test**: Sign in as Administrator, create/update one record for each supported master-data type, assign a user role, and verify an unprivileged account is denied. Confirm each privileged write has an attributable audit entry.

### Tests for User Story 1

- [ ] T014 [P] [US1] Add browser tests for administrator master-data create/update, role assignment, and denied non-admin access in `tests/e2e/admin-master-data.spec.ts`.
- [ ] T015 [P] [US1] Add action-level tests for invalid identifiers, duplicate school codes, and forbidden actor roles in `tests/unit/admin-actions.test.ts`.

### Implementation for User Story 1

- [ ] T016 [US1] Implement administrator-only master-data and user-role Server Actions with Zod validation, audit attribution, and route revalidation in `src/app/actions/master-data.ts`.
- [ ] T017 [P] [US1] Build RSC pages for students, teachers, classes, and schedules in `src/app/(DashboardLayout)/admin/students/page.tsx`, `src/app/(DashboardLayout)/admin/teachers/page.tsx`, `src/app/(DashboardLayout)/admin/classes/page.tsx`, and `src/app/(DashboardLayout)/admin/schedules/page.tsx`.
- [ ] T018 [P] [US1] Build accessible client-leaf forms with explicit `name` attributes for administrator master-data edits in `src/app/components/admin/MasterDataForm.tsx`.
- [ ] T019 [US1] Add administrator-managed, period-scoped Siswa Atlet status actions and form in `src/app/actions/athlete-status.ts` and `src/app/components/admin/AthleteStatusForm.tsx`; persist the approving administrator and effective period.

**Checkpoint**: Administrator master-data journeys pass independently; other roles cannot access administrator mutations.

---

## Phase 4: User Story 2 - Jalankan Kegiatan Mengajar dan Penilaian (Priority: P1)

**Goal**: Assigned teachers record attendance, teaching journals, and grades; browser imports validate and submit bounded, retry-safe batches.

**Independent Test**: For one assigned session, record attendance, journal content, and all enabled grade components; reject an invalid score with field-level errors; import 1,000 rows without blocking another user.

### Tests for User Story 2

- [ ] T020 [P] [US2] Test grade action validation with a fixture whose maximum score is 10 and submitted Formatif score is 100; assert a `score` `fieldErrors` result and no uncaught server exception in `tests/unit/grade-actions.test.ts`.
- [ ] T021 [P] [US2] Test database grade aggregation for 35% Formatif, 25% Kehadiran, and a configurable Sumatif/STS/SAS allocation totaling exactly 40%; assert invalid totals fail in `supabase/tests/grade_calculation.test.sql`.
- [ ] T022 [P] [US2] Test identical raw grades for regular and active Siswa Atlet records; assert athlete attendance remains recorded, athlete attendance contributes the full 25%, final aggregates differ when regular attendance is penalized, and no division-by-zero occurs in `tests/unit/grade-calculation.test.ts`.
- [ ] T023 [P] [US2] Add browser tests for assigned-teacher access, named attendance inputs, journal entry, and grade submission in `tests/e2e/teacher-workflow.spec.ts`.
- [ ] T024 [P] [US2] Add a browser stress test that parses 2,000 synthetic grade or attendance spreadsheet rows without freezing the form, records peak Chromium JavaScript heap, and enforces the documented 256 MiB import-page budget in `tests/performance/import-2000.spec.ts` and `tests/performance/import-thresholds.ts`.

### Implementation for User Story 2

- [ ] T025 [US2] Implement a versioned grade-calculation view or RPC over policy components, grades, attendance, and athlete status in `supabase/migrations/202609290003_grade_calculation.sql`; preserve historical policy-version references and use an RLS-safe view configuration.
- [x] T026 [US2] Implement assigned-session attendance Server Actions with Zod status/session/student validation and typed field errors in `src/app/actions/attendance.ts`.
- [x] T027 [US2] Implement assigned-assessment grade upsert Server Actions with Zod range checks `0..maximum` and policy component validation in `src/app/actions/grading.ts`.
- [ ] T028 [P] [US2] Build the RSC attendance page and interactive attendance leaf in `src/app/(DashboardLayout)/apps/attendance/page.tsx` and `src/app/components/apps/attendance/AttendanceForm.tsx`; give every input an explicit `name` and submit only assigned session data.
- [ ] T029 [US2] Implement teaching-journal validation and Server Action for the assigned class session in `src/app/actions/teaching-journal.ts`.
- [ ] T030 [P] [US2] Build the RSC journal view and named-input client form in `src/app/(DashboardLayout)/apps/journal/page.tsx` and `src/app/components/apps/journal/TeachingJournalForm.tsx`.
- [ ] T031 [P] [US2] Build RSC grade-entry view and interactive grade matrix in `src/app/(DashboardLayout)/apps/grades/page.tsx` and `src/app/components/apps/grades/GradeMatrixForm.tsx`; display component inputs, active weights, and calculated aggregate.
- [x] T032 [US2] Implement a Papa Parse Web Worker for local `.csv` files that counts and parses rows asynchronously, normalizes attendance/grade columns, and emits row errors without posting file bytes in `src/workers/csv-import.worker.ts` and `src/lib/import/csv-import-types.ts`.
- [x] T033 [US2] Integrate serial grade and attendance chunks with the existing Server Actions in `src/app/components/features/DataIngestion.tsx`; dispatch at most 100 rows per call, preserve idempotent action upserts, continue after action failures, and queue only transport failures for retry.
- [x] T034 [US2] Build the CSV import preview, drag-and-drop, progress, partial-error log, and local 1,000-row simulation in `src/app/components/features/DataIngestion.tsx`; keep action payload chunks at 100 rows and expose the feature at `/utilities/data-ingestion`.
- [ ] T035 [US2] Run the 1,000-matrix acceptance benchmark and an attendance batch benchmark with ten or more serial chunks; verify no timeout, duplicate writes, lost valid rows, or blocked unrelated workflow in `tests/performance/import-1000.spec.ts`.

**Checkpoint**: Teacher workflows pass independently; invalid action payloads return field-level errors, and imports are bounded, resumable, and auditable.

---

## Phase 5: User Story 3 - Cegah Konflik dan Pantau Kegiatan Mengajar (Priority: P1)

**Goal**: Waka Kurikulum sees schedule conflicts and teaching status while remaining read-only on academic records; only Administrator publishes schedule changes.

**Independent Test**: Submit a Waka schedule-change proposal, verify an overlapping schedule is previewed and cannot be published, then verify the database rejects concurrent conflicting writes and displays validated teaching status.

### Tests for User Story 3

- [ ] T036 [P] [US3] Add pgTAP tests for overlapping schedule insert/update, adjacent non-overlap, transaction rollback, and simultaneous conflict attempts in `supabase/tests/schedule_conflicts.test.sql`.
- [ ] T037 [P] [US3] Add RLS/action tests proving Waka can submit proposals but cannot insert/update academic schedules and only Administrator can publish in `tests/e2e/schedule-governance.spec.ts`.

### Implementation for User Story 3

- [ ] T038 [US3] Add Waka schedule-change request table, scoped RLS, teacher/period/day advisory-lock trigger, and half-open time-overlap rejection in `supabase/migrations/202609290004_schedule_conflicts.sql`; reject conflicting writes transactionally.
- [ ] T039 [US3] Implement the Waka proposal Server Action and conflict preview in `src/app/actions/schedule-requests.ts`; it must write only `schedule_change_requests`, not `schedules`.
- [ ] T040 [US3] Implement Administrator-only schedule approval/publication Server Action and map trigger rejection to a safe conflict result in `src/app/actions/publish-schedule.ts`.
- [ ] T041 [P] [US3] Build RSC schedule proposal and approval pages with interactive proposal controls in `src/app/(DashboardLayout)/schedules/requests/page.tsx` and `src/app/components/schedules/ScheduleRequestForm.tsx`.
- [ ] T042 [US3] Add a scoped teaching-status read view and index-backed query for sessions lacking validated teaching activity in `supabase/migrations/202609290005_teaching_status.sql`.
- [ ] T043 [US3] Render Waka's school-wide read-only teaching-status map from the scoped database view in `src/app/(DashboardLayout)/operations/teaching-status/page.tsx`.

**Checkpoint**: Waka sees changes and live status but cannot mutate academic schedules; conflicts are rejected under concurrent writes.

---

## Phase 6: User Story 4 - Pantau dan Rekap Kelas (Priority: P2)

**Goal**: Walikelas receives a scoped alert for three consecutive absent class sessions and can review/print assigned-class subject aggregates.

**Independent Test**: Seed three consecutive Alpa records in scheduled sessions, verify one notification for the assigned Walikelas, correct an attendance record, and verify notification reconciliation and report scope.

### Tests for User Story 4

- [ ] T044 [P] [US4] Add pgTAP tests for three-session Alpa detection, duplicate-alert prevention, correction/resolution, period boundaries, and cancelled sessions in `supabase/tests/absence_notifications.test.sql`.
- [ ] T045 [P] [US4] Add role tests proving Walikelas reads only assigned classes and notifications in `tests/e2e/homeroom-reports.spec.ts`.

### Implementation for User Story 4

- [ ] T046 [US4] Add an attendance trigger that recalculates the affected student's latest applicable sessions and inserts/reconciles a deduplicated notification transactionally in `supabase/migrations/202609290006_absence_notifications.sql`.
- [ ] T047 [US4] Add recipient/class-scoped notification RLS and indexes for Walikelas lookups in `supabase/migrations/202609290007_notification_policies.sql`.
- [ ] T048 [US4] Add an RLS-safe `security_invoker` subject-grade aggregate view for assigned homeroom classes in `supabase/migrations/202609290008_homeroom_aggregates.sql`.
- [ ] T049 [P] [US4] Build the Walikelas RSC dashboard for alerts and subject aggregates in `src/app/(DashboardLayout)/homeroom/page.tsx`.
- [ ] T050 [US4] Implement assigned-class e-Rapor foundation export with policy version and one row per student/subject/period in `src/app/actions/export-eraper.ts`.
- [ ] T051 [P] [US4] Add print/export controls as an interactive leaf without widening class scope in `src/app/components/homeroom/HomeroomReportActions.tsx`.

**Checkpoint**: Alerts are generated once, reconciled after corrections, and Walikelas reports cannot cross assigned-class boundaries.

---

## Phase 7: User Story 5 - Validasi Rekap Presensi Guru (Priority: P2)

**Goal**: Operator TU reads and exports validated teaching-attendance aggregates without academic mutation rights.

**Independent Test**: Compare sessions with and without teaching validation; confirm only validated sessions appear once in a period export and TU cannot mutate schedules, attendance, or grades.

### Tests for User Story 5

- [ ] T052 [P] [US5] Add pgTAP and browser tests for TU read-only grants, validated-session filtering, duplicate exclusion, and no access to student grades in `supabase/tests/tu_attendance_rls.test.sql` and `tests/e2e/tu-attendance-export.spec.ts`.

### Implementation for User Story 5

- [ ] T053 [US5] Add a validated-teaching attendance aggregate with read-only TU grants and indexed period filters in `supabase/migrations/202609290009_tu_attendance_aggregate.sql`.
- [ ] T054 [P] [US5] Build the TU read-only attendance summary as an RSC page in `src/app/(DashboardLayout)/tu/teacher-attendance/page.tsx`.
- [ ] T055 [US5] Implement versioned TU attendance export using only validated teaching sessions and approved fields in `src/app/actions/export-teacher-attendance.ts`.

**Checkpoint**: TU can validate and export source-traceable attendance, but cannot mutate academic records or access grade details.

---

## Phase 8: Polish and Cross-Cutting Concerns

**Purpose**: Enforce architecture boundaries, responsive behavior, operational verification, and documentation across all stories.

- [ ] T056 Remove or migrate every template demo API consumer, then delete `src/app/api/blog/route.ts`, `src/app/api/notes/route.ts`, and `src/app/api/ticket/route.ts`; no `src/app/api/**/route.ts` may remain.
- [ ] T057 Add an architecture test that fails if a conventional API Route Handler remains under `src/app/api/` in `tests/architecture/no-route-handlers.test.ts`.
- [ ] T058 Add mobile/desktop browser checks for named attendance inputs, no `float` layout declarations, and no forced horizontal scrolling at 320px, 375px, 768px, and desktop widths in `tests/e2e/responsive-academic.spec.ts`.
- [ ] T059 Audit academic page imports and move every browser event/state dependency behind terminal client leaves; keep academic route pages/layouts as RSC in `tests/architecture/server-component-boundaries.test.ts`.
- [ ] T060 Verify production deployment settings and Server Action payload limits in `next.config.mjs` and `docs/deployment.md`; keep chunks below the default 1 MB request body limit and document the selected Vercel function-duration budget.
- [ ] T061 Update local setup, migration, test, import, and export instructions in `specs/001-academic-operations/quickstart.md` after commands and school-approved templates are finalized.
- [ ] T062 Run `supabase test db`, unit tests, role-based Playwright journeys, 1,000-row acceptance import, 2,000-row browser stress test, production build, and responsive checks; record outcomes in `specs/001-academic-operations/quickstart.md`.

---

## Dependencies and Execution Order

### Phase Dependencies

- **Setup (Phase 1)** has no dependencies and can begin immediately.
- **Foundational (Phase 2)** depends on Setup and blocks all user-story implementation. Write policy tests before schema/RLS implementation.
- **User Stories (Phases 3-7)** depend on the shared schema, RLS, Supabase SSR client, authorization helper, and validation contract.
- **Polish (Phase 8)** depends on the user stories selected for delivery.

### User Story Dependencies

- **US1 (P1)** can start after Phase 2 and is the recommended MVP.
- **US2 (P1)** can start after Phase 2; uses seeded administrator, teacher, class, and schedule data.
- **US3 (P1)** can start after Phase 2; its schedule proposal uses the shared role assignments and administrator approval.
- **US4 (P2)** uses the shared session/attendance schema and can be tested with seeded attendance; integrate after US2's attendance contract is stable.
- **US5 (P2)** uses validated teaching-session data; integrate after US2/US3 validation rules are stable.

### Parallel Opportunities

- T002 and T003 can run in parallel with dependency installation T001; T004 follows dependency installation.
- After core schema T007, RLS tests/policies and server-client/auth setup can be split by file ownership where dependencies permit.
- Within stories, independent test files can be authored in parallel before implementation; RSC pages and isolated client leaves can be split after their action contracts are fixed.
- After Phase 2, US1, US2, and US3 can be staffed in parallel; US4 and US5 can begin against deterministic seeded database fixtures but should integrate with the stable attendance/session contract.

## Parallel Example: User Story 2

After the Phase 2 schema and authorization contracts are ready, these test files do not overlap and can be authored in parallel:

- T020 `tests/unit/grade-actions.test.ts`
- T021 `supabase/tests/grade_calculation.test.sql`
- T022 `tests/unit/grade-calculation.test.ts`
- T023 `tests/e2e/teacher-workflow.spec.ts`
- T024 `tests/performance/import-2000.spec.ts`

Implement the grade database calculation and attendance/grade action modules only after the corresponding tests exist; the browser import worker, RSC entry views, and test specifications may then be split across separate files.

## Implementation Strategy

### MVP First (User Story 1)

1. Complete Setup and Foundational phases, including anonymous-key denial tests.
2. Complete US1 administrator authentication, master-data management, scoped roles, and audit trail.
3. Validate US1 independently with the administrator and denied-access tests.
4. Add US2 and US3 as the next P1 increments; then deliver Walikelas and TU reporting.

### Incremental Delivery

1. Deliver a secure schema/RLS/authentication foundation.
2. Deliver administrator master data as the first usable MVP.
3. Add teacher session workflows, grading, and bounded bulk imports.
4. Add schedule governance and event-driven conflict detection.
5. Add Walikelas alerts/reports and TU validated-attendance exports.
6. Finish with architecture, 2,000-row browser, responsive, and full regression gates.

## Notes

- User-requested tests are included; each story's tests precede its implementation tasks.
- The invalid-score test uses `maximum = 10` and `score = 100`, so 100 is unambiguously outside the allowed `0..maximum` range.
- Server Actions are not conventional REST endpoints. Test invalid payloads through action/schema test harnesses and assert `fieldErrors`; do not add a `/api/*` endpoint for Postman/cURL testing.
- Anonymous-key tests target protected REST table operations after grants are revoked and assert 401/403; use pgTAP for direct PostgreSQL role/policy assertions.
- Absence streaks count three consecutive scheduled class sessions, not three calendar dates.
- Siswa Atlet retains the full 25% attendance contribution while physical attendance remains recorded, per the approved feature specification.
- A teacher schedule change is a Waka proposal; only Administrator publishes the academic schedule.

## Follow-up Tasks

- [x] T063 [US3] Build a Waka-only, read-only RSC dashboard that concurrently loads active absence notifications and today's class schedules in `src/app/(DashboardLayout)/apps/waka/page.tsx`.
- [x] T064 [US3] Bound absence-notification reads to seven days and hydrate the Waka feed through a user-scoped Supabase Realtime client with channel cleanup in `src/app/components/features/RealtimeWakaFeed.tsx`.
- [x] T065 [US2] Add the GURU-only daily RSC dashboard and journal/attendance client forms with named student radio groups bound to existing Server Actions in `src/app/(DashboardLayout)/apps/guru/page.tsx` and `src/app/components/features/GuruDailyForm.tsx`.
- [x] T066 [US3] Exchange the HttpOnly-cookie session for an uncached, authenticated access-token response and initialize Waka Realtime without serializing the token through RSC props in `src/app/api/auth/token/route.ts` and `src/app/components/features/RealtimeWakaFeed.tsx`.
- [x] T067 [US1] Add ADMIN-only user provisioning, role changes, deletion, recovery links, and a server-rendered user directory backed by a server-only Supabase Admin client in `src/app/actions/admin-users.ts`, `src/lib/supabase/admin-client.ts`, and `src/app/(DashboardLayout)/apps/admin/users/page.tsx`.
- [x] T068 [US2] Add private daily student-ranking and teacher-session aggregate materialized views with unique indexes and UTC pg_cron concurrent refresh jobs in `supabase/migrations/202609300001_dashboard_materialized_views.sql`.
- [x] T069 [US2] Execute and verify `202609300002_total_jp_dashboard_views.sql` against the matching local PostgreSQL database with `SUPABASE_DB_URL`; confirmed by schema assertions and `supabase db lint --local`.