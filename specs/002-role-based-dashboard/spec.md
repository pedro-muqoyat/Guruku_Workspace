# Feature Specification: Role-Based Dashboard

**Feature Branch**: `002-role-based-dashboard`

**Created**: 2026-10-03

**Status**: Draft

**Input**: User description: Spesifikasi Kebutuhan UI: Dasbor Role-Based "Guruku Workspace"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Administration and TU Operations Overview (Priority: P1)

Administrator and Operator TU open the dashboard to understand the current-day school schedule and teacher work status. This operational view is separate from Waka Kurikulum's executive academic analysis and does not expose student-level academic details to TU.

**Why this priority**: The school-wide schedule and validated teaching activity support daily operations and rapid follow-up when teaching activity is missing or delayed.

**Independent Test**: Sign in separately as Administrator and TU with a day containing multiple teacher schedules and attendance states. Confirm both receive only their permitted operational data and that TU cannot access student-level records. Confirm Waka Kurikulum does not receive this role view.

**Acceptance Scenarios**:

1. **Given** an authorized Administrator and schedules for the current school day, **When** they open the dashboard, **Then** they see the day's teacher timeline ordered by time with teacher, class, and time for each event.
2. **Given** an authorized Operator TU, **When** they open the dashboard, **Then** they see the operational schedule and teacher-level status and daily teaching-load totals, but no student-level scores or attendance details.
3. **Given** validated teacher activity and a recorded status for the day, **When** an authorized Administrator or TU reads the operational performance matrix, **Then** the status and daily total JP match authoritative records and are distinguishable without relying on color alone.
4. **Given** Waka Kurikulum or another user outside the operational roles, **When** they request the TU operational data directly, **Then** access is denied unless separately granted the specific Administrator operational view.
5. **Given** teacher attendance events from ESP32 and WFH sources, **When** TU opens the operational view, **Then** approved, pending, and rejected records are distinguishable by source and only approved events contribute to confirmed attendance totals.
6. **Given** an applicable transport formula and effective staff/role rate, **When** TU reviews the period summary, **Then** the calculated transport amount is traceable to approved attendance and the applied policy version; missing or ambiguous configuration is shown as unavailable.

### User Story 2 - Waka Kurikulum Executive Academic View (Priority: P2)

Waka Kurikulum opens a distinct executive view to assess curriculum delivery across teachers, classes, subjects, and academic periods. It shows teacher workload attainment and deficit alongside aggregate student achievement distributions, without returning student-level records.

**Why this priority**: Executive analysis detects curriculum delivery shortfalls and cross-class/subject anomalies that cannot be inferred from an operational daily-attendance view.

**Independent Test**: Sign in as Waka Kurikulum with workload targets and validated JP across multiple teachers and periods, plus aggregate scores across multiple classes and subjects. Verify attainment percentages, monthly/semester deficits, and aggregate distributions. Verify TU and Administrator receive no executive results.

**Acceptance Scenarios**:

1. **Given** a Waka Kurikulum with the canonical `WAKA_KURIKULUM` role and teacher workload targets for a selected month and semester, **When** they open the executive view, **Then** they see each teacher's delivered-JP attainment percentage and any monthly and semester JP deficit compared with the applicable target.
2. **Given** recorded student scores across multiple classes and subjects in the selected academic period, **When** Waka Kurikulum opens academic distribution, **Then** they see aggregate average points grouped by class and subject, with no student identifiers or individual score rows.
3. **Given** a signed-in TU or Administrator, **When** they directly request the Waka curriculum analytics contract, **Then** the request is denied with status 403 and no executive analytics are returned.
4. **Given** a signed-in Waka Kurikulum whose role cannot be verified or whose required period/target data is unavailable, **When** they request the executive view, **Then** the system returns an authorization denial or an explicit unavailable-data state and does not fabricate totals or attainment.

### User Story 3 - Homeroom Class Monitoring (Priority: P3)

Walikelas opens the dashboard to follow the day's subject-teacher traffic and the academic and attendance condition of students in assigned homeroom classes.

**Why this priority**: It supports early detection of class-level teaching gaps and student attendance or academic concerns while respecting the Walikelas assignment boundary.

