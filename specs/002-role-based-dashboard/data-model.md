# Data Model: Role-Based Dashboard

## Scope and Sources

The dashboard is read-only. It reuses canonical identity, role, schedule, session, attendance, and grade records; it does not create a parallel assignment or grading model. The installed schema is currently incomplete for student names, term comparisons, and validated teacher absence states. Align those source records with [the 001 academic-operations model](../001-academic-operations/data-model.md) before enabling affected widgets.

## Relationships

```text
auth.users 1--1 user_profiles
user_profiles 1--* user_roles *--1 roles
students *--1 classes
user_profiles (teacher) 1--* schedules *--1 (classes, subjects)
schedules 1--* class_sessions 1--* attendance_logs *--1 students
class_sessions 1--0..1 teaching_journals
academic_periods 1--* assessments 1--* student_grades *--1 students
user_profiles (teacher) 1--* teacher_attendance_statuses
```

## Entities

### Dashboard viewer and assignment

- **user_profiles** (existing): Auth identity, full name, and role. Role is authoritative database data, not a client or editable Auth-metadata claim.
- **roles / user_roles** (existing): Walikelas class assignment. Validate that the role key is one of `WALI`, `WALIKELAS`, or `WALI_KELAS` and that its class scope belongs to the signed-in user.
- **schedules** (existing): Teacher, class, subject, weekday, local start/end times, and `total_jp`. A Guru's allowed classes/subjects derive from all schedules applicable to the active period, not an arbitrary first row.

### Student identity and daily records

- **students** (existing, schema alignment required): Stable student/class association and student type. Add or expose a canonical display name; do not use UUID fragments or mutable Auth metadata as the label.
- **class_sessions** (existing): A schedule occurrence keyed by `session_date`, with state and `total_jp`. Business-day queries use `session_date`, not `created_at`.
- **attendance_logs** (existing): One student status per class session (`Hadir`, `Sakit`, `Izin`, `Alpa`). Daily aggregation filters by session date and the caller's class assignments. If there are no rows, return `Belum tercatat`. If distinct statuses exist across sessions, return `Campuran` and counts by status rather than hiding a conflicting day behind one value.
- **academic_periods / assessments / student_grades** (target canonical alignment): Reuse the 001 model. Each assessment has an active academic period and assessment date; each grade belongs to an assessment and student. The existing direct `student_grades.subject_id/task_name/created_at` schema must be migrated or adapted before period-based dashboard queries are implemented. Daily points sum grade records whose assessment date is the current school date; no records means no score, not a synthetic zero.

### Teacher schedule and performance

- **class_sessions / teaching_journals** (existing evidence, validation alignment required): A completed session counts as validated teaching activity only when it satisfies the agreed validation rule (completed session plus valid teaching-journal/validation evidence). JP is summed from the session's `total_jp`, not counted as one per row.
- **teacher_attendance_statuses** (required source or integration): One validated status for a teacher and school date when the teacher is recorded as `IZIN`, `SAKIT`, or `ALPA`. Include teacher ID, school date, status, source/reference, recorder, validator, and validation timestamp. This is an authoritative upstream record, not inferred from an empty schedule/session query. If the source already exists outside this database at implementation time, integrate through a documented contract instead of duplicating it.
- **Teacher day status DTO**: `HADIR_MENGAJAR` requires validated teaching evidence; `IZIN`, `SAKIT`, and `ALPA` require validated status records; no evidence returns `BELUM_TERVERIFIKASI`. Conflicting validated absence and teaching evidence returns `KONFLIK_DATA` and a safe correction state. Daily scheduled JP is `sum(schedules.total_jp)` for the school date; display it as scheduled workload, distinct from validated/completed JP.
- **Leaderboard period**: The active and immediately previous completed academic period. Sum only recorded scores for the Guru's assigned class/subject schedule scope. Trend is the sign of current-period total minus prior-period total; unavailable comparison yields no up/down claim. Stable tie order: total descending, display name ascending, student ID ascending.

## Authorization and DTO Constraints

- Every viewer is verified with Supabase `auth.getUser()` before role-specific RPC calls; SQL independently derives `auth.uid()`.
- ADMIN/WAKA may read the school-wide operational view. TU receives only schedule and teacher aggregates from a narrow RPC. Remove TU from direct RLS predicates for `students`, `class_sessions`, `attendance_logs`, and `student_grades`; keep schedules available as required by the spec.
- WALI aliases are scoped to all assigned classes only. GURU is scoped to all active assigned schedules and their class/subject grade rows. MURID and unknown roles have no dashboard grant.
- Macro DTOs may include teacher display name but never student identifiers or records. Student DTOs contain only student ID, canonical display name, assigned class context, score total, attendance summary, and permitted trend fields.
- SQL RPCs use `auth.uid()` and assignment membership for every row, fixed `search_path`, fully qualified objects, and explicit grants. No caller-submitted user/role value is authoritative.
- Index the predicates used by current-day schedules, session date, class/student attendance, assessment period/date, teacher assignments, and class/subject grade aggregation. Validate query plans with representative fixtures before adding a materialized view.

## State Semantics

| Domain | State | Meaning |
|---|---|---|
| Widget | `loading` | The widget's independent query is pending; skeleton preserves its reserved layout. |
| Widget | `empty` | Query succeeded and there are no applicable schedule/rows. |
| Widget | `unavailable` | Required upstream source/period/history is absent or not yet validated. |
| Widget | `stale` | Data freshness exceeds the agreed source freshness threshold; never label it live. |
| Widget | `error` | Query failed; safe message and retry/refresh path, distinct from empty. |
| Teacher status | `HADIR_MENGAJAR`, `IZIN`, `SAKIT`, `ALPA` | Values supported by validated source evidence. |
| Teacher status | `BELUM_TERVERIFIKASI`, `KONFLIK_DATA` | Do not infer attendance; make missing or contradictory evidence visible. |
| Student daily attendance | `HADIR`, `IZIN`, `SAKIT`, `ALPA`, `CAMPURAN`, `BELUM_TERCATAT` | Summary of session attendance on the school date; mixed state includes per-status counts. |
| Trend | `NAIK`, `TURUN`, `TETAP`, unavailable | Comparison of current and prior completed academic-term totals; unavailable means no valid comparison. |