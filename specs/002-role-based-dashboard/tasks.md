---
description: "Task list for the Role-Based Dashboard feature"
---

# Tasks: Role-Based Dashboard

**Input**: Design documents from `specs/002-role-based-dashboard/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Database policy, RPC, and role E2E tests are included because the specification and constitution require explicit allowed/denied access evidence.

**Organization**: Tasks are grouped by user story. Within each story, database contracts and tests precede DAL/actions, which precede RSC/UI work. Production RSC widgets read the server-only DAL directly so each widget remains independently streamable.

## Format

Every task uses `- [ ] T### [P?] [Story?] Description with an exact file path`. `[P]` is used only where the task touches an independent file and has no unfinished prerequisite. User-story tasks carry `[US1]`, `[US2]`, or `[US3]`; setup/foundational/polish tasks do not.

## Phase 1: Setup - Priority 0 Security Patch

**Purpose**: Close the known TU data exposure before dashboard implementation begins.

- [x] T001 Security P0: create the additive TU RLS patch first in `supabase/migrations/202610030001_patch_tu_rls.sql`; remove TU access from direct reads of `classes`, `subjects`, `students`, `class_sessions`, `attendance_logs`, `student_grades`, and `teaching_journals`; keep only the schedule data needed for the TU workflow and the caller-scoped macro RPC path; do not grant TU student or grade access.

---

## Phase 2: Foundational Security and Source Records

**Purpose**: Prove the TU boundary, source/approval provenance, canonical role key, complete assignment scope, and transport-policy state before any user-story UI work.

- [ ] T002 Add pgTAP regression coverage in `supabase/tests/dashboard_role_access.test.sql` proving TU cannot directly read student, session, attendance-log, grade, or teaching-journal rows while an authorized TU can still read schedule data; retain ADMIN/WAKA_KURIKULUM and assigned Guru/Walikelas access.
- [ ] T003 Add failing-first pgTAP source-contract cases in `supabase/tests/dashboard_role_access.test.sql`; assert ESP32 events and WFH requests retain source/reference, teacher, school date, submitter, received time, and idempotency, and that replayed source references do not create duplicate events.
- [ ] T004 Add the teacher attendance event source or documented adapter in `supabase/migrations/202610030002_teacher_attendance_status.sql`; accept ESP32 device events and WFH requests, preserve source and submitter provenance, and initialize every event as `PENDING` rather than inferring a status from missing sessions.
- [ ] T005 Add failing-first approval transition tests in `supabase/tests/dashboard_role_access.test.sql`; assert only an authorized Operator TU can Apply/ACC or reject, every decision records actor/time, rejection requires a reason, pending/rejected events remain non-final, and an unauthorized or source-submitting actor cannot approve.
- [ ] T006 Add effective-rate contract tests in `supabase/tests/transport_calculation.test.sql`; verify staff-specific and structural-role rate records are distinguishable, effective dates are honored, and missing or conflicting precedence/policy yields `unavailable` rather than a guessed numeric result.
- [ ] T007 Add an effective-dated transport policy source in `supabase/migrations/202610050002_transport_policy.sql`; store approved formula/version, rate unit, staff or structural-role scope (including OB, TU Staff, and Waka), effective range, authorized TU configurator, and audit fields without inventing school formula, rounding, or precedence values.
- [ ] T008 Add transport-source parity tests in `supabase/tests/transport_calculation.test.sql`; assert only Operator TU-approved attendance events contribute, pending/rejected rows are excluded, and every numeric result identifies its approved formula/rate version and period.
- [ ] T009 Add dashboard DTO/RPC projection tests in `supabase/tests/dashboard_role_access.test.sql`; assert teacher rows expose source and pending/approved/rejected state, student attendance derives only from persisted approved records, and no unapproved or student-level fields leak into the TU view.
- [ ] T010 Add a Walikelas Default Present browser test in `tests/e2e/walikelas-default-present.spec.ts`; assert all assigned students start visually as Hadir, no attendance is persisted or shown as confirmed before submit, and explicit submission is visible only from the authorized persisted record.
- [ ] T011 Add failing-first assignment and role-key cases in `supabase/tests/dashboard_role_access.test.sql`; assert a Guru and Walikelas with multiple active assignments receive all and only those assignments, and only canonical `WAKA_KURIKULUM` is accepted for executive analytics.
- [ ] T012 Migrate stored Waka role values to canonical `WAKA_KURIKULUM` and update database role constraints in `supabase/migrations/202610050001_canonical_waka_role.sql`; reject ambiguous/conflicting identity rows, do not accept `WAKA` as a permanent runtime alias, and prove the migration and exact-role allow/deny cases in `supabase/tests/dashboard_role_access.test.sql`.
- [ ] T013 Implement a server-only dashboard access resolver in `src/lib/dashboard/access.ts`; verify `auth.getUser()`, return the canonical role plus complete active `assignment_ids` for every assigned class/schedule, reject missing/unknown roles, and never select an arbitrary assignment with `limit(1)`.