**Independent Test**: Sign in as a Walikelas assigned to multiple classes with schedules and student records, plus an unassigned class. Confirm the timeline and student matrices cover every assigned class and exclude the unassigned class while accurately reflecting today's records.

**Acceptance Scenarios**:

1. **Given** a Walikelas with an assigned class and today's class schedules, **When** they open the dashboard, **Then** they see the subject teachers entering that class ordered by teaching period.
2. **Given** students in an assigned class with daily scores in multiple subjects and approved attendance records, **When** the Walikelas views student progress, **Then** each student has one daily total across subjects and a separately labeled status derived only from persisted attendance; an unsubmitted Default Present UI state is not evidence of attendance.
3. **Given** a class not assigned to the signed-in Walikelas, **When** they open or directly request its dashboard data, **Then** its schedule and student records are not disclosed.
4. **Given** a Walikelas with more than one active class assignment, **When** they open the dashboard, **Then** every active assigned class is included and no single assignment is selected arbitrarily as the entire access scope.

### User Story 4 - Subject Teacher Execution (Priority: P4)

Guru Mata Pelajaran opens the dashboard to follow their own teaching itinerary and compare the performance trend of students across classes they teach.

**Why this priority**: It connects a teacher's immediate plan for the day with a scoped view of student outcomes across their teaching assignments.

**Independent Test**: Sign in as a subject teacher with schedules in multiple assigned classes and student scores across the current and prior academic terms. Confirm the itinerary order, leaderboard totals, trends, and exclusion of an unassigned class.

**Acceptance Scenarios**:

1. **Given** a subject teacher with schedules for the current day, **When** they open the dashboard, **Then** they see only their own classes ordered by scheduled time or teaching period.
2. **Given** students with scores from classes assigned to that teacher, **When** they view the leaderboard, **Then** students are ranked by total score for the current academic term and each trend compares with the previous completed academic term.
3. **Given** a student or class outside the teacher's teaching assignments, **When** the teacher requests leaderboard data, **Then** the data is not disclosed.
4. **Given** a student without comparable historical scores, **When** the leaderboard is displayed, **Then** the trend is labeled unavailable rather than inferred as unchanged.
5. **Given** a Guru with multiple active teaching assignments, **When** they open the dashboard, **Then** the itinerary and leaderboard cover all and only their assigned class/subject pairs.

### Edge Cases

