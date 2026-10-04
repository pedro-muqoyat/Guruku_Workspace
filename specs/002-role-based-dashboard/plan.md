# Implementation Plan: Role-Based Dashboard

**Branch**: `002-role-based-dashboard` | **Date**: 2026-10-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-role-based-dashboard/spec.md`

## Summary

Deliver disjoint, least-privilege views for Administrator/TU operations, Waka Kurikulum executive analytics, Walikelas monitoring, and subject-teacher execution. Keep `page.tsx` as a role-view orchestrator; stream independent async Server Component widgets through sibling Suspense boundaries; fetch only minimal, authorized DTOs through a server-only DAL and caller-scoped PostgreSQL RPCs. Waka analytics use a dedicated aggregation path and never share TU operational actions. Add missing source data and tighten role access before presenting metrics as authoritative. Research and alternatives are recorded in [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5; Next.js 16.2.11 App Router; React 19.2.

**Primary Dependencies**: `@supabase/ssr` 0.12, `@supabase/supabase-js` 2, Tailwind CSS 4, existing Shadcn UI/Radix primitives, Zod 4.6.

**Storage**: Local/hosted Supabase PostgreSQL with GoTrue Auth, RLS, request-authenticated SQL RPCs, and existing schedule/session/attendance/grade relations.

**Testing**: `npx tsc --noEmit`, `npm run build`, the existing `node test-dashboard-rpc.js` E2E path expanded for role coverage, Supabase database policy tests, and responsive/accessibility browser checks. No dedicated unit/UI test runner is currently declared.

**Target Platform**: Authenticated school-workspace web application; responsive desktop, tablet, and mobile browsers.

**Project Type**: Existing single Next.js App Router application with Supabase data access.

**Performance Goals**: Render and stream the static dashboard shell without awaiting widget queries; each widget resolves independently. Meet the spec's two-second information-finding outcome and target CLS 0.00 for fallback-to-content replacement through reserved geometry. “0 ms” is not a literal network or render guarantee; measure actual server-shell and widget timings.

**Constraints**: No service-role access in request paths; every Server Action authenticates with `auth.getUser()`, validates untrusted input with Zod, and returns a safe discriminated result. RPCs independently enforce role and assignment scope. Personalized responses are not shared-cached. RSCs do not format timestamps with `Intl` or perform timezone conversion. Lists and data tables retain their semantic structures; 5+ column tables scroll internally with a sticky identity column. Attendance summaries consume persisted records and expose source/approval state; no unsubmitted Default Present UI value is attendance evidence. TU operational totals include only explicitly approved ESP32/WFH events. Transport values require the effective approved formula/rate version and must be unavailable when school policy is missing or ambiguous.

**Scale/Scope**: One school workspace, current school day, active academic term, and records within the caller's assigned classes/teaching schedules. Query sizes are bounded to these scopes and ranked lists; exact school enrollment counts are not present in the repository and must be established from deployment data before tuning indexes or limits.

## Constitution Check

*GATE: Evaluated before Phase 0 and re-evaluated after the Phase 1 design below.*

| Principle | Plan decision and evidence | Gate |
|---|---|---|
| Least-Privilege Roles | Each RPC derives `auth.uid()`, checks the normalized database role, and validates the applicable assignment. A migration removes TU access to student rows and scores through direct table queries; TU receives only the narrow operations summary. Tests cover allowed and denied roles/assignments. The current broad TU policies are a known gap that implementation must close. | PASS with required remediation |
| Executive role isolation | Waka analytics have a separate aggregate RPC, DAL, API boundary, and RSC. Only an exactly verified `WAKA_KURIKULUM` profile receives HTTP 200; TU, ADMIN, unauthenticated, and all other roles receive HTTP 403. Current schema uses `WAKA`, so role-contract alignment is a blocking prerequisite; it is not an implicit alias. | PASS with role-schema prerequisite |
| Auditable Single Source of Truth | Schedule, score, and attendance values remain sourced from canonical records. Teacher non-present statuses require explicit validated source records; missing evidence is never interpreted as attendance. The existing academic-period/assessment design is reused, not duplicated. | PASS |
| Configurable and Fair Assessment | The dashboard sums recorded score points for its stated period; it does not calculate, mutate, or relabel final grades or bypass grading policies. | PASS |
| Event-Driven Operational Awareness | Today's schedule and validation state expose classes without confirmed teaching activity. This dashboard does not replace conflict detection or create notifications. | PASS |
| Reliable Bulk I/O | No import/export or bulk write is introduced. Reads use bounded date/period and assignment scopes; returned rows are only the fields required by widgets. | PASS |
| Attendance approval and transport provenance | The read-only TU dashboard consumes explicit Operator TU decisions and source-tagged ESP32/WFH records. It displays transport only when an approved, effective formula/rate is resolvable and identifies the version and period. | PASS with school policy prerequisite |

No constitutional exception is requested. The security gate fails if implementation leaves TU able to select student-level tables or if a role/assignment denial test fails.

## Architecture and Data Flow

1. `page.tsx` remains a thin orchestrator. It returns the stable dashboard frame and an outer role-resolution Suspense boundary without awaiting Supabase I/O in the page body.
2. `DashboardRoleFactory` is an async Server Component. It verifies the request with `auth.getUser()`, reads the authoritative profile role, normalizes only supported Walikelas aliases, resolves all applicable assignments, and fails closed for missing/unknown roles. It never defaults an absent role to GURU.
3. Each role view composes its own widgets. Each schedule list and performance table has an independent sibling `<Suspense>` boundary and a matching skeleton. The shell can flush before widget data; authentication/role resolution still takes non-zero time and is measured rather than described as 0 ms.
4. Async widgets call server-only query functions under `src/lib/dashboard/`. The DAL uses the request-scoped Supabase SSR client and minimal DTOs; it never imports the service-role key. Widget reads do not call exported Server Actions, consistent with installed Next.js guidance favoring server-side reads in Server Components/DAL.
5. Every exported function retained in `src/app/actions/dashboard.ts` is still an untrusted POST entry point: call `auth.getUser()`, parse strict Zod input, authorize, then call the scoped DAL/RPC. It returns a stable `{ success, data, error?, status }` result and catches expected/unexpected failures without throwing database details to the UI.
6. Each PostgreSQL RPC repeats caller role/assignment checks using `auth.uid()`; the client cannot submit a trusted user ID, role, or assignment. `SECURITY DEFINER` functions use a fixed `search_path`, qualified object names, revoked PUBLIC/anon execution, and an explicit `authenticated` grant.
7. Role views are disjoint: ADMIN receives the school operations view; TU receives only the operational schedule and teacher-status/JP summary; exact `WAKA_KURIKULUM` receives the executive curriculum view; WALI aliases receive assigned-class monitoring; GURU receives assigned-schedule itinerary and leaderboard. MURID and unknown roles receive no widgets. ADMIN/TU never inherit the Waka executive context.
8. `CurriculumExecutiveTable` is an async Server Component with its own sibling `<Suspense>` boundary and matching fallback, separate from TU schedule/performance boundaries. Aggregate distribution may use its own similarly isolated async widget. They call `src/lib/dashboard/curriculum.ts` and a dedicated `get_curriculum_analytics` RPC; neither imports, invokes, nor shares a Server Action with the TU operational table.
9. The Waka DAL verifies `await supabase.auth.getUser()` directly, loads the authoritative profile, and requires exact `WAKA_KURIKULUM` before invoking the RPC. The RPC independently derives `auth.uid()` and repeats the exact role check. A dedicated `GET /api/dashboard/curriculum-analytics` adapter maps Waka success to actual HTTP 200 and TU/ADMIN/other-role denial to actual HTTP 403 with no executive DTO. RSC widgets call the DAL directly; the API adapter is not inserted as a client-side round trip.
10. If a Waka Server Action is later needed, it lives in a separate Waka-only module, validates input, derives identity only from `getUser()`, and does not share the TU action module. Dashboard display reads remain direct server-only DAL reads so independent widgets can stream.
11. RPC failures map to per-widget error states. Missing scores, targets, validation, or periods remain unavailable, never zero or inferred attainment. Executive responses contain aggregate class/subject scores only and no student identifiers or individual score rows. Personalized results are not shared-cached.

### Streaming, Time, and Layout Invariants

- Use a static shell/outer fallback plus one Suspense boundary per async widget. Skeleton and resolved widget share reserved outer dimensions, including `min-h-[300px]`, to target no layout shift during replacement; CLS is measured because a CSS minimum alone cannot promise absolute zero for arbitrary row counts.
- `LocalTime` remains a leaf Client Component for UTC instants. Client Components are prerendered on the first request, so the initial output must be deterministic (stable placeholder) and browser formatting runs only after mount using the passed school timezone. Reserve label width to prevent the post-hydration update from moving surrounding content. RSCs pass raw ISO strings and do not call `Intl` or convert zones.
- Recurring schedule `time` values are local wall-clock values, not instants; render the stored local value as text/`<time>` without converting it through the server timezone.
- Timeline/itinerary widgets render semantic `<ul>`, `<li>`, and `<time>` elements. Performance widgets use Shadcn `<Table>` semantic header/body/cell primitives. At five or more columns, the table is inside an `overflow-x-auto` container and the first identity column uses `sticky left-0`; no CSS grid is applied inside table rows/cells. The page itself has no horizontal overflow.
- Status/trend pills include text labels and traffic-light colors; color is not the only signal. Keyboard users can focus and scroll the contained table.

## Required Data and Database Design

The currently installed schema cannot fully satisfy this feature. Before UI acceptance, database work must: (a) expose student display names from a canonical student record; (b) use an academic period and dated assessment relation aligned with the `001-academic-operations` data model for daily and term queries; (c) add or integrate a validated teacher non-present-status source for Izin/Sakit/Alpa; (d) use `class_sessions.session_date` and actual `total_jp`, not `created_at` UTC date or a count of sessions; (e) provide today's schedule and all relevant assignments; (f) prevent TU direct reads of students, attendance logs, and grades; and (g) return only safe display fields via role-checked dashboard RPCs. Detailed target fields and aggregation rules are in [data-model.md](data-model.md), with the DTO/RPC boundary in [contracts/dashboard-data.md](contracts/dashboard-data.md).

Waka executive analytics require additional canonical sources: an exact `WAKA_KURIKULUM` profile role (the current role constraint and RPCs use `WAKA`, which MUST NOT be silently treated as equivalent); per-teacher curriculum workload targets by month/semester; validated delivered JP; and dated scores tied to the academic period. The dedicated analytics RPC returns workload attainment/deficit and class-subject average points only. It exposes no student-level rows and fails closed when targets or source evidence are missing.

Current nightly materialized views are unsuitable for a real-time “today” status: they group by UTC `created_at`, can be stale, and the teacher view does not produce Izin/Sakit/Alpa. Keep today's status/schedule queries live and indexed. A term leaderboard may use a bounded, indexed aggregate; only add a materialized view if measured volume justifies its freshness/refresh contract.

## Project Structure

### Documentation (this feature)

```text
specs/002-role-based-dashboard/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── dashboard-data.md
└── tasks.md                         # Produced by /speckit-tasks, not this plan
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (DashboardLayout)/page.tsx                 # shell and role factory orchestration only
│   ├── actions/dashboard.ts                       # validated, authenticated action boundaries
│   ├── api/dashboard/curriculum-analytics/route.ts # Waka-only HTTP 200/403 boundary
│   └── components/dashboard/
│       ├── DashboardRoleFactory.tsx
│       ├── SchoolOperationsView.tsx
│       ├── CurriculumExecutiveView.tsx
│       ├── CurriculumExecutiveTable.tsx
│       ├── AcademicDistributionTable.tsx
│       ├── HomeroomView.tsx
│       ├── SubjectTeacherView.tsx
│       ├── SchoolScheduleTimeline.tsx
│       ├── ClassScheduleTimeline.tsx
│       ├── TeacherItinerary.tsx
│       ├── TeacherPerformanceTable.tsx
│       ├── HomeroomStudentTable.tsx
│       ├── TeacherLeaderboard.tsx
│       ├── DashboardWidgetSkeleton.tsx
│       ├── StatusBadge.tsx
│       ├── TrendBadge.tsx
│       └── LocalTime.tsx
├── lib/
│   └── dashboard/
│       ├── access.ts                              # verified viewer and role scopes
│       ├── queries.ts                             # server-only DAL and RPC calls
│       ├── curriculum.ts                          # WAKA_KURIKULUM-only aggregate DAL
│       ├── schemas.ts                             # strict Zod inputs
│       ├── types.ts                               # DTOs and safe result union
│       └── dates.ts                               # school-date policy; no RSC timezone formatting
└── types/database.types.ts                        # regenerated Supabase function/table types

