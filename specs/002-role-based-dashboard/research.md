# Research: Role-Based Dashboard

## Decisions

### 1. Server-only DAL for reads; authenticate every action boundary

**Decision**: RSC widgets read through a server-only dashboard DAL. Keep `src/app/actions/dashboard.ts` only for explicit Server Action entry points; every exported action calls `supabase.auth.getUser()`, validates input with strict Zod schemas, authorizes, then reaches the DAL/RPC. Never use a service-role client for a user request.

**Rationale**: The installed Next.js 16 data-security guide recommends a server-only DAL that authorizes and returns minimal DTOs. The Server Actions guide describes actions as reachable POST entry points and recommends server-side reads for parallel work. This also retains the requested `getUser()`-before-RPC rule for all action calls.

**Alternatives considered**: Have every widget invoke a `'use server'` read action. Rejected because it uses a mutation-oriented public boundary for internal RSC reads and obscures data access. Query Supabase directly from each widget. Rejected because authorization, DTO minimization, and error mapping would be duplicated.

**Evidence**: [Next.js data security](../../node_modules/next/dist/docs/01-app/02-guides/data-security.md), [Server Actions](../../node_modules/next/dist/docs/01-app/02-guides/server-actions.md), current [dashboard actions](../../src/app/actions/dashboard.ts).

### 2. Stream the frame and independent widget results, not a literal zero-millisecond route

**Decision**: The page returns a non-blocking shell; an outer boundary covers role resolution; each async widget has its own sibling Suspense boundary and dimension-matched fallback. Measure shell and widget timings. Treat “0ms” as “the page shell does not await widget queries,” not a physical latency promise.

**Rationale**: Next.js streams resolved Suspense boundaries independently, but request authentication and database access are dynamic I/O. The existing page awaits auth, profile, and scope before returning any JSX, so widget boundaries alone cannot stream the shell first.

**Alternatives considered**: Keep all identity and widget queries in `page.tsx`. Rejected because it blocks the shell and couples failures. Promise an exact 0ms or unconditional CLS=0. Rejected because the network, auth, and data latency are non-zero and reserved minimum height cannot control arbitrary content growth.

**Evidence**: [Next.js fetching and streaming](../../node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md), [granular streaming](../../node_modules/next/dist/docs/01-app/02-guides/streaming.md), existing [dashboard page](../../src/app/(DashboardLayout)/page.tsx), [widget skeleton](../../src/app/components/dashboard/TableSkeleton.tsx).

### 3. Client-only time formatting needs a deterministic initial render

**Decision**: Pass raw ISO timestamps and an explicit school timezone to a small `LocalTime` Client Component. Its server/prerender and first client render use the same placeholder; browser formatting runs after mount, with reserved width. RSCs do not call `Intl` or convert timezones. Render recurring schedule wall-clock values without converting them as instants.

**Rationale**: Next.js prerenders Client Components into initial HTML. The current `LocalTime` is hydration-safe because it starts with a placeholder and formats in `useEffect`, but that post-hydration replacement can shift text and currently uses browser-default timezone. It needs explicit school timezone and stable geometry.

**Alternatives considered**: Format to the browser timezone in an RSC. Rejected by the required boundary and inconsistent for school-day semantics. Render an uncoordinated server-localized value then browser-localized text. Rejected because it can mismatch during hydration.

**Evidence**: [Server and Client Components](../../node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md), [current LocalTime](../../src/app/components/dashboard/LocalTime.tsx).

### 4. Enforce TU's data limit at the database boundary

**Decision**: Retain the requested TU school schedule and teacher-summary view, but remove TU from direct student, attendance-log, and grade SELECT policy branches. Expose minimal teacher display names and operational rows via macro RPCs that allow only ADMIN/TU and return no student records. WAKA_KURIKULUM uses its separate executive analytics contract and is denied from the ADMIN/TU operational RPCs. Add direct-table negative policy tests.

**Rationale**: The feature spec prohibits student-level data for TU. Current SELECT grants and RLS predicates include TU on `students`, `class_sessions`, `attendance_logs`, and `student_grades`; restricting only the dashboard widget or ranking RPC does not stop direct Supabase queries. TU also cannot read other users' profile names under the current profile policy, so a minimal macro DTO is safer than broadening profile visibility.