- The session is missing, expired, or has an unsupported role; the dashboard shows no protected data and offers the existing sign-in or access-denied path.
- The user has no schedule or no assigned class for the current school day; the relevant timeline presents a clear empty state rather than fabricated events.
- Teacher attendance or activity has not been validated, or its status is unavailable; the dashboard identifies the data as unconfirmed or unavailable rather than asserting a present/absent state.
- A student has no score in one or more subjects, no daily attendance record, or no historical comparison period; totals and status remain explicitly incomplete or unavailable and are not silently treated as zero, present, or unchanged.
- A data source fails or is stale; the dashboard identifies the affected widget and does not present stale values as current.
- Long teacher or student names, narrow screens, and matrices with five or more columns must not obscure labels, row context, or page controls.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The dashboard MUST determine the user's permitted dashboard view from the authenticated identity and authoritative role and assignment records. Hiding a widget MUST NOT be treated as authorization to access its data.
- **FR-002**: The dashboard MUST provide the school-wide operational view to Administrator and the defined operational schedule and teacher-level summary to Operator TU. Waka Kurikulum MUST receive only the separate executive view defined for that role, not the ADMIN/TU operational dashboard contract.
- **FR-003**: The school-wide daily schedule MUST present all scheduled teachers as a chronological semantic list, with each event identifying who teaches, the class, and the time.
- **FR-004**: The school-wide teacher performance matrix MUST identify each teacher's daily status and total teaching load in JP. Status values MUST distinguish Hadir/Mengajar, Izin, Sakit, and Alpa when authoritative records support them; source and approval state MUST be available for attendance events.
- **FR-005**: Teacher attendance reporting MUST reflect validated teaching activity in accordance with the system's attendance policy. ESP32 and WFH events MUST remain pending until explicit Operator TU Apply/ACC approval; unapproved, rejected, or missing records MUST NOT be represented as confirmed attendance.
- **FR-006**: Operator TU MUST be limited to the operational schedule and teacher attendance aggregates needed for this view and MUST NOT receive student-level academic or attendance records through dashboard access.
- **FR-007**: Walikelas MUST see schedule and student monitoring data for every active class assigned to them, and no unassigned class. The daily class schedule MUST be a semantic list ordered by teaching period and identify each subject teacher.
- **FR-008**: The Walikelas student matrix MUST show each assigned student, the sum of that student's recorded scores across subjects for the current school day, and a separately labeled daily attendance status.
- **FR-009**: Guru Mata Pelajaran MUST see their complete personal daily itinerary and students within every active class/subject pair covered by their teaching assignments, and no other assignment scope. The itinerary MUST be ordered by scheduled time or teaching period and identify each class.
- **FR-010**: The teacher leaderboard MUST rank students using total scores from the current academic term across that teacher's assigned classes and show a historical trend of Naik, Turun, or Tetap against the previous completed academic term when comparable data exists.
- **FR-011**: Status and trend values MUST use clearly labeled badge/pill indicators. Hadir/Mengajar and Naik use the success color, Alpa/absence and Turun use the danger color, and Izin uses the warning color. Sakit and unavailable values MUST have distinct, explicit labels. Color MUST NOT be the only carrier of meaning.
- **FR-012**: Schedule timelines and itineraries MUST use semantic list structures. Performance data MUST use a true data table with programmatically associated row and column headers that screen readers can identify.
- **FR-013**: The dashboard MUST prevent horizontal scrolling on the main mobile viewport. A matrix with five or more columns MUST scroll within its own container, with its teacher or student name column remaining fixed at the left while the matrix is scrolled.
- **FR-014**: The dashboard MUST remain usable with keyboard navigation and screen readers, including access to internally scrollable matrices and meaningful labels for status and trend indicators.
- **FR-015**: Each widget MUST distinguish loading, empty, unavailable, stale, and error states. A failure in one widget MUST NOT be presented as a valid empty result or silently replace another role's data.
- **FR-016**: Direct requests for data outside the signed-in user's role or assignments MUST be denied without returning protected records.
- **FR-017**: Waka Kurikulum MUST receive a separate executive academic view and MUST NOT be grouped into the Administrator/TU operational view.
- **FR-018**: The executive view MUST be authorized only for a verified `WAKA_KURIKULUM` role. The curriculum analytics endpoint MUST return HTTP 200 only for that role and HTTP 403 for TU, Administrator, unauthenticated users, and other roles; it MUST return no executive DTO on denial.
- **FR-019**: The executive teacher-performance analysis MUST compare validated delivered JP against the canonical curriculum workload target for each teacher, calculate attainment percentage and JP deficit for the selected month and semester, and identify the target period used.
- **FR-020**: The executive academic distribution MUST report average recorded score points grouped across class and subject for the selected academic period. It MUST return aggregate values only, with no student identifier or individual score row.
- **FR-021**: Curriculum analytics MUST be computed by a dedicated, role-scoped data contract separate from the Administrator/TU operational queries and Server Actions. A denial or failure in the Waka view MUST NOT alter or broaden TU data access.
- **FR-022**: The TU operational view MUST distinguish teacher attendance events by source (ESP32 device log or WFH manual request) and decision state (pending, approved, rejected); only approved events may contribute to confirmed presence or downstream transport totals.
- **FR-023**: The TU transport summary MUST use the effective, authorized staff-specific or structural-role transport rate and identified calculation-policy version, and MUST show the applicable period and traceable source totals.
- **FR-024**: When a transport formula/rate is missing, conflicting, or outside its effective period, the dashboard MUST show an explicit unavailable state and MUST NOT return an inferred amount.
- **FR-025**: Dashboard attendance summaries MUST use persisted, approved attendance records; default values shown by an unsubmitted attendance-entry form MUST NOT be presented as confirmed attendance.
- **FR-026**: The dashboard MUST derive access from every active authoritative role assignment for the authenticated user; it MUST NOT restrict a valid Guru or Walikelas to an arbitrary first assignment, and each returned record MUST belong to one of those assignments.
- **FR-027**: The canonical Waka Kurikulum role key MUST be `WAKA_KURIKULUM` across the profile, authorization contract, and executive response. `WAKA` MUST NOT be treated as an implicit runtime alias; missing, ambiguous, or unsupported role values MUST fail closed.