**Checkpoint**: TU's direct student-data paths are blocked; ESP32/WFH provenance and explicit TU approval are tested; canonical role and complete assignment resolution are established; ambiguous transport policy is represented as unavailable before dashboard RPC or UI work proceeds.

---

## Phase 3: User Story 1 - School Operations Overview (Priority: P1)

**Goal**: Give ADMIN/WAKA_KURIKULUM/TU the current-day schedule and teacher performance overview, with no student data returned to TU.

**Independent Test**: With distinct ADMIN, WAKA_KURIKULUM, and TU sessions and current-day schedule/status fixtures, verify timeline fields, teacher status and JP totals; verify TU receives no student identifier, attendance, or score data and cannot read protected tables directly.

### Database Contracts and Tests

- [ ] T014 [US1] Add macro RPC allow/deny and output-projection tests in `supabase/tests/dashboard_role_access.test.sql` before implementing the functions; cover ADMIN/TU allow, WAKA_KURIKULUM/GURU/WALI/MURID/unknown/unauthenticated denial for the ADMIN/TU contract, bounded current-school-date scope, and absence of student fields in macro results.
- [ ] T015 [P] [US1] Create the school-wide schedule timeline RPC in `supabase/migrations/202610030003_dashboard_school_schedule_rpc.sql`; derive the caller from `auth.uid()`, allow only ADMIN/TU, return all current-day teacher/class/subject/local-time/JP events, use a fixed `search_path`, and grant execution only to `authenticated`.
- [ ] T016 [P] [US1] Create the teacher performance RPC in `supabase/migrations/202610030004_dashboard_teacher_performance_rpc.sql`; derive the caller from `auth.uid()`, allow only ADMIN/TU, return teacher display identity, validated status, scheduled JP and validated JP without student fields, and enforce fixed `search_path` and explicit grants.
- [ ] T017 [US1] Regenerate Supabase table and function types in `src/types/database.types.ts` from the migrated local schema after T015 and T016.

### DAL and Server Action Boundary

- [ ] T018 [US1] Create server-only macro query functions and minimal DTO mapping in `src/lib/dashboard/operations.ts`; use the request-scoped Supabase client, keep schedule wall-clock values local, map missing/invalid source states to explicit unavailable states, and never import service-role credentials.
- [ ] T019 [US1] Refactor the macro Server Action façade in `src/app/actions/dashboard.ts`; call `await supabase.auth.getUser()` before any RPC, derive the Auth UID only from that verified result and never accept it in the UI payload, validate filters with strict Zod schemas, use `Promise.all()` for independent schedule and teacher-status aggregate queries, preserve the safe `{ success, data, error?, status }` result, and keep RSC widget reads on the DAL.

### RSC and UI

- [ ] T020 [P] [US1] Create dimension-reserved widget fallbacks in `src/app/components/dashboard/DashboardWidgetSkeleton.tsx`; include `min-h-[300px]` and match the macro widgets' table/list geometry so fallback replacement can be measured for CLS.
- [ ] T021 [P] [US1] Create text-labeled traffic-status badges in `src/app/components/dashboard/StatusBadge.tsx`; map Hadir/Mengajar to success, Izin to warning, Alpa to danger, and Sakit/unconfirmed/conflict to distinct explicit labels without color-only meaning.
- [ ] T022 [US1] Create the fail-closed role factory and school-operations view wiring in `src/app/(DashboardLayout)/page.tsx`, `src/app/components/dashboard/DashboardRoleFactory.tsx`, and `src/app/components/dashboard/SchoolOperationsView.tsx`; render operational macro widgets only for ADMIN/TU, keep WAKA_KURIKULUM on the separate executive view, put role resolution behind an outer Suspense fallback, and never default missing or unknown roles to GURU.
- [ ] T023 [P] [US1] Create the semantic school schedule timeline in `src/app/components/dashboard/SchoolScheduleTimeline.tsx` using `<ul>`, `<li>`, and `<time>`; show teacher, class, subject, local start/end time, JP, and empty/error states.
- [ ] T024 [P] [US1] Create the semantic teacher performance matrix in `src/app/components/dashboard/TeacherPerformanceTable.tsx` using Shadcn Table row/column headers; show labeled status, scheduled/validated JP, source freshness, safe missing/error states, and a sticky teacher identity column inside an internal overflow container when there are five or more columns.
- [ ] T025 [US1] Extend the authenticated role E2E coverage in `test-dashboard-rpc.js` for ADMIN/TU macro success and WAKA_KURIKULUM denial from the operational contract; assert the separate Waka executive contract's exact-role behavior, safe payloads, no student fields for TU, and direct TU PostgREST denial for the tables named in T001.

