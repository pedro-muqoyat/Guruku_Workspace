# Guruku Workspace Constitution

## Core Principles

### I. Least-Privilege Roles
The system MUST enforce distinct permissions for Administrator, Waka Kurikulum,
Walikelas, Guru Mata Pelajaran, and Operator Tata Usaha. Access MUST be limited
to the records and actions required by each role and assignment. Administrators
own student, teacher, class, and schedule master data and system recovery. Waka
Kurikulum coordinates schedules and operations; Walikelas monitors only their
assigned classes; subject teachers record instruction and assessments only for
their assigned schedule; TU accesses teacher attendance aggregates validated by
teaching activity. Privileged access and recovery actions MUST be attributable
to an actor.

### II. Auditable Single Source of Truth
Academic records MUST be entered once and reused by authorized workflows,
including standardized e-Rapor and payroll-support exports. The system MUST
prevent duplicate or conflicting records where a stable identity exists and
preserve an audit trail sufficient to identify who changed a record and when.
Teacher attendance used for operational or payroll reporting MUST represent
validated teaching activity, not gate attendance alone. This principle
eliminates duplicate entry while making daily teacher and student activity
traceable.

### III. Configurable and Fair Assessment
Assessment calculations MUST use explicit, configurable parameters and MUST
make the inputs and resulting aggregate traceable. Initial default weights are
35% Formatif, 25% Kehadiran, and 40% Sumatif; authorized configuration MUST
allow policy changes without silently changing historical results. Assessment
matrices MUST distinguish Formatif, Sumatif, STS, and SAS. Student-specific
polymorphic rules, including the Siswa Atlet exemption from physical-attendance
penalties, MUST be explicit, consistently applied, and auditable; exceptions
MUST NOT be inferred from missing data.

### IV. Event-Driven Operational Awareness
The system MUST detect schedule conflicts before the semester begins and make
them visible to Waka Kurikulum as soon as the relevant schedule changes. It
MUST provide teaching-status visibility to identify classes without a validated
teacher. It MUST alert a Walikelas when a student in an assigned class is absent
for three consecutive sessions. Notifications MUST identify the triggering
records and intended recipient so users can verify and act on each anomaly.

### V. Reliable Bulk I/O
Import and export MUST support high-volume attendance and assessment workflows,
including standardized outputs for e-Rapor and payroll validation. Processing
1,000 student assessment matrices MUST NOT block the server or time out. Bulk
operations MUST report rejected records and reasons so that users can correct
data without repeating successful entries or losing auditability.

## Academic Product Invariants

- Administrator master data covers students, teachers, classes, and schedules.
- Subject-teacher workflows cover physical attendance, class-material journals,
	and the assessment matrix, constrained by the teacher's assigned schedule.
- Walikelas views and printed recapitulations are limited to assigned classes
	and provide subject-level grade aggregates as an e-Rapor foundation.
- TU recapitulations aggregate teacher attendance only after teaching activity
	has been validated; they support, but do not themselves authorize, payroll.
- Attendance, teaching status, grades, schedules, alerts, and exports MUST use
	consistent academic identities and periods.

## Delivery and Verification Workflow

- Each feature specification MUST identify affected roles, permitted actions,
	data ownership, audit expectations, and failure or correction paths.
- Changes to role permissions MUST include tests proving both allowed access
	and denied cross-role or out-of-assignment access.
- Assessment changes MUST test configurable weights, all assessment categories,
	the Siswa Atlet attendance exception, and traceability of calculated results.
- Schedule and attendance-alert changes MUST include boundary tests for
	conflicting schedules and three consecutive absences, plus recipient checks.
- Bulk I/O changes MUST be verified with at least 1,000 assessment matrices,
	including invalid rows, without server-blocking timeouts or duplicate writes.
- Exports MUST be checked against their agreed e-Rapor or payroll-support
	schemas. Before delivery, reviewers MUST confirm that the relevant principle
	and its acceptance evidence are covered.

## Governance

This constitution is the governing product and engineering standard for Guruku
Workspace. Amendments MUST be reviewed, dated, and versioned. A change that
removes or materially redefines a principle requires a MAJOR version increase;
a new principle or materially expanded requirement requires a MINOR increase;
clarifications that do not change obligations require a PATCH increase. Feature
plans, implementation reviews, and releases MUST identify conflicts with these
principles and record approved exceptions with their rationale and scope. A
constitution amendment MUST update the version and last-amended date, preserve
the original ratification date, and include a sync impact report for review.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): confirm original adoption date | **Last Amended**: 2026-09-29
<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- antislop:start -->
## antislop
For UI, copy, people, mobile layout, or code comments work, load the antislop skill for the task:
- Core filter, always on: `antislop`
- UI / visual: `antislop-ui`
- Mobile / responsive: `antislop-layoutmobile`
- Code comments: `antislop-code`
Before starting, ask the user when antislop applies: during the work, or after it is done.
To update antislop later: `npx antislop-ai --update`, or run `npx antislop-ai` and pick Overwrite them.
<!-- antislop:end -->
