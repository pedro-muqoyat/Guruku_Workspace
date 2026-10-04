# Data Model: Guruku Academic Operations

## Relationships

```text
auth.users 1--1 user_profiles 1--* user_roles *--1 roles
students 1--* enrollments *--1 classes
teachers 1--* teaching_assignments *--1 (classes, subjects, academic_periods)
user_profiles 1--* schedule_change_requests --* schedules (proposal references target/current schedule)
teaching_assignments 1--* schedules 1--* class_sessions 1--* attendance_logs *--1 students
class_sessions 1--0..* teaching_journals
academic_periods 1--* grading_policies 1--* grading_components
assessments 1--* student_grades *--1 students
students 1--* athlete_statuses (bounded by academic period)
user_profiles 1--* notifications; user_profiles 1--* audit_logs
user_profiles 1--* import_batches 1--* import_chunks
user_profiles (teacher) 1--* teacher_attendance_events *--0..1 approval (Operator TU)
transport_rate_policies 1--* transport_calculations *--* approved teacher_attendance_events
```

## Entities and Constraints

### Identity and authorization

- **user_profiles**: `id` references `auth.users.id`; optional unique `teacher_id` or `student_id`; display metadata; active flag. Profile role metadata is not accepted from user-editable Auth claims.
- **roles**: Stable key for Administrator, Waka Kurikulum, Walikelas, Guru Mata Pelajaran, and Operator TU.
- **user_roles**: `user_id`, `role_id`, optional scoped class/period assignment, active dates, assigning administrator, and audit timestamps. Unique active assignment prevents duplicate role grants. RLS checks the verified `auth.uid()` plus these server-managed assignments.
- **students**, **teachers**: Stable school identity, name, active state, and associated profile where applicable. School identifiers are unique within their defined school scope.

### Academic structure

- **academic_periods**: School year, term/semester, start/end dates, and lifecycle state. Date ranges cannot invert; only one active period may apply to a given school scope.
- **classes**: Stable class code and name, grade level, and active state.
- **subjects**: Stable subject code and name.
- **enrollments**: Student, class, and academic period with effective dates. Prevent overlapping active class assignments for one student in the same period.
- **teaching_assignments**: Teacher, class, subject, and period; used to authorize schedule creation and teacher academic work.
- **schedule_change_requests**: Waka requester, target period/assignment, proposed day/time, optional current schedule, rationale, review state, reviewing Administrator, and audit timestamps. This workflow record is not an academic schedule mutation. Waka may create/read requests within scope; only Administrator may approve/reject. Approval writes the schedule row and is subject to the conflict trigger.
- **schedules**: Teaching assignment, weekday, start/end local time, and publication state. Enforce `start_time < end_time`; index by teacher, period, weekday, and start time. A before-write trigger takes an advisory transaction lock scoped to teacher/period/day and rejects overlapping half-open intervals atomically.
- **class_sessions**: One actual occurrence of a schedule, with date, scheduled time snapshot, state (`planned`, `in_progress`, `completed`, `cancelled`), and teacher-validation evidence. Unique `(schedule_id, session_date)` prevents duplicate session creation. Cancelled sessions do not count toward consecutive absence.

### Attendance and teaching records

- **attendance_logs**: One current row per student per class session with status `Hadir`, `Sakit`, `Izin`, or `Alpa`; records recorder and timestamps. Unique `(class_session_id, student_id)`. RLS limits teacher writes to assigned sessions and students enrolled in the session's class/period.
- **attendance_events**: Append-only attendance exception/correction history tied to an attendance row, including `Izin Pulang`, prior/new status, event time, actor, and correction reason. A mid-day departure does not erase the original session attendance; the event is separately traceable and contributes to aggregates only under an explicitly approved school rule.
- **teaching_journals**: Class session, teaching teacher, subject, material/learning summary, and audit timestamps. One journal per session/subject/teacher unless school policy allows multiple entries.
- **athlete_statuses**: Student, approved designation, academic period, effective dates, approving administrator, and audit trail. Attendance logs remain factual; the athlete status affects only grade calculation and supplies a full attendance-component contribution while active.
- **Walikelas attendance entry**: The form initializes each enrolled student as `Hadir` for the selected session. This client-side default is not a persisted attendance row; only a submitted and authorized action creates or updates attendance. Mid-day `Izin Pulang` is a distinct recorded exception with actor, timestamp, and correction history.
- **teacher_attendance_events**: A proposed teacher attendance event with teacher, school date, source (`ESP32` or `WFH`), stable source/request reference, event time, submitter/recorder, decision (`PENDING`, `APPROVED`, `REJECTED`), Operator TU decision actor/time, and rejection reason when rejected. Source ingestion or manual WFH submission never finalizes an event by itself. A stable source key prevents replay duplicates.
- **teacher_attendance_approvals**: Approval/rejection evidence or an equivalent immutable event history. Every finalization requires an explicit Operator TU `Apply/ACC` action; corrections retain the prior decision and identify the new actor/time.