**Alternatives considered**: Hide student widgets in the role factory. Rejected because UI hiding is not authorization. Grant TU access to all user profiles for teacher names. Rejected because it exposes more profile data than needed.

**Evidence**: [core schema and RLS](../../supabase/migrations/202609290001_core_schema.sql), [dashboard RPCs](../../supabase/migrations/202610020001_dashboard_rpcs.sql).

### 5. Use canonical occurrence and assessment dates; do not use nightly views for live widgets

**Decision**: Today's schedule joins recurring schedules to the configured school date and session occurrence by `class_sessions.session_date`. Workload sums `total_jp`, not session row count. Student daily score uses canonical assessment date in the school timezone. The term leaderboard uses the active and previous completed `academic_periods` from the `001-academic-operations` model. Today's state is queried live; term aggregation is bounded and indexed before considering a materialized view.

**Rationale**: Existing MVs group by UTC `created_at`, refresh nightly, and the teacher aggregate currently counts class-session rows rather than each session's JP. The live grade schema has no assessment-period relation and cannot calculate term totals or a historical trend correctly.

**Alternatives considered**: Reuse current materialized views unchanged. Rejected because they can be stale, use the wrong business date, and lack cross-subject/term semantics. Infer a score's period from its creation timestamp. Rejected because record entry time is not necessarily the assessment date.

**Evidence**: [daily view migration](../../supabase/migrations/202609300001_dashboard_materialized_views.sql), [latest ranking RPC](../../supabase/migrations/202610020003_dashboard_ranking_subject.sql), [canonical academic data model](../001-academic-operations/data-model.md).

### 6. Add only missing dashboard source fields and keep role assignments canonical

**Decision**: Reuse `user_profiles`, `roles`, `user_roles`, `schedules`, `class_sessions`, `attendance_logs`, and the canonical 001 period/assessment model. Align the physical schema to provide student display names, assessment date/period identity, and validated teacher non-present status with provenance. Do not add a second role-assignment or academic-period model.

**Rationale**: The current `students` table has no name, current `student_grades` has no assessment or period FK, and the schema has no teacher Izin/Sakit/Alpa source. Those are real data dependencies, not presentation-only gaps. The existing 001 design already describes canonical academic periods and assessment relationships but is not yet present in installed migrations.

**Alternatives considered**: Return UUID fragments as display names or infer names from Auth metadata. Rejected because they are not stable school identity data. Guess a period from grade timestamps or mark no scheduled session as Alpa. Rejected because these would present fabricated business facts.

### 7. Fail closed and return safe widget states

**Decision**: Normalize only supported role aliases; missing, unknown, MURID, or unauthenticated identities get no role widgets. Query errors map to per-widget safe status codes and do not expose raw database messages. No rows, no source record, and query failure remain distinct states.

**Rationale**: The current page defaults missing profile roles to GURU and its macro role branch also renders a class-progress widget for TU. Current action results already use success/status/error semantics; the new contract should preserve a discriminated, typed result without `any`.

**Alternatives considered**: Default unknown identities to a common role or treat errors as empty arrays. Rejected because both can disclose data or hide operational failures.

## Resolved Constraints

- There are no UI mutations in this feature; direct RSC reads use the DAL. If a client-triggered Server Action is added, it must authenticate, validate, authorize, and return the contract in `contracts/dashboard-data.md`.
- Teacher absence/leave statuses require an upstream authoritative validated record. Absence of a session or journal is not evidence of Alpa. A conflicting explicit absence and completed teaching record is surfaced as a data conflict for correction.
- Multiple student attendance states on one school day are summarized as `Campuran` with counts; no attendance row is `Belum tercatat`, not Hadir or Alpa.
- A leaderboard total includes only assessments belonging to the teacher's assigned class/subject schedules and the active period; tie order is total descending, display name ascending, then stable student ID.
- School-day boundaries use the configured school timezone. The current spec assumes that configuration exists; its authoritative storage is deployment configuration, not browser locale.