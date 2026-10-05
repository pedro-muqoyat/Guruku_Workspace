INSERT INTO public.schedules (
  id,
  class_id,
  guru_id,
  subject_id,
  day_of_week,
  start_time,
  end_time,
  total_jp
)
SELECT
  '00000000-0000-4000-8000-000000000003'::uuid,
  class.id,
  teacher.id,
  subject.id,
  1,
  TIME '08:00',
  TIME '10:00',
  2
FROM public.classes AS class
CROSS JOIN public.subjects AS subject
CROSS JOIN LATERAL (
  SELECT profile.id
  FROM public.user_profiles AS profile
  WHERE profile.role = 'GURU'
  ORDER BY profile.id
  LIMIT 1
) AS teacher
WHERE class.id = '00000000-0000-4000-8000-000000000001'
  AND subject.id = '00000000-0000-4000-8000-000000000002'
ON CONFLICT (id) DO UPDATE
SET class_id = EXCLUDED.class_id,
    guru_id = EXCLUDED.guru_id,
    subject_id = EXCLUDED.subject_id,
    day_of_week = EXCLUDED.day_of_week,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    total_jp = EXCLUDED.total_jp;