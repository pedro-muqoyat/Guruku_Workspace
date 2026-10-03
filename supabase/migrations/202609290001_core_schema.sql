CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type AS type
    INNER JOIN pg_namespace AS namespace ON namespace.oid = type.typnamespace
    WHERE namespace.nspname = 'public'
      AND type.typname = 'session_status'
  ) THEN
    CREATE TYPE public.session_status AS ENUM (
      'planned',
      'in_progress',
      'completed',
      'cancelled'
    );
  END IF;
END;
$migration$;

CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE
);

INSERT INTO public.roles (key)
VALUES ('ADMIN'), ('WAKA'), ('WALI'), ('WALIKELAS'), ('GURU'), ('TU'), ('MURID')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL
);

CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL
);

CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  role text NOT NULL CHECK (
    upper(role) IN ('ADMIN', 'WAKA', 'WALI', 'WALIKELAS', 'WALI_KELAS', 'GURU', 'TU', 'MURID')
  )
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  UNIQUE (user_id, role_id, class_id)
);

CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  status_siswa text
);

CREATE TABLE public.schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  guru_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  total_jp integer NOT NULL DEFAULT 1 CHECK (total_jp > 0),
  CHECK (start_time < end_time)
);

CREATE TABLE public.class_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  state public.session_status NOT NULL DEFAULT 'planned',
  session_date date NOT NULL,
  total_jp integer NOT NULL DEFAULT 1 CHECK (total_jp > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (schedule_id, session_date)
);

CREATE TABLE public.attendance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('Hadir', 'Sakit', 'Izin', 'Alpa')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, student_id)
);

CREATE TABLE public.student_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  grade_type text NOT NULL CHECK (upper(grade_type) IN ('FORMATIF', 'SUMATIF', 'STS', 'SAS')),
  task_name text NOT NULL,
  score numeric(5, 2) NOT NULL CHECK (score BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, subject_id, grade_type, task_name)
);

CREATE TABLE public.teaching_journals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL UNIQUE REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  topic text NOT NULL,
  notes text NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes BETWEEN 1 AND 300),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_read boolean NOT NULL DEFAULT false
);

CREATE INDEX user_roles_user_id_class_id_idx
  ON public.user_roles (user_id, class_id);
CREATE INDEX schedules_guru_id_class_subject_idx
  ON public.schedules (guru_id, class_id, subject_id);
CREATE INDEX class_sessions_schedule_date_idx
  ON public.class_sessions (schedule_id, session_date);
CREATE INDEX attendance_logs_session_student_idx
  ON public.attendance_logs (session_id, student_id);
CREATE INDEX student_grades_student_subject_created_idx
  ON public.student_grades (student_id, subject_id, created_at);
CREATE INDEX notifications_user_read_created_idx
  ON public.notifications (user_id, is_read, created_at DESC);

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.current_profile_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $function$
  SELECT upper(profile.role)
  FROM public.user_profiles AS profile
  WHERE profile.id = auth.uid()
$function$;

REVOKE ALL ON FUNCTION private.current_profile_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.current_profile_role() TO authenticated, service_role;

GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT SELECT ON public.roles TO authenticated;
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.classes, public.subjects, public.students TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.schedules TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.class_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.attendance_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.student_grades TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.teaching_journals TO authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY roles_read_authenticated
  ON public.roles FOR SELECT TO authenticated USING (true);

CREATE POLICY user_profiles_read_scoped
  ON public.user_profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR private.current_profile_role() IN ('ADMIN', 'WAKA')
  );

CREATE POLICY user_roles_read_scoped
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR private.current_profile_role() = 'ADMIN'
  );

CREATE POLICY classes_read_assigned
  ON public.classes FOR SELECT TO authenticated
  USING (
    private.current_profile_role() IN ('ADMIN', 'WAKA', 'TU')
    OR EXISTS (
      SELECT 1 FROM public.schedules AS schedule
      WHERE schedule.class_id = classes.id AND schedule.guru_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles AS user_role
      JOIN public.roles AS role ON role.id = user_role.role_id
      WHERE user_role.class_id = classes.id
        AND user_role.user_id = auth.uid()
        AND upper(role.key) IN ('WALI', 'WALIKELAS', 'WALI_KELAS')
    )
  );

CREATE POLICY subjects_read_authenticated
  ON public.subjects FOR SELECT TO authenticated USING (true);

CREATE POLICY schedules_read_assigned
  ON public.schedules FOR SELECT TO authenticated
  USING (
    private.current_profile_role() IN ('ADMIN', 'WAKA', 'TU')
    OR guru_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.user_roles AS user_role
      JOIN public.roles AS role ON role.id = user_role.role_id
      WHERE user_role.class_id = schedules.class_id
        AND user_role.user_id = auth.uid()
        AND upper(role.key) IN ('WALI', 'WALIKELAS', 'WALI_KELAS')
    )
  );