### Assessment and calculation

- **grading_policies**: Scope (period and optionally class/subject), version, effective date, state, and policy author. The initial top-level weights are 35% Formatif, 25% Kehadiran, and 40% Sumatif.
- **grading_components**: Policy component and weight. Sumatif routine, STS, and SAS are subcomponents of the Sumatif 40%; their configurable weights MUST total exactly 40%. Formatif and Kehadiran remain 35% and 25% unless an authorized policy version changes them.
- **assessments**: Period, class, subject, component enum (`formatif`, `sumatif`, `sts`, `sas`), title, date, maximum score, and creator. Assessment component must be enabled by the applicable policy.
- **student_grades**: Assessment, student, score, recorder, and timestamps. Unique `(assessment_id, student_id)` supports safe upsert. Score must be within the permitted range. Foreign-key/authorization checks ensure student enrollment matches the assessment class and period.
- **grade calculation view/RPC**: Produces subject/period aggregates from recorded component scores, policy version, attendance, and active athlete status. It exposes no broader rows than the caller's RLS permits; use `security_invoker` for views and test the resulting grants/policies. Finalized outcomes retain a policy-version reference so later policy edits do not silently rewrite history.

### Events, audit, and bulk operations

- **notifications**: Recipient user, event type, affected student/session/schedule, trigger record, created/resolved timestamps, and resolution state. A unique event key prevents duplicate alerts. RLS limits reads to the intended Waka/Walikelas recipient and scope.
- **audit_logs**: Actor (`auth.uid()`), timestamp, entity/table, record key, operation, and relevant before/after values or a privacy-safe change summary. Database triggers cover critical academic writes; audit access is restricted.
- **import_batches**: Initiating user, dataset type, period, file fingerprint, start/end, and overall status/counts. Never store the uploaded workbook binary.
- **import_chunks**: Batch, monotonically increasing chunk number, idempotency key, status, accepted/rejected counts, and retry metadata. Unique `(batch_id, chunk_number)` prevents duplicate progress records.
- **transport_rate_policies**: Effective-dated rate assigned to a staff identity or structural role (including OB, TU Staff, and Waka), with currency/unit, authorized TU configurator, and audit timestamps. The precedence between a person-specific rate and a role rate must be supplied as an approved school rule.
- **transport_calculations**: Period result containing the approved formula/version, effective rate-policy reference, eligible approved attendance references, calculated amount, and actor/time. It is reproducible and immutable with respect to later policy changes.
- **Transport formula configuration**: The actual formula, rate unit, rounding rule, and rate precedence are school-approved inputs. No default formula or rate is inferred by this data model; missing or ambiguous configuration yields an unavailable calculation.

## Trigger Behavior

1. Schedule insert/update: serialize the teacher/period/weekday conflict check with a transaction advisory lock; reject overlap so PostgreSQL rolls the write back. Use an index-backed query and return a safe conflict identifier/message to the Waka workflow.
2. Attendance insert/update: for an Alpa transition or correction, examine the student's latest applicable non-cancelled class sessions in the same class and period. Insert one notification when the latest three are all Alpa; reconcile/resolution when corrected. Run inside the attendance transaction.
3. Critical writes: append actor/time audit records in the same transaction. Do not log secrets or unnecessary sensitive values.

## Index and RLS Requirements

- Index all foreign keys and RLS filter columns, including user-role scopes, teacher assignment, class/period membership, student/session attendance, and notification recipient.
- Scope teacher attendance source and decision rows to authorized actors; only Operator TU may approve/reject, and only approved rows may feed attendance/payroll-support aggregates. Audit source, decision, correction, and calculation-version changes.
- Enable RLS on every exposed table; revoke anonymous access and unnecessary grants before granting role-specific operations.
- Waka and TU have school-wide analytical `SELECT` access and no academic-table mutation grants. Waka may create/read schedule-change requests in their separate workflow table; only Administrator may publish schedule changes. Walikelas reads assigned classes; teachers mutate only their assigned sessions/subjects; administrators manage master data and authorized recovery.
- pgTAP tests assert both allowed and denied reads/writes, including anonymous access, wrong teacher assignment, out-of-class Walikelas, and unauthorized Waka/TU mutations.