supabase/
├── migrations/
│   ├── 202610030001_dashboard_source_alignment.sql
│   ├── 202610030002_dashboard_role_rpcs.sql
│   └── 202610030003_curriculum_analytics_rpc.sql
└── tests/
    └── dashboard_role_access.test.sql

scripts/
└── test-dashboard-role-matrix.js                 # extend/add E2E role and safe-payload coverage
```

**Structure Decision**: Extend the existing App Router project. Keep ADMIN/TU operations in their role-scoped DAL/action boundary. Waka analytics use a dedicated DAL, role-checked RPC, separate HTTP status adapter, and isolated RSC/Suspense widget; no executive table shares a TU Server Action. SQL owns heavy aggregation and final authorization. Do not create a separate deployable service or client-side dashboard data store.

## Constitution Re-check After Design

The design satisfies least privilege only with TU RLS hardening, exact Waka role provisioning, and positive/negative role tests. Executive analytics are aggregate-only, separate from TU operations, and preserve canonical assessment sources. Reviewer evidence includes direct TU table-denial tests, Waka-only HTTP 200 versus ADMIN/TU 403, role/assignment RPC tests, teacher-status provenance, and source-to-aggregate parity. No exception is requested.

## Complexity Tracking

No constitutional exception or additional deployable project is required. The DAL and RPC layers are retained because they enforce minimal DTOs and database-side scope; direct page-level table queries would not satisfy the zero-trust boundary.
