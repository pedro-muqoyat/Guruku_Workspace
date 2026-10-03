DROP FUNCTION IF EXISTS public.get_daily_student_rankings(date, date, uuid, uuid);
DROP MATERIALIZED VIEW IF EXISTS private.mv_daily_student_rankings;

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

CREATE INDEX mv_daily_student_rankings_subject_date_rank_idx
  ON private.mv_daily_student_rankings (
    subject_id,
    activity_date_utc DESC,
    class_id,
    rank_in_class_subject
  );

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

REVOKE ALL ON FUNCTION public.get_daily_student_rankings(date, date, uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_daily_student_rankings(date, date, uuid, uuid)
  TO authenticated;

COMMENT ON MATERIALIZED VIEW private.mv_daily_student_rankings IS
  'Daily sum of student grade scores grouped by UTC date, class, and subject. Refresh is scheduled through pg_cron.';
COMMENT ON FUNCTION public.get_daily_student_rankings(date, date, uuid, uuid) IS
  'Returns UTC-dated per-class, per-subject student rankings after auth.uid(), role, and assignment validation.';

NOTIFY pgrst, 'reload schema';