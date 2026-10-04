# Server Action Contracts

## Boundary Rules

- Every mutation is an asynchronous Next.js Server Action; academic mutations do not use `/api/*` Route Handlers.
- Every action parses its input with a Zod schema before database access, verifies the caller's Supabase Auth claims, and checks the role plus the specific assignment/record scope.
- Never accept `actor_id`, role, or permission as authoritative client input. Derive actor identity from verified server-side claims.
- Use a request-scoped Supabase SSR client authenticated as the caller. RLS is a second enforcement layer. Do not use the service-role key for ordinary user actions.
- Return a typed discriminated result with stable error codes and field/row validation details. Do not return secrets, raw SQL errors, or data outside the caller's scope.
- Revalidate only the affected route/tag after a successful write; do not cache personalized server responses across users.

## Action Inventory

| Action | Authorized actor | Validated input | Success result |
|---|---|---|---|
| `saveMasterRecord` | Administrator | Entity type, stable identifier, validated fields | Saved identifier and audit timestamp |
| `requestScheduleChange` | Waka Kurikulum | Period, assignment, weekday/time, optional existing schedule, rationale | Pending proposal identifier and conflict preview; does not mutate academic schedules |
| `publishSchedule` | Administrator | Approved proposal or direct admin schedule change, weekday/time, publication state | Published schedule or conflict result; overlapping schedule write is rejected transactionally |
| `recordAttendance` | Assigned Guru Mata Pelajaran | Class session and student/status rows | Accepted count and current session state |
| `reviewTeacherAttendance` | Operator Tata Usaha | Attendance event identifier, `APPROVED`/`REJECTED` decision, rejection reason when rejected | Decision state, actor/time, source reference; approval is explicit Apply/ACC |
| `saveTransportRatePolicy` | Authorized Operator Tata Usaha | Staff or structural role, approved rate, effective range, approved formula/version reference | Policy identifier/version and audit timestamp; reject overlapping or ambiguous effective policies |
| `saveTeachingJournal` | Assigned Guru Mata Pelajaran | Class session, assigned subject, material summary | Journal identifier and update timestamp |
| `saveAssessment` | Assigned Guru Mata Pelajaran | Assessment, class/session scope, grade rows | Accepted grade count and current calculation reference |
| `publishGradingPolicy` | Administrator | Period, top-level weights, Sumatif subweights, effective date | Policy version; reject weights that do not meet the total rules |
| `importChunk` | Role authorized for dataset | Batch identifier, sequence, at most 100 normalized rows | Accepted/rejected row results and resumable chunk status |
| `resolveNotification` | Intended Waka/Walikelas recipient or Administrator | Notification identifier and resolution note | Updated notification state and audit reference |

Names are logical contract identifiers; implementation may use feature-specific action modules while preserving these validation and authorization guarantees.

## Common Result Shape

```ts
type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false
      error: {
        code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'VALIDATION' | 'CONFLICT' | 'NOT_FOUND' | 'PERSISTENCE'
        message: string
        fieldErrors?: Record<string, string[]>
        rowErrors?: Array<{ row: number; code: string; message: string }>
      }
    }
```

Error messages shown to users are localized at the presentation boundary; internal database details remain server-side.