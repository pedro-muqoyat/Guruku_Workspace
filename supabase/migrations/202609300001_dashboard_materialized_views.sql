CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

DO $$
DECLARE
  grade_created_at_type regtype;
  session_created_at_type regtype;
BEGIN
  SELECT attribute.atttypid::regtype
  INTO grade_created_at_type
  FROM pg_attribute AS attribute
  WHERE attribute.attrelid = 'public.student_grades'::regclass
    AND attribute.attname = 'created_at'
    AND NOT attribute.attisdropped;

  SELECT attribute.atttypid::regtype
  INTO session_created_at_type
  FROM pg_attribute AS attribute
  WHERE attribute.attrelid = 'public.class_sessions'::regclass
    AND attribute.attname = 'created_at'
    AND NOT attribute.attisdropped;

  IF grade_created_at_type IS DISTINCT FROM 'timestamp with time zone'::regtype THEN
    RAISE EXCEPTION 'public.student_grades.created_at must be timestamptz for UTC daily aggregation';
  END IF;

  IF session_created_at_type IS DISTINCT FROM 'timestamp with time zone'::regtype THEN
    RAISE EXCEPTION 'public.class_sessions.created_at must be timestamptz for UTC daily aggregation';
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS student_grades_created_at_student_id_idx
  ON public.student_grades (created_at, student_id);

CREATE INDEX IF NOT EXISTS students_class_id_id_idx
  ON public.students (class_id, id);

CREATE INDEX IF NOT EXISTS class_sessions_created_at_schedule_state_idx
  ON public.class_sessions (created_at, schedule_id, state);

CREATE INDEX IF NOT EXISTS schedules_guru_id_id_idx
  ON public.schedules (guru_id, id);

CREATE MATERIALIZED VIEW private.mv_daily_student_rankings AS
WITH daily_student_scores AS (
  SELECT
    (student_grades.created_at AT TIME ZONE 'UTC')::date AS activity_date_utc,
    students.class_id,
    student_grades.subject_id,
    student_grades.student_id,
    SUM(student_grades.score)::numeric AS daily_points,
    COUNT(*)::bigint AS scored_items
  FROM public.student_grades AS student_grades
  INNER JOIN public.students AS students
    ON students.id = student_grades.student_id
  GROUP BY
    (student_grades.created_at AT TIME ZONE 'UTC')::date,
    students.class_id,
    student_grades.subject_id,
    student_grades.student_id
)
SELECT
  activity_date_utc,
  class_id,
  subject_id,
  student_id,
  daily_points,
  scored_items,
  RANK() OVER (
    PARTITION BY activity_date_utc, class_id, subject_id
    ORDER BY daily_points DESC
  ) AS rank_in_class_subject
FROM daily_student_scores
WITH DATA;

CREATE UNIQUE INDEX mv_daily_student_rankings_key_idx
  ON private.mv_daily_student_rankings (
    activity_date_utc,
    class_id,
    subject_id,
    student_id
  );

CREATE INDEX mv_daily_student_rankings_class_date_rank_idx
  ON private.mv_daily_student_rankings (
    class_id,
    subject_id,
    activity_date_utc DESC,
    rank_in_class_subject
  );

CREATE MATERIALIZED VIEW private.mv_teacher_daily_attendance AS
SELECT
  (class_sessions.created_at AT TIME ZONE 'UTC')::date AS activity_date_utc,
  schedules.guru_id,
  COUNT(*) FILTER (WHERE class_sessions.state <> 'cancelled')::bigint AS total_jp,
  COUNT(*) FILTER (WHERE class_sessions.state = 'completed')::bigint AS completed_sessions,
  COUNT(*) FILTER (WHERE class_sessions.state = 'in_progress')::bigint AS in_progress_sessions,
  COUNT(*) FILTER (WHERE class_sessions.state = 'planned')::bigint AS planned_sessions,
  COUNT(*) FILTER (WHERE class_sessions.state = 'cancelled')::bigint AS cancelled_sessions,
  MIN(
    (((class_sessions.created_at AT TIME ZONE 'UTC')::date + schedules.start_time)
      AT TIME ZONE 'UTC')
  ) AS first_scheduled_start_utc,
  MAX(
    (((class_sessions.created_at AT TIME ZONE 'UTC')::date + schedules.end_time)
      AT TIME ZONE 'UTC')
  ) AS last_scheduled_end_utc
FROM public.class_sessions AS class_sessions
INNER JOIN public.schedules AS schedules
  ON schedules.id = class_sessions.schedule_id
GROUP BY
  (class_sessions.created_at AT TIME ZONE 'UTC')::date,
  schedules.guru_id
WITH DATA;

CREATE UNIQUE INDEX mv_teacher_daily_attendance_key_idx
  ON private.mv_teacher_daily_attendance (activity_date_utc, guru_id);

CREATE INDEX mv_teacher_daily_attendance_guru_date_idx
  ON private.mv_teacher_daily_attendance (guru_id, activity_date_utc DESC);

COMMENT ON MATERIALIZED VIEW private.mv_daily_student_rankings IS
  'Daily sum of student grade scores grouped by UTC date and class. Refresh is scheduled through pg_cron.';

COMMENT ON MATERIALIZED VIEW private.mv_teacher_daily_attendance IS
  'Daily teacher session-state aggregates grouped by UTC session creation date. total_jp counts each non-cancelled class_session as one JP because source tables expose no period-count field. Timezone-less schedule clock times are interpreted as UTC.';

REVOKE ALL ON private.mv_daily_student_rankings FROM PUBLIC, anon, authenticated;
REVOKE ALL ON private.mv_teacher_daily_attendance FROM PUBLIC, anon, authenticated;
GRANT SELECT ON private.mv_daily_student_rankings TO service_role;
GRANT SELECT ON private.mv_teacher_daily_attendance TO service_role;

SELECT cron.schedule(
  'refresh-daily-student-rankings',
  '15 0 * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY private.mv_daily_student_rankings'
);

SELECT cron.schedule(
  'refresh-teacher-daily-attendance',
  '20 0 * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY private.mv_teacher_daily_attendance'
);