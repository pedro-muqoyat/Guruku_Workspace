# Import and Export Contract

## Grade Workbook Import

- **Input format**: `.xlsx` workbook selected locally. The browser reads it as an `ArrayBuffer` and parses worksheets with SheetJS; the binary file is not uploaded.
- **Required row fields**: student school identifier, academic period, class code, subject code, assessment component (`formatif`, `sumatif`, `sts`, `sas`), assessment identifier/name, score, and maximum score.
- **Validation**: preview missing/unknown headers, duplicate keys, unknown students/classes/subjects, out-of-period enrollment, unauthorized teacher assignment, unsupported component, non-numeric score, and score outside `0..maximum` before submission. The Server Action repeats authoritative schema and authorization checks.
- **Batching**: split normalized rows into serial chunks of at most 100. Before invocation, keep each serialized action payload below 1 MB including action metadata; reduce chunk size if row width would exceed the limit.
- **Persistence**: upsert on the stable assessment/student key. Each chunk has a batch id, sequence, and idempotency key; retries do not duplicate grades. Persist partial progress and row-level rejection reasons. A failed chunk can be retried without resubmitting successful chunks.
- **User feedback**: show accepted/rejected totals, current chunk, per-row reasons, and a retry path. Do not report the whole batch as successful while any chunk is pending or failed.

The school-approved spreadsheet template and exact external e-Rapor column mapping must be supplied before implementation. The required semantic fields above are the stable internal contract, not a claim about an external ministry template.

## Attendance Import

- **Required row fields**: student school identifier, class/session or schedule/date reference, academic period, attendance status, and any required correction reason.
- **Rules**: match students to the class enrollment and session period; reject ambiguous session mapping; retain actor/time audit details; invoke the same transactional absence-trigger behavior as individual attendance changes.
- **Idempotency**: upsert on `(class_session_id, student_id)` and report updates separately from new records.
- **Walikelas entry default**: initialize all enrolled students as `Hadir` in the form, but do not persist that default until explicit submission. Mid-day `Izin Pulang` is a distinct exception with actor/time and correction audit data.
- **Teacher attendance channels**: accept ESP32 device events and manually submitted WFH requests with source/reference metadata. Both enter `PENDING`; only an explicit Operator TU Apply/ACC decision finalizes an event. Rejection records a reason. Pending/rejected events are excluded from confirmed attendance and transport calculations.

## Exports

- **e-Rapor foundation**: one authorized class/period export with one row per student/subject/period, component results, aggregate, and policy version. Walikelas can export assigned classes only.
- **Teacher attendance for TU**: one row per teacher/period/session derived only from explicitly TU-approved ESP32/WFH events or other policy-approved teaching validation, with source and decision evidence. Pending, rejected, or gate-only attendance is excluded.
- **Transport support**: include the calculated transport amount, approved attendance basis, effective staff/role rate, formula/policy version, and period. The school must approve formula, rate unit, rounding, effective dates, and person-versus-role precedence before acceptance. Missing or ambiguous configuration is an unavailable result, not a guessed amount.
- **Formats**: deliver a versioned workbook matching the school-approved template; include a CSV alternative only if required by the receiving workflow. The final external headers, code mappings, and date/decimal conventions are configuration artifacts reviewed with the school.
- **Privacy**: exports include only fields needed by the receiving workflow and are scoped by the caller's RLS permissions.