**Checkpoint**: US1 is independently demonstrable with separate streamed schedule and teacher-matrix widgets; the P0 RLS patch is verified before delivery.

---

## Phase 4: User Story 2 - Homeroom Class Monitoring (Priority: P2)

**Goal**: Let Walikelas monitor all and only assigned classes, their day's teaching traffic, and each student's daily score/attendance state.

**Independent Test**: Sign in as a Walikelas assigned to one class with a second unassigned class present. Verify all assigned-class schedules and student summaries, mixed/missing attendance states, and denial of the unassigned class.

### Database Contracts and Tests

- [ ] T026 [US2] Add failing-first schema pgTAP coverage in `supabase/tests/dashboard_role_access.test.sql`; assert canonical period/assessment fields, period date constraints, assessment-to-period linkage, supported components, grade provenance, and the canonical student display-name column before adding either schema migration.
- [ ] T027 [US2] Add canonical academic-period and dated-assessment relations in `supabase/migrations/202610030005_dashboard_academic_periods.sql`; include school year, term/semester, start/end dates, lifecycle state, class, subject, component, title, assessment date, and maximum score; preserve the data-model constraints verbatim: “Date ranges cannot invert; only one active period may apply for a given school scope.” and “Sumatif routine, STS, and SAS are subcomponents of the Sumatif 40%; their configurable weights MUST total exactly 40%.” Link grades to the canonical assessment/period without deriving period from `created_at`.
- [ ] T028 [US2] Add canonical student display identity in `supabase/migrations/202610030006_dashboard_student_identity.sql`; provide a trusted student display name on the canonical student record, preserve stable school identity, backfill only from an authoritative roster, and never synthesize a name from UUID or Auth metadata.
- [ ] T029 [US2] Add homeroom RPC allow/deny and aggregate contract tests in `supabase/tests/dashboard_role_access.test.sql`; test every Walikelas alias, multiple assigned classes, unassigned class denial, daily scores across subjects, and `CAMPURAN`/`BELUM_TERCATAT` attendance semantics before implementing the RPCs.
- [ ] T030 [P] [US2] Create the assigned-class schedule RPC in `supabase/migrations/202610030007_dashboard_homeroom_schedule_rpc.sql`; derive the viewer and all Walikelas class assignments from `auth.uid()`, order current-day events by teaching period/time, and reject caller-supplied unassigned class IDs.
- [ ] T031 [P] [US2] Create the daily student summary RPC in `supabase/migrations/202610030008_dashboard_homeroom_student_rpc.sql`; aggregate recorded scores across subjects for the current school date, summarize attendance from `class_sessions.session_date`, return `CAMPURAN` with per-status counts when statuses differ, return `BELUM_TERCATAT` for no log, and disclose only assigned-class student DTO fields.
- [ ] T032 [US2] Regenerate Supabase types in `src/types/database.types.ts` after T026-T031 and confirm all new RPC return fields are accurately typed.

### DAL and Server Action Boundary

- [ ] T033 [US2] Add Walikelas-scoped server-only queries and DTO validation in `src/lib/dashboard/homeroom.ts`; call only the homeroom RPC contracts, retain all verified class assignments, and distinguish empty, unavailable, stale, and error results.
- [ ] T034 [US2] Add the homeroom Server Action boundary in `src/app/actions/dashboard.ts`; call `await supabase.auth.getUser()` directly, derive Auth UID from `user.id` rather than payload, validate any class selector with Zod, and use `Promise.all()` for independent schedule and student-summary aggregations while SQL rechecks `auth.uid()` and class scope.

### RSC and UI

