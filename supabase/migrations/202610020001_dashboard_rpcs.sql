CREATE OR REPLACE FUNCTION public.get_teacher_daily_attendance(
  p_from date,
  p_to date
)
RETURNS TABLE (
  activity_date_utc date,
  guru_id uuid,
  total_jp bigint,
  scheduled_jp bigint,
  completed_jp bigint,
  in_progress_jp bigint,
  planned_jp bigint,
  cancelled_jp bigint,
  completed_sessions bigint,
  in_progress_sessions bigint,
  planned_sessions bigint,
  cancelled_sessions bigint,
  first_scheduled_start_utc timestamptz,
  last_scheduled_end_utc timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  caller_id uuid := auth.uid();
  caller_role text;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from OR p_to - p_from > 366 THEN
    RAISE EXCEPTION 'Invalid date range' USING ERRCODE = '22023';
  END IF;

  SELECT upper(profile.role)
  INTO caller_role
  FROM public.user_profiles AS profile
  WHERE profile.id = caller_id;

  IF caller_role IS NULL OR caller_role NOT IN ('ADMIN', 'WAKA', 'TU', 'GURU') THEN
    RAISE EXCEPTION 'Role cannot read teacher attendance' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    attendance.activity_date_utc,
    attendance.guru_id,
    attendance.total_jp,
    attendance.scheduled_jp,
    attendance.completed_jp,
    attendance.in_progress_jp,
    attendance.planned_jp,
    attendance.cancelled_jp,
    attendance.completed_sessions,
    attendance.in_progress_sessions,
    attendance.planned_sessions,
    attendance.cancelled_sessions,
    attendance.first_scheduled_start_utc,
    attendance.last_scheduled_end_utc
  FROM private.mv_teacher_daily_attendance AS attendance
  WHERE attendance.activity_date_utc BETWEEN p_from AND p_to
    AND (caller_role <> 'GURU' OR attendance.guru_id = caller_id);
END;
$function$;

DROP FUNCTION IF EXISTS public.get_daily_student_rankings(date, date, uuid);
DROP FUNCTION IF EXISTS public.get_daily_student_rankings(date, date, uuid, uuid);

CREATE FUNCTION public.get_daily_student_rankings(
  p_from date,
  p_to date,
  p_class_id uuid DEFAULT NULL,
  p_subject_id uuid DEFAULT NULL
)
RETURNS TABLE (
  activity_date_utc date,
  class_id uuid,
  subject_id uuid,
  student_id uuid,
  daily_points numeric,
  scored_items bigint,
  rank_in_class_subject bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  caller_id uuid := auth.uid();
  caller_role text;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from OR p_to - p_from > 366 THEN
    RAISE EXCEPTION 'Invalid date range' USING ERRCODE = '22023';
  END IF;

  SELECT upper(profile.role)
  INTO caller_role
  FROM public.user_profiles AS profile
  WHERE profile.id = caller_id;

  IF caller_role IS NULL
    OR caller_role NOT IN ('ADMIN', 'WAKA', 'GURU', 'WALI', 'WALIKELAS', 'WALI_KELAS')
  THEN
    RAISE EXCEPTION 'Role cannot read student rankings' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    ranking.activity_date_utc,
    ranking.class_id,
    ranking.subject_id,
    ranking.student_id,
    ranking.daily_points,
    ranking.scored_items,
    ranking.rank_in_class_subject
  FROM private.mv_daily_student_rankings AS ranking
  WHERE ranking.activity_date_utc BETWEEN p_from AND p_to
    AND (p_class_id IS NULL OR ranking.class_id = p_class_id)
    AND (p_subject_id IS NULL OR ranking.subject_id = p_subject_id)
    AND (
      caller_role IN ('ADMIN', 'WAKA')
      OR (
        caller_role = 'GURU'
        AND EXISTS (
          SELECT 1
          FROM public.schedules AS schedule
          WHERE schedule.guru_id = caller_id
            AND schedule.class_id = ranking.class_id
            AND schedule.subject_id = ranking.subject_id
        )
      )
      OR (
        caller_role IN ('WALI', 'WALIKELAS', 'WALI_KELAS')
        AND EXISTS (
          SELECT 1
          FROM public.user_roles AS user_role
          INNER JOIN public.roles AS role
            ON role.id = user_role.role_id
          WHERE user_role.user_id = caller_id
            AND user_role.class_id = ranking.class_id
            AND upper(role.key) IN ('WALI', 'WALIKELAS', 'WALI_KELAS')
        )
      )
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_teacher_daily_attendance(date, date)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_daily_student_rankings(date, date, uuid, uuid)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_teacher_daily_attendance(date, date)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_student_rankings(date, date, uuid, uuid)
  TO authenticated;

COMMENT ON FUNCTION public.get_teacher_daily_attendance(date, date) IS
  'Returns UTC-dated teacher daily JP aggregates after auth.uid() and profile role validation.';
COMMENT ON FUNCTION public.get_daily_student_rankings(date, date, uuid, uuid) IS
  'Returns UTC-dated per-class, per-subject student rankings after auth.uid(), role, and assignment validation.';