### Key Entities *(include if feature involves data)*

- **Authenticated user and role**: The signed-in identity and its authoritative role, which determine the permitted dashboard view.
- **Role assignment**: The class or teaching assignment that bounds Walikelas and subject-teacher access.
- **Schedule event**: A teaching activity with teacher, class, subject, day, and teaching time or period.
- **Teacher activity status**: A daily teacher attendance or activity state and its validation state, with a daily teaching-load total.
- **Student daily record**: A student's recorded scores across subjects and attendance state for a school day, scoped to the authorized class.
- **Leaderboard period and trend**: A student's total score in the current academic term and its comparable value in the previous completed term.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In role-based access tests, 100% of attempted cross-role and out-of-assignment dashboard data requests are denied without protected records in the response.
- **SC-002**: In usability checks with representatives of each supported role, at least 90% identify their next relevant schedule event or the requested performance status within two seconds of viewing the dashboard.
- **SC-003**: At viewport widths of 320 pixels and above, the dashboard page has no horizontal overflow; matrices with five or more columns remain usable through contained horizontal scrolling with the entity-name column visible.
- **SC-004**: Screen-reader checks identify every performance table's row and column headers and announce status and trend labels without depending on color.
- **SC-005**: For test datasets with complete source records, every displayed daily JP total, daily student score total, leaderboard total, and historical trend matches its source records and defined period.
- **SC-006**: In missing-data, stale-data, and source-error tests, every affected widget communicates the corresponding state and displays no invented status or value.
- **SC-007**: In role-matrix tests, Waka Kurikulum receives HTTP 200 for curriculum analytics and 100% of TU, Administrator, unauthenticated, and other-role requests receive HTTP 403 with no executive data.
- **SC-008**: For complete workload and assessment fixtures, all teacher attainment/deficit and class-subject average values match their canonical target and score records for the selected month/semester.
- **SC-009**: Executive analytics responses contain no student identifiers or individual score rows.
- **SC-010**: For ESP32/WFH attendance events, only an explicit Operator TU-approved record contributes to confirmed-presence totals; pending/rejected records remain separately labeled and excluded. Separately, teaching-session presence requires its defined teaching validation evidence.
- **SC-011**: For complete approved-attendance and effective-rate fixtures, every displayed transport amount matches the configured formula and identifies its policy period/version; missing or ambiguous configuration returns unavailable, not a numeric guess.
- **SC-012**: In multi-assignment fixtures, 100% of a Guru's and Walikelas's valid assigned classes/subjects appear in the permitted view, 0 unassigned records appear, and role-contract tests accept only `WAKA_KURIKULUM` for executive analytics.

## Assumptions

- Existing authentication, authoritative role records, and role/class/teaching assignments are available to determine dashboard access.
- "Hari ini" means the current date in the school's configured timezone; schedule and daily score boundaries use that same date.
- Teacher status is derived from validated activity and attendance records. Where a status is not supported by authoritative data, it is shown as unavailable or unconfirmed.
- The current and previous completed academic terms are the default comparison periods for the subject-teacher leaderboard; students without comparable records have no trend badge value.
- This feature defines distinct dashboard views for Administrator, Waka Kurikulum, Operator TU, Walikelas, and Guru Mata Pelajaran. It does not define a student-facing dashboard.
- The canonical Waka role is `WAKA_KURIKULUM`; existing role aliases or schema constraints must be reconciled before enabling the Waka-only endpoint. Administrator and TU are intentionally not implied executive-role aliases.
- Curriculum workload attainment uses a canonical per-teacher target for the selected period; missing targets or validation evidence produce an unavailable state rather than an assumed 100% or zero deficit.
- The dashboard presents operational and academic data; it does not create or modify schedules, attendance, scores, or role assignments.
- The attendance approval and transport calculation workflows are owned by the academic-operations feature; this read-only dashboard consumes their persisted approval state, effective policy, and calculated result.
- School-approved transport formulas, rate units, effective dates, and precedence between staff-specific and role rates are prerequisites; no dashboard implementation may infer them.