- [ ] T035 [US2] Add the Walikelas view to `src/app/components/dashboard/DashboardRoleFactory.tsx` and `src/app/components/dashboard/HomeroomView.tsx`; render only for supported WALI aliases and place its schedule and performance widgets under separate Suspense boundaries.
- [ ] T036 [P] [US2] Create the assigned-class traffic list in `src/app/components/dashboard/ClassScheduleTimeline.tsx`; use semantic list/time elements, sort by teaching period, and distinguish no schedule from unavailable data.
- [ ] T037 [P] [US2] Create the Walikelas student matrix in `src/app/components/dashboard/HomeroomStudentTable.tsx`; use true Shadcn table headers/cells, daily score and attendance columns, text-labeled status badges, an internally scrollable container for five or more columns, and `sticky left-0` for the student-name column without CSS grid in table rows/cells.
- [ ] T038 [US2] Extend `test-dashboard-rpc.js` fixtures and assertions for a Walikelas assigned/unassigned class pair; prove positive access to every assigned class, no unassigned row disclosure, correct all-subject daily totals, and explicit missing/mixed attendance states.

**Checkpoint**: US2 is independently testable for a Walikelas without relying on the subject-teacher leaderboard.

---

## Phase 5: User Story 3 - Subject Teacher Execution (Priority: P3)

**Goal**: Give each Guru a complete personal itinerary and a deterministic current-versus-prior-period leaderboard limited to their teaching assignments.

**Independent Test**: Sign in as a Guru assigned to multiple class/subject schedules with current and previous completed period scores, plus an unassigned class; verify itinerary, totals, trend/tie order, unavailable history, and denial of out-of-assignment rows.

### Database Contracts and Tests

- [ ] T039 [US3] Add Guru itinerary and leaderboard pgTAP contract tests in `supabase/tests/dashboard_role_access.test.sql` before implementing their RPCs; cover all assigned schedules, wrong class/subject denial, active/previous-period comparison, unavailable history, deterministic ties, and MURID/TU denial.
- [ ] T040 [P] [US3] Create the personal itinerary RPC in `supabase/migrations/202610030009_dashboard_teacher_itinerary_rpc.sql`; scope to `auth.uid()` and all applicable schedules, order by local scheduled time/period, and return only assigned class/subject fields.
- [ ] T041 [P] [US3] Create the term leaderboard RPC in `supabase/migrations/202610030010_dashboard_teacher_leaderboard_rpc.sql`; compare the active and previous completed academic periods, aggregate only assigned class/subject assessments, return nullable prior totals and explicit trend availability, and order by total descending, display name ascending, then stable student ID.
- [ ] T042 [US3] Regenerate Supabase types in `src/types/database.types.ts` after T040-T041 and verify period and trend nullability in generated return types.

### DAL and Server Action Boundary

- [ ] T043 [US3] Add server-only Guru itinerary and leaderboard queries in `src/lib/dashboard/teacher.ts`; use complete verified schedule scope, validate safe DTOs, and keep no-history distinct from `TETAP`.
- [ ] T044 [US3] Add the Guru Server Action boundary in `src/app/actions/dashboard.ts`; call `await supabase.auth.getUser()` directly, derive Auth UID only from that verified user, accept no UI-supplied UID/role/assignment, validate optional filters with Zod, and use `Promise.all()` for independent itinerary and leaderboard aggregations while SQL independently checks `auth.uid()` and teaching assignments.

### RSC and UI

- [ ] T045 [US3] Add the subject-teacher view to `src/app/components/dashboard/DashboardRoleFactory.tsx` and `src/app/components/dashboard/SubjectTeacherView.tsx`; render only for GURU and keep itinerary and leaderboard in separate Suspense boundaries.
- [ ] T046 [P] [US3] Create the personal itinerary list in `src/app/components/dashboard/TeacherItinerary.tsx`; render semantic list/time elements for all applicable classes in schedule order with empty/unavailable/error states.
- [ ] T047 [P] [US3] Create the subject-teacher leaderboard in `src/app/components/dashboard/TeacherLeaderboard.tsx`; show term total and historical trend, render `NAIK`/`TURUN`/`TETAP` with text-labeled traffic badges, and show unavailable history without an inferred trend.
- [ ] T048 [US3] Extend `test-dashboard-rpc.js` with multi-schedule Guru fixtures and assertions for assigned-only rows, active/prior totals, trend direction, tie order, missing-history state, malformed filters, and safe errors.

**Checkpoint**: US3 is independently testable against the same canonical period/assessment records without granting Guru access to another teacher's assignments.

---

## Phase 6: Polish and Cross-Cutting Verification

**Purpose**: Verify mobile containment, accessibility, streaming, and release gates across all supported roles.

