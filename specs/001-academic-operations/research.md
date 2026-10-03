# Research: Guruku Academic Operations

**Date**: 2026-09-29

## Decisions

### Server-first reads and mutations

**Decision**: Keep route pages/layouts as React Server Components. Read academic data on the server with a request-scoped Supabase SSR client. Put mutations in asynchronous Server Actions. Restrict `use client` to interactive leaf components. Do not add conventional `/api/*` handlers for academic operations.

**Rationale**: The project already uses Next.js App Router, React 19, and TypeScript. Next.js documents Server Actions as network-reachable POST functions, not private callbacks; every action must independently authenticate and authorize its caller. An action can return updated UI in the same round trip, but it still incurs a request and client invocations are currently dispatched sequentially. Therefore Server Actions do not remove the network boundary or replace security checks.

**Security decision**: Create a new Supabase server client per request using `@supabase/ssr` and the signed-in user's cookies/claims. Verify identity with Supabase Auth claims, then check role and assignment in the action. Use `NEXT_PUBLIC_SUPABASE_ANON_KEY` in public configuration and the user session for database access. Never use or expose a service-role/secret key for ordinary academic actions. RLS remains mandatory even when actions perform authorization.

**Alternatives considered**: Route Handlers for every mutation conflict with the supplied architecture. A service-role client would bypass RLS and enlarge the impact of action mistakes, so it is rejected for normal user workflows.

### Payload validation and client boundaries

**Decision**: Define Zod schemas for every Server Action input and for each import row. Reject malformed, out-of-period, or out-of-assignment records before database writes. Client-side validation may improve previews but is never authoritative. Server Component boundaries carry serializable data and server actions only; browser-only APIs and event handlers stay in small client leaves.

**Rationale**: Server Actions can be invoked directly with crafted requests. Next.js currently limits a Server Action request body to 1 MB by default. Validation and authorization must not depend on the rendered form or client-side role checks.

**Alternatives considered**: Trusting form constraints or validating only in PostgreSQL would provide poor user feedback or allow malformed payloads to reach data operations; neither replaces the mandatory action-boundary schema validation.

### Normalized PostgreSQL model and grade calculation

**Decision**: Separate class sessions from per-student attendance records. Keep grade components and versioned policy weights as relational data. Compute aggregates in a database view or RPC, with the view configured as `security_invoker` where appropriate so it does not bypass RLS. Preserve policy/version and component inputs used for finalized results.

**Rationale**: Session-level data is shared by a class while each attendance row belongs to one student; separating them removes repeated session facts. A database-owned calculation is consistent across teacher entry, homeroom aggregates, and exports. PostgreSQL views normally execute with the view owner's rights; Supabase recommends `security_invoker` for views that must obey underlying RLS.

**Alternatives considered**: Calculating final grades in browser or process memory would allow inconsistent results and would not establish a single authoritative calculation. A privileged security-definer view/function is rejected unless isolated, pinned to a safe search path, and explicitly tested.

### RBAC, grants, and RLS

**Decision**: Enable RLS for every table reachable through an exposed schema, revoke broad default grants from `anon` and `authenticated`, then grant only required operations. Write explicit policies by operation and role/assignment. Waka and TU receive school-wide analytical `SELECT` access only; neither mutates academic tables. Waka submits schedule-change proposals to a separate workflow queue, and only Administrator publishes schedule rows. Store authorization roles in server-managed profile/role relations, not user-editable Auth metadata. Index columns used by policies. Test allow and deny behavior for each table with pgTAP.

**Rationale**: Supabase documents that RLS policies do not revoke SQL grants; both are required. A missing grant rejects access before policy evaluation. User-editable metadata is not safe for authorization. Role helpers used in policies must avoid recursive policy references; any security-definer helper belongs in a private schema, uses a pinned search path, and has limited execute grants.

**Alternatives considered**: UI-only role gating, a trusted client-supplied role, or broad `service_role` access would not meet least privilege and are rejected.

### Schedule collision integrity

**Decision**: Use a PostgreSQL `BEFORE INSERT OR UPDATE` trigger for schedules. The trigger obtains a transaction-scoped advisory lock for the teacher/period/day collision key, performs an indexed half-open interval overlap check, and raises a constraint-style error if a conflict exists. Waka's proposal action provides a conflict preview; the Administrator publication action maps any trigger rejection to a safe conflict result. Add concurrency tests for simultaneous conflicting writes.

