# Dashboard Data Contracts

## Trust Boundary

- Browser-visible data is rendered from minimal DTOs returned by the server-only dashboard DAL. No dashboard widget queries Supabase from a Client Component.
- The request client is the cookie-scoped Supabase SSR client using the anon/publishable key. Service-role credentials are forbidden in page, widget, DAL, and action requests.
- The DAL and every exported Server Action verify the current user with `auth.getUser()`. SQL RPCs independently check `auth.uid()`, the allowed role, and the corresponding assignment.
- Never accept `userId`, role, class ownership, or permission from the caller as proof. A supplied class/subject selector is only a filter and must be checked against the caller's assignments in SQL.
- Every function is fail-closed. Unknown role, no profile, no assignment, malformed payload, and database failure cannot fall back to GURU, an arbitrary class/subject, or another role's result.

## Logical RPC Inventory

These names describe logical contracts; final SQL identifiers may follow repository naming conventions while preserving the exact scope and result fields.

| Contract | Allowed callers | Scope derived in SQL | Minimum result |
|---|---|---|---|
| School schedule timeline | ADMIN, WAKA, TU | Current school date; all scheduled teachers/classes | Event ID, teacher display name, class name, subject name, local start/end time, scheduled JP, session/validation state |
| Teacher performance summary | ADMIN, WAKA, TU | Current school date; all teacher schedules and validated activity | Teacher ID/name, status, status validation state, scheduled JP, validated JP, safe freshness timestamp |
| Homeroom schedule | WALI aliases | All current-day schedules in every assigned class | Class, teacher, subject, local time, period, validation state |
| Homeroom student summary | WALI aliases | Students enrolled in all assigned classes on current school date | Student ID/name, daily score total or unavailable, attendance status/counts |
| Teacher itinerary | GURU | All current-day schedules for `auth.uid()` | Class, subject, local time, period, scheduled JP, validation state |
| Teacher leaderboard | GURU | Active period and prior completed period; only assigned class/subject schedules | Student ID/name, current total, prior total when available, delta/trend, deterministic rank |

Each contract returns only the listed projection. The macro contracts do not return student data; the student contracts never return rows outside assignment scope. Today's status RPCs read current source rows rather than the existing nightly materialized views.

## Server Action Input and Result

Dashboard display reads are DAL calls from async Server Components, not Server Actions. Any exported function in `src/app/actions/dashboard.ts` remains directly callable as an untrusted POST and must authenticate and validate before calling the DAL/RPC.

Zod input is a strict object. It may contain an optional ISO school date or class/subject filter only where the user flow exposes that selector. For the current-day widgets, derive the date server-side. Reject unknown keys, malformed UUID/date values, invalid ranges, and unsupported enum strings. Never accept a client-selected role, user ID, academic period, teacher ID, or arbitrary set of student IDs as authorization context.

```ts
type DashboardActionResult<T> =
  | { success: true; data: T; status: 200 }
  | {
      success: false
      data: []
      error: string
      status: 400 | 403 | 500
    }
```

`400` means invalid payload, `403` means unauthenticated/forbidden according to the stable UI contract, and `500` means unavailable data service. Use safe, user-facing messages; log diagnostic details server-side without returning SQL errors, stack traces, or PII. Catch failures and return this result rather than throwing from the action. Treat a successful empty array as `200` with an explicit empty state, not as an error.

## DTO State Fields

- Status/trend values use closed enums; unknown database values map to an unavailable state and are logged for correction, never coerced to a positive state.
- Timestamps crossing to `LocalTime` are ISO UTC strings plus the configured school timezone. Schedule wall-clock values remain local strings with `<time>` semantics and are not converted as UTC instants.
- Every data response identifies its school date/academic period and freshness timestamp. The UI must not label old values “real-time.”
- A successful response with missing score/history is represented with nullable value plus an explicit availability/status field; no fabricated zero or `TETAP`.
- DTOs are serializable primitives and arrays only; no Supabase client, query error, user/session object, or database row with unneeded columns crosses the RSC boundary.

## Database Enforcement

- Revoke the TU student-row access currently granted by the SELECT/RLS paths; verify direct REST/PostgREST reads are denied for students, sessions, attendance logs, and grades.
- `SECURITY DEFINER` RPCs must set a fixed search path, qualify all referenced objects, reject null `auth.uid()`, role-check, assignment-check, bound date/period scope, and expose only minimal rows. Revoke execution from `PUBLIC` and `anon`; grant only to `authenticated`.
- pgTAP allow/deny coverage includes ADMIN, WAKA, TU, each Walikelas alias, GURU, MURID, unauthenticated access, wrong class, wrong subject, unassigned teacher, missing role, and arbitrary caller-supplied IDs.