- [ ] T049 Complete browser, keyboard, screen-reader, hydration, and viewport checks and record results in `specs/002-role-based-dashboard/quickstart.md`; verify 320/390/768/1024/1440 pixel widths, no page-level horizontal overflow, sticky identity columns, semantic headers/lists, stable `LocalTime` initial output, and target widget-replacement CLS 0.00.
- [ ] T050 Run the full validation sequence in `specs/002-role-based-dashboard/quickstart.md` and record outcomes there: `supabase db reset`, E2E fixture setup, `supabase test db`, `npx tsc --noEmit`, `npm run build`, and role E2E; resolve any regression before feature acceptance.

---

## Dependencies and Execution Order

### Phase Dependencies

- **Setup / security (Phase 1)**: T001 is the first implementation task and must be applied before any dashboard UI work.
- **Foundational (Phase 2)**: T002-T013 depend on T001 and block all story work until TU's direct student-data access is denied; source, approval, role, and assignment contracts pass; and missing transport policy is handled as unavailable.
- **US1 (Phase 3)**: Macro RPC contract tests precede RPCs; RPCs precede type generation, DAL, action boundary, and RSC widgets.
- **US2 (Phase 4)**: Depends on the security foundation and requires the canonical academic-period/assessment and student-identity source migrations before its RPCs, DAL, and UI.
- **US3 (Phase 5)**: Depends on US2's period, assessment, and display-identity schema; its RPCs precede DAL/actions and UI.
- **Polish (Phase 6)**: Depends on all three desired stories and all database/RPC tests.

### User Story Completion Order

- **US1 (P1)**: Start after T001-T013. This is the suggested MVP and must pass the TU negative access, approved-source, complete-scope, and safe-unavailable tests before demo.
- **US2 (P2)**: Start after the security foundation; requires its own source migrations and assignment-denial tests. It does not depend on the US1 UI.
- **US3 (P3)**: Start after the academic-period, assessment, and student-identity tasks in US2; it does not depend on the US2 UI.

### Parallel Opportunities

- T015 and T016 can be developed in parallel after T001-T013; they are separate SQL functions and migration files.
- T023 and T024 can be built in parallel after T020-T022 because they are separate RSC widget files.
- T030 and T031 can be developed in parallel after T026-T029; keep their migration identifiers ordered and apply them in sequence.
- T036 and T037 can be built in parallel after T033-T035 because the schedule list and student matrix are independent components.
- T040 and T041 can be developed in parallel after T026-T028 and T039; they use separate RPC contracts and migration files.
- T046 and T047 can be built in parallel after T043-T045 because the itinerary and leaderboard are independent components.

## Parallel Execution Examples

```text
After T001-T014:
  Task: T015 Implement school schedule RPC in supabase/migrations/202610030003_dashboard_school_schedule_rpc.sql
  Task: T016 Implement teacher performance RPC in supabase/migrations/202610030004_dashboard_teacher_performance_rpc.sql

After T020-T022:
  Task: T023 Build semantic school schedule timeline in src/app/components/dashboard/SchoolScheduleTimeline.tsx
  Task: T024 Build teacher performance matrix in src/app/components/dashboard/TeacherPerformanceTable.tsx

After T043-T045:
  Task: T046 Build teacher itinerary in src/app/components/dashboard/TeacherItinerary.tsx
  Task: T047 Build teacher leaderboard in src/app/components/dashboard/TeacherLeaderboard.tsx
```

## Implementation Strategy

### MVP First

1. Complete T001-T013. The TU RLS patch, approved source records, exact role/assignment scope, and transport unavailable-state gate are release prerequisites.
2. Complete US1 T014-T028: school schedule and teacher-status RPCs, safe DTOs/actions, role factory, streamed widgets, and macro E2E.
3. Stop and validate the standalone ADMIN/WAKA_KURIKULUM/TU experience, including direct TU reads of protected tables.
4. Do not expose the student widgets until US2 source records and assignment tests pass.

### Incremental Delivery

1. Security foundation and teacher-status provenance.
2. US1 macro operations MVP.
3. US2 assigned-class student monitoring using canonical dated assessments and attendance.
4. US3 assigned-teacher itinerary and period leaderboard.
5. Cross-role mobile/accessibility/performance verification and quickstart sign-off.

## Notes

- Every Server Action task requires `getUser()`-derived identity, strict Zod validation, zero-trust RPC checks, safe result payloads, and `Promise.all()` for independent aggregate queries. No task accepts Auth UID from the UI.
- RSC widgets call the DAL directly and remain separated by Suspense boundaries; the Server Action façades do not combine the production widgets into one blocking render.
- `[P]` marks only independent files with satisfied prerequisites. All tasks include their exact target file paths and all story-phase tasks carry the matching story label.