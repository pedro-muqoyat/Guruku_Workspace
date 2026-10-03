BEGIN;

ALTER POLICY classes_read_assigned
  ON public.classes
  USING (
    private.current_profile_role() IN ('ADMIN', 'WAKA')
    OR (
      private.current_profile_role() <> 'TU'
      AND (
        EXISTS (
          SELECT 1
          FROM public.schedules AS schedule
          WHERE schedule.class_id = classes.id
            AND schedule.guru_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1
          FROM public.user_roles AS user_role
          JOIN public.roles AS role ON role.id = user_role.role_id
          WHERE user_role.class_id = classes.id
            AND user_role.user_id = auth.uid()
            AND upper(role.key) IN ('WALI', 'WALIKELAS', 'WALI_KELAS')
        )
      )
    )
  );

ALTER POLICY subjects_read_authenticated
  ON public.subjects
  USING (private.current_profile_role() <> 'TU');

ALTER POLICY students_read_assigned
  ON public.students
  USING (
    private.current_profile_role() IN ('ADMIN', 'WAKA')
    OR (
      private.current_profile_role() <> 'TU'
      AND (
        EXISTS (
          SELECT 1
          FROM public.schedules AS schedule
          WHERE schedule.class_id = students.class_id
            AND schedule.guru_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1
          FROM public.user_roles AS user_role
          JOIN public.roles AS role ON role.id = user_role.role_id
          WHERE user_role.class_id = students.class_id
            AND user_role.user_id = auth.uid()
            AND upper(role.key) IN ('WALI', 'WALIKELAS', 'WALI_KELAS')
        )
      )
    )
  );

ALTER POLICY class_sessions_read_assigned
  ON public.class_sessions
  USING (
    private.current_profile_role() IN ('ADMIN', 'WAKA')
    OR (
      private.current_profile_role() <> 'TU'
      AND EXISTS (
        SELECT 1
        FROM public.schedules AS schedule
        WHERE schedule.id = class_sessions.schedule_id
          AND (
            schedule.guru_id = auth.uid()
            OR EXISTS (
              SELECT 1
              FROM public.user_roles AS user_role
              JOIN public.roles AS role ON role.id = user_role.role_id
              WHERE user_role.user_id = auth.uid()
                AND user_role.class_id = schedule.class_id
                AND upper(role.key) IN ('WALI', 'WALIKELAS', 'WALI_KELAS')
            )
          )
      )
    )
  );

ALTER POLICY class_sessions_write_assigned
  ON public.class_sessions
  WITH CHECK (
    private.current_profile_role() <> 'TU'
    AND EXISTS (
      SELECT 1
      FROM public.schedules AS schedule
      WHERE schedule.id = class_sessions.schedule_id
        AND schedule.guru_id = auth.uid()
    )
  );

ALTER POLICY attendance_read_assigned
  ON public.attendance_logs
  USING (
    private.current_profile_role() IN ('ADMIN', 'WAKA')
    OR (
      private.current_profile_role() <> 'TU'
      AND EXISTS (
        SELECT 1
        FROM public.class_sessions AS session
        JOIN public.schedules AS schedule ON schedule.id = session.schedule_id
        WHERE session.id = attendance_logs.session_id
          AND (
            schedule.guru_id = auth.uid()
            OR EXISTS (
              SELECT 1
              FROM public.user_roles AS user_role
              JOIN public.roles AS role ON role.id = user_role.role_id
              WHERE user_role.user_id = auth.uid()
                AND user_role.class_id = schedule.class_id
                AND upper(role.key) IN ('WALI', 'WALIKELAS', 'WALI_KELAS')
            )
          )
      )
    )
  );

ALTER POLICY attendance_write_assigned
  ON public.attendance_logs
  USING (
    private.current_profile_role() <> 'TU'
    AND EXISTS (
      SELECT 1
      FROM public.class_sessions AS session
      JOIN public.schedules AS schedule ON schedule.id = session.schedule_id
      WHERE session.id = attendance_logs.session_id
        AND schedule.guru_id = auth.uid()
    )
  )
  WITH CHECK (
    private.current_profile_role() <> 'TU'
    AND EXISTS (
      SELECT 1
      FROM public.class_sessions AS session
      JOIN public.schedules AS schedule ON schedule.id = session.schedule_id
      JOIN public.students AS student ON student.id = attendance_logs.student_id
      WHERE session.id = attendance_logs.session_id
        AND schedule.guru_id = auth.uid()
        AND student.class_id = schedule.class_id
    )
  );

ALTER POLICY student_grades_read_assigned
  ON public.student_grades
  USING (
    private.current_profile_role() IN ('ADMIN', 'WAKA')
    OR (
      private.current_profile_role() <> 'TU'
      AND (
        EXISTS (
          SELECT 1
          FROM public.students AS student
          JOIN public.schedules AS schedule
            ON schedule.class_id = student.class_id
          WHERE student.id = student_grades.student_id
            AND schedule.subject_id = student_grades.subject_id
            AND schedule.guru_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1
          FROM public.students AS student
          JOIN public.user_roles AS user_role
            ON user_role.class_id = student.class_id
          JOIN public.roles AS role ON role.id = user_role.role_id
          WHERE student.id = student_grades.student_id
            AND user_role.user_id = auth.uid()
            AND upper(role.key) IN ('WALI', 'WALIKELAS', 'WALI_KELAS')
        )
      )
    )
  );

ALTER POLICY student_grades_write_assigned
  ON public.student_grades
  USING (
    private.current_profile_role() <> 'TU'
    AND EXISTS (
      SELECT 1
      FROM public.students AS student
      JOIN public.schedules AS schedule ON schedule.class_id = student.class_id
      WHERE student.id = student_grades.student_id
        AND schedule.subject_id = student_grades.subject_id
        AND schedule.guru_id = auth.uid()
    )
  )
  WITH CHECK (
    private.current_profile_role() <> 'TU'
    AND EXISTS (
      SELECT 1
      FROM public.students AS student
      JOIN public.schedules AS schedule ON schedule.class_id = student.class_id
      WHERE student.id = student_grades.student_id
        AND schedule.subject_id = student_grades.subject_id
        AND schedule.guru_id = auth.uid()
    )
  );

ALTER POLICY teaching_journals_read_assigned
  ON public.teaching_journals
  USING (
    private.current_profile_role() <> 'TU'
    AND EXISTS (
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

ALTER POLICY teaching_journals_write_assigned
  ON public.teaching_journals
  USING (
    private.current_profile_role() <> 'TU'
    AND EXISTS (
      SELECT 1
      FROM public.class_sessions AS session
      JOIN public.schedules AS schedule ON schedule.id = session.schedule_id
      WHERE session.id = teaching_journals.session_id
        AND schedule.guru_id = auth.uid()
    )
  )
  WITH CHECK (
    private.current_profile_role() <> 'TU'
    AND EXISTS (
      SELECT 1
      FROM public.class_sessions AS session
      JOIN public.schedules AS schedule ON schedule.id = session.schedule_id
      WHERE session.id = teaching_journals.session_id
        AND schedule.guru_id = auth.uid()
    )
  );

ALTER POLICY notifications_read_scoped
  ON public.notifications
  USING (
    private.current_profile_role() <> 'TU'
    AND (
      user_id = auth.uid()
      OR private.current_profile_role() IN ('ADMIN', 'WAKA')
    )
  );

COMMIT;