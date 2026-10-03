DROP FUNCTION IF EXISTS public.get_daily_student_rankings(date, date, uuid);

NOTIFY pgrst, 'reload schema';