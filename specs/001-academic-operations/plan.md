# Implementation Plan: Guruku Academic Operations

**Branch**: `001-academic-operations` | **Date**: 2026-09-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification at `specs/001-academic-operations/spec.md` plus the technical architecture supplied with `/speckit-plan`.

## Summary

Migrate the dashboard template into a server-first academic operations system. Keep page and layout rendering in React Server Components, limit Client Components to interactive leaves, and perform every mutation through validated Next.js Server Actions. Use request-scoped Supabase SSR clients with the signed-in user's identity, PostgreSQL as the source of truth, and RLS as the database authorization boundary. Use transactional database logic for schedule conflicts and absence alerts. Parse spreadsheets in the browser and submit idempotent batches of at most 100 rows so a 1,000-row import never becomes one oversized or long-running server request. Detailed decisions and tradeoffs are in [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5, React 19, Next.js 16.2.11 (existing package versions).

**Primary Dependencies**: Existing Next.js and React stack; add `@supabase/supabase-js`, `@supabase/ssr`, `zod`, and SheetJS (`xlsx`). Proposed tests: Vitest for application rules, Playwright for browser journeys, and Supabase CLI/pgTAP for database policies and triggers.

**Storage**: Supabase PostgreSQL with Supabase Auth; schema and RLS changes tracked as SQL migrations.

**Testing**: Unit tests for validation and grading contracts; pgTAP tests for RLS, constraints, triggers, and RPCs; Playwright role-based journeys; a 1,000-matrix import benchmark; production build validation.

**Target Platform**: Next.js server runtime on Vercel and Supabase managed PostgreSQL/Auth. Local development uses the existing Node.js application with Supabase local development services.

**Project Type**: Existing single-project Next.js web application, migrated from a client-heavy template and in-memory demo API handlers.

**Performance Goals**: 1,000 assessment matrices imported in chunks of at most 100 rows, with each invocation below the deployment's configured function-duration limit and no request timeout or blocking of unrelated use. Schedule conflicts are shown during the edit interaction and before publication. Tune numeric p95 targets after a representative deployment benchmark.

**Constraints**: No academic REST Route Handlers; all mutations use Server Actions. All action input is Zod-validated and authorized server-side. Anonymous database access is denied. RLS and least-privilege grants apply to every exposed table. Never send a Supabase secret/service-role key to the browser. Keep action payloads below Next.js's default 1 MB body limit unless a reviewed configuration change is required. Preserve current route URLs where practical while converting layouts and pages to RSC. Walikelas Default Present is a form default only, not persisted attendance. ESP32 events and WFH requests remain pending until Operator TU explicitly approves or rejects them. Approved transport rates and formulas must be effective-dated and traceable; unresolved school policy is a prerequisite, not an implementation-time guess.

**Scale/Scope**: Five school roles; master data, term schedules, class sessions, attendance, teaching journals, grade matrices and policies, notifications, audit history, exports, and imports of at least 1,000 grade matrices.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Plan evidence |
|---|---|---|
| I. Least-Privilege Roles | PASS | Server Actions verify the authenticated actor and assignment; RLS and grants deny anonymous access and scope each role's reads/writes. TU has only the explicit approval/rejection authority for teacher attendance events and authorized transport-policy configuration; no general academic-table mutation is granted. |
| II. Auditable Single Source of Truth | PASS with policy prerequisite | Normalized academic records, unique business keys, actor/time audit events, explicit ESP32/WFH provenance and TU approval, and exports derived only from approved records. Transport policy must be supplied by the school before calculation acceptance. |
| III. Configurable and Fair Assessment | PASS | Versioned grading policies, stored component inputs, database-side aggregation, and explicit athlete-period treatment. |
| IV. Event-Driven Operational Awareness | PASS | Database-enforced schedule conflicts and transactional attendance-triggered notifications, with correction/reconciliation tests. |
| V. Reliable Bulk I/O | PASS with approval gate | Browser parsing, validated serial batches, idempotent upserts, row-level rejection reports, a 1,000-row load gate, and payroll-support exports containing only TU-approved attendance and traceable transport policy versions. |

No constitution violations identified. Database triggers and RLS tests are required domain controls, not optional infrastructure layers.

## Project Structure

### Documentation (this feature)

```text
specs/001-academic-operations/
|-- plan.md
|-- research.md
|-- data-model.md
|-- contracts/
|   |-- server-actions.md
|   `-- import-export.md
|-- quickstart.md
`-- tasks.md                 # Produced by /speckit-tasks, not this command
```

### Source Code (repository root)

```text
src/
|-- app/
|   |-- (DashboardLayout)/   # Keep route group and URLs; convert layouts/pages to RSC
|   |-- actions/             # Server Action entry points for academic mutations
|   |-- components/          # Server-first feature components and client leaf islands
|   `-- api/                 # Remove legacy demo Route Handlers after callers migrate
|-- lib/
|   |-- auth/                # Request identity and role/assignment authorization
|   |-- validation/          # Shared Zod schemas
|   `-- supabase/            # Request-scoped server client; no service-role browser client
`-- proxy.ts                 # Supabase SSR session refresh for Next.js 16

supabase/
|-- migrations/              # Tables, enums, constraints, grants, RLS, functions, triggers
`-- tests/                   # pgTAP policy, constraint, trigger, and RPC tests

tests/
|-- unit/                    # Zod boundary and pure grading/import rules
`-- e2e/                     # Role workflows, schedule conflicts, alerts, bulk I/O
```

**Structure Decision**: Keep one Next.js project and the existing `src/app` route tree. Server Components load scoped data through a request-specific Supabase server client. Client islands handle forms, charts, spreadsheet selection/parsing, pending states, and progress only. Server Actions validate, authorize, call the user-scoped Supabase client, and revalidate affected views. Database migrations and pgTAP tests live beside the application in `supabase/`. Existing blog, notes, and ticket APIs are template demo surfaces; audit their consumers, migrate retained mutations to Server Actions, and remove all `/api/*` Route Handlers before the no-API gate passes. Waka coordinates schedules through a non-academic change-request queue and school-wide read-only analytics; only Administrator publishes academic schedules. TU has narrowly scoped writes for explicit teacher-attendance approval/rejection and authorized transport-rate configuration, but no student academic-data mutation. The database trigger remains the final schedule-conflict gate.

## Complexity Tracking

No constitution violations require an exception. The required database trigger and RLS layers centralize integrity and access rules so they apply beyond a particular UI path; avoiding them would weaken the specified guarantees.

## Post-Design Constitution Re-check

| Principle | Gate | Phase 1 evidence |
|---|---|---|
| I. Least-Privilege Roles | PASS | RLS/grants define role and assignment scopes. Waka proposal writes are limited to a separate workflow table. TU writes are limited to explicit attendance decisions and authorized transport-rate configuration; TU cannot mutate student academic records. |
| II. Auditable Single Source of Truth | PASS with policy prerequisite | Normalized session/attendance data, stable upsert keys, source and approval history for ESP32/WFH events, audit records, and versioned exports are represented in the data model. Transport formulas/rates remain school-approved configuration inputs. |
| III. Configurable and Fair Assessment | PASS | Versioned policies cover configured Sumatif subweights and period-scoped athlete handling. |
| IV. Event-Driven Operational Awareness | PASS | Transactional triggers create conflict rejection and scoped absence notifications; correction paths are defined. |
| V. Reliable Bulk I/O | PASS with approval gate | Import contract uses browser parsing, bounded serial chunks, schema validation, idempotent retries, row-level outcomes, and payroll-support exports traceable to approved attendance and effective transport configuration. |

No post-design constitution violations identified. Numeric latency SLOs and school export formats remain deployment/product validation items, not principle exceptions.