**Rationale**: A plain trigger that only scans for overlap can race when concurrent transactions both see no conflicting row. The advisory lock serializes checks for the same collision key; a half-open range treats adjacent lessons as non-overlapping. The trigger enforces the requested rollback behavior while keeping the rule inside PostgreSQL.

**Alternatives considered**: A check only in the scheduling form is bypassable and race-prone. A PostgreSQL exclusion constraint over range types plus `btree_gist` is a sound alternative and may replace the trigger if schema review prefers declarative enforcement; do not implement both duplicate mechanisms without a demonstrated need.

### Consecutive-absence notifications

**Decision**: An attendance trigger recalculates the affected student's latest applicable sessions when an `Alpa` record is inserted or corrected. On three consecutive absent sessions, it inserts a recipient-scoped notification in the same transaction, protected by a unique deduplication key. Attendance corrections reconcile or resolve the alert and preserve audit history.

**Rationale**: Persisting a notification avoids repeated dashboard-wide scans. Recalculating the affected student's ordered sessions is necessary to handle corrections, late imports, and non-consecutive lessons correctly; it is safer than a fragile decrement-only counter. Index attendance by student/session and sessions by class/date/period.

**Alternatives considered**: Recomputing every student's attendance streak on each dashboard view creates repeat work. Counting calendar days rather than scheduled class sessions conflicts with the specification.

### Spreadsheet import and bulk upsert

**Decision**: Parse `.xlsx` locally in the browser with SheetJS using the File API. Validate workbook headers and preview errors, normalize rows, then submit serial Server Action calls with at most 100 rows per chunk. Validate each chunk with Zod on the server and upsert valid rows using stable keys; return per-row rejection reasons and chunk progress. Make retries idempotent and never send the binary workbook to the server.

**Rationale**: This avoids server-side binary parsing and keeps requests well below the current 1 MB Server Action body limit. Chunks bound memory and function duration. Unique business keys make a retry safe; action calls are serial by design in the supplied architecture. The selected Vercel plan's actual function duration and body limits must be confirmed during deployment configuration; the 15-second value in the brief is treated as a planning assumption, not a universal platform guarantee.

**Alternatives considered**: One action for all 1,000 rows risks request-size and duration limits. Server-side Excel parsing contradicts the requested browser-first ingestion path. Parallel action calls conflict with the explicit serial-chunk requirement and can increase contention.

## Documentation Consulted

- [Next.js: Mutating Data](https://nextjs.org/docs/app/getting-started/mutating-data) - Server Functions, direct invocation, per-action auth, revalidation, and serialized client calls.
- [Next.js: `serverActions` configuration](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions) - default 1 MB body-size limit and origin handling.
- [Supabase: SSR with Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) - request-scoped SSR clients, cookies, Next.js 16 `proxy.ts`, and verified claims.
- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) - grants plus policies, RLS testing, safe views, indexing, and security-definer cautions.
- [Supabase: Postgres Triggers](https://supabase.com/docs/guides/database/postgres/triggers) - transactional trigger functions and row/statement execution.
- [PostgreSQL: Range Types](https://www.postgresql.org/docs/current/rangetypes.html) - interval overlap operators, GiST indexing, and exclusion-constraint alternative.
- [SheetJS: Local File Access](https://docs.sheetjs.com/docs/demos/local/file/) - browser File/ArrayBuffer input and workbook parsing.

## Remaining Deployment Verification

- Confirm the Vercel project plan/runtime and configure a per-chunk deadline with adequate margin; benchmark 10 sequential chunks (1,000 rows) against a representative Supabase project.
- Obtain the school's exact e-Rapor and payroll-validation templates before freezing export column names and import mappings.
- Confirm whether schedule lessons recur weekly for a full term and whether any room/resource conflict rules beyond teacher overlap are required. The initial model assumes weekly day/time slots and teacher conflict detection.
- The technical brief makes Waka read-only for academic records but also assigns schedule orchestration. This plan resolves the boundary with a Waka proposal queue and Administrator-only publication; confirm that approval workflow during product review.
- The repository currently contains Netlify and Docker deployment configuration. This plan targets Vercel as required by the supplied serverless constraint; deployment ownership and removal of obsolete hosting configuration remain to be confirmed.