CREATE POLICY students_read_assigned
  ON public.students FOR SELECT TO authenticated
  USING (
    private.current_profile_role() IN ('ADMIN', 'WAKA', 'TU')
    OR EXISTS (
      SELECT 1 FROM public.schedules AS schedule
      WHERE schedule.class_id = students.class_id AND schedule.guru_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles AS user_role
      JOIN public.roles AS role ON role.id = user_role.role_id
      WHERE user_role.class_id = students.class_id
        AND user_role.user_id = auth.uid()
        AND upper(role.key) IN ('WALI', 'WALIKELAS', 'WALI_KELAS')
    )
  );

CREATE POLICY class_sessions_read_assigned
  ON public.class_sessions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.schedules AS schedule
      WHERE schedule.id = class_sessions.schedule_id
        AND (
          schedule.guru_id = auth.uid()
          OR private.current_profile_role() IN ('ADMIN', 'WAKA', 'TU')
          OR EXISTS (
            SELECT 1 FROM public.user_roles AS user_role
            JOIN public.roles AS role ON role.id = user_role.role_id
            WHERE user_role.user_id = auth.uid()
              AND user_role.class_id = schedule.class_id
              AND upper(role.key) IN ('WALI', 'WALIKELAS', 'WALI_KELAS')
          )
        )
    )
  );

CREATE POLICY class_sessions_write_assigned
  ON public.class_sessions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schedules AS schedule
      WHERE schedule.id = class_sessions.schedule_id
        AND schedule.guru_id = auth.uid()
    )
  );

CREATE POLICY attendance_read_assigned
  ON public.attendance_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.class_sessions AS session
      JOIN public.schedules AS schedule ON schedule.id = session.schedule_id
      WHERE session.id = attendance_logs.session_id
        AND (
          schedule.guru_id = auth.uid()
          OR private.current_profile_role() IN ('ADMIN', 'WAKA', 'TU')
          OR EXISTS (
            SELECT 1 FROM public.user_roles AS user_role
            JOIN public.roles AS role ON role.id = user_role.role_id
            WHERE user_role.user_id = auth.uid()
              AND user_role.class_id = schedule.class_id
              AND upper(role.key) IN ('WALI', 'WALIKELAS', 'WALI_KELAS')
          )
        )
    )
  );

CREATE POLICY attendance_write_assigned
  ON public.attendance_logs FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_sessions AS session
      JOIN public.schedules AS schedule ON schedule.id = session.schedule_id
      WHERE session.id = attendance_logs.session_id AND schedule.guru_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.class_sessions AS session
      JOIN public.schedules AS schedule ON schedule.id = session.schedule_id
      JOIN public.students AS student ON student.id = attendance_logs.student_id
      WHERE session.id = attendance_logs.session_id
        AND schedule.guru_id = auth.uid()
        AND student.class_id = schedule.class_id
    )
  );

CREATE POLICY student_grades_read_assigned
  ON public.student_grades FOR SELECT TO authenticated
  USING (
    private.current_profile_role() IN ('ADMIN', 'WAKA', 'TU')
    OR EXISTS (
      SELECT 1
      FROM public.students AS student
      JOIN public.schedules AS schedule ON schedule.class_id = student.class_id
      WHERE student.id = student_grades.student_id
        AND schedule.subject_id = student_grades.subject_id
        AND schedule.guru_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.students AS student
      JOIN public.user_roles AS user_role ON user_role.class_id = student.class_id
      JOIN public.roles AS role ON role.id = user_role.role_id
      WHERE student.id = student_grades.student_id
        AND user_role.user_id = auth.uid()
        AND upper(role.key) IN ('WALI', 'WALIKELAS', 'WALI_KELAS')
    )
  );

CREATE POLICY student_grades_write_assigned
  ON public.student_grades FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.students AS student
      JOIN public.schedules AS schedule ON schedule.class_id = student.class_id
      WHERE student.id = student_grades.student_id
        AND schedule.subject_id = student_grades.subject_id
        AND schedule.guru_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.students AS student
      JOIN public.schedules AS schedule ON schedule.class_id = student.class_id
      WHERE student.id = student_grades.student_id
        AND schedule.subject_id = student_grades.subject_id
        AND schedule.guru_id = auth.uid()
    )
  );

CREATE POLICY teaching_journals_read_assigned
  ON public.teaching_journals FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.class_sessions AS session
      JOIN public.schedules AS schedule ON schedule.id = session.schedule_id
      WHERE session.id = teaching_journals.session_id
        AND (
          schedule.guru_id = auth.uid()
          OR private.current_profile_role() IN ('ADMIN', 'WAKA')
        )
    )
  );

CREATE POLICY teaching_journals_write_assigned
  ON public.teaching_journals FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_sessions AS session
      JOIN public.schedules AS schedule ON schedule.id = session.schedule_id
      WHERE session.id = teaching_journals.session_id AND schedule.guru_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.class_sessions AS session
      JOIN public.schedules AS schedule ON schedule.id = session.schedule_id
      WHERE session.id = teaching_journals.session_id AND schedule.guru_id = auth.uid()
    )
  );

CREATE POLICY notifications_read_scoped
  ON public.notifications FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR private.current_profile_role() IN ('ADMIN', 'WAKA')
  );