ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS total_jp integer NOT NULL DEFAULT 1;

ALTER TABLE public.class_sessions
  ADD COLUMN IF NOT EXISTS total_jp integer NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schedules_total_jp_positive_check'
      AND conrelid = 'public.schedules'::regclass
  ) THEN
    ALTER TABLE public.schedules
      ADD CONSTRAINT schedules_total_jp_positive_check CHECK (total_jp > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'class_sessions_total_jp_positive_check'
      AND conrelid = 'public.class_sessions'::regclass
  ) THEN
    ALTER TABLE public.class_sessions
      ADD CONSTRAINT class_sessions_total_jp_positive_check CHECK (total_jp > 0);
  END IF;
END;
$$;

DO $$
DECLARE
  existing_job_id bigint;
BEGIN
  FOR existing_job_id IN
    SELECT jobid
    FROM cron.job
    WHERE jobname = 'refresh-teacher-daily-attendance'
  LOOP
    PERFORM cron.unschedule(existing_job_id);
  END LOOP;
END;
$$;

DROP MATERIALIZED VIEW IF EXISTS private.mv_teacher_daily_attendance;

CREATE MATERIALIZED VIEW private.mv_teacher_daily_attendance AS
SELECT
  (class_sessions.created_at AT TIME ZONE 'UTC')::date AS activity_date_utc,
  schedules.guru_id,
  COALESCE(
    SUM(class_sessions.total_jp) FILTER (WHERE class_sessions.state <> 'cancelled'),
    0
  )::bigint AS total_jp,
  COALESCE(
    SUM(class_sessions.total_jp) FILTER (WHERE class_sessions.state = 'completed'),
    0
  )::bigint AS completed_jp,
  COALESCE(
    SUM(class_sessions.total_jp) FILTER (WHERE class_sessions.state = 'in_progress'),
    0
  )::bigint AS in_progress_jp,
  COALESCE(
    SUM(class_sessions.total_jp) FILTER (WHERE class_sessions.state = 'planned'),
    0
  )::bigint AS planned_jp,
  COALESCE(
    SUM(class_sessions.total_jp) FILTER (WHERE class_sessions.state = 'cancelled'),
    0
  )::bigint AS cancelled_jp,
  COALESCE(SUM(schedules.total_jp), 0)::bigint AS scheduled_jp,
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

REVOKE ALL ON private.mv_teacher_daily_attendance FROM PUBLIC, anon, authenticated;
GRANT SELECT ON private.mv_teacher_daily_attendance TO service_role;

SELECT cron.schedule(
  'refresh-teacher-daily-attendance',
  '20 0 * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY private.mv_teacher_daily_attendance'
);

COMMENT ON MATERIALIZED VIEW private.mv_teacher_daily_attendance IS
  'Daily JP aggregates use class_sessions.total_jp for delivered sessions and schedules.total_jp for scheduled capacity; dates and schedule bounds are UTC. A class session is not assumed to equal one JP.';