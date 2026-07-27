-- Harden Supabase access controls without replacing the existing schema
-- This migration adds role-aware RLS policies and helper functions.

CREATE OR REPLACE FUNCTION public.user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    (auth.jwt() -> 'user_metadata' ->> 'role')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT public.user_role() IN ('admin', 'teacher', 'guidance');
$$;

CREATE OR REPLACE FUNCTION public.is_parent_for_student(student_lrn text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.lrn = $1
      AND lower(COALESCE(s.parent_email, '')) = lower(COALESCE(
        (SELECT email FROM auth.users WHERE id = auth.uid()),
        ''
      ))
  );
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_attendance_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attendance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.heatmap_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavioral_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absence_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attendance_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_year_undos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summer_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS profiles_select_staff_or_self ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;
DROP POLICY IF EXISTS profiles_update_staff_or_self ON public.profiles;
CREATE POLICY profiles_select_staff_or_self ON public.profiles
  FOR SELECT
  USING (public.is_staff() OR auth.uid() = id);
CREATE POLICY profiles_insert_self ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update_staff_or_self ON public.profiles
  FOR UPDATE
  USING (public.is_staff() OR auth.uid() = id)
  WITH CHECK (public.is_staff() OR auth.uid() = id);

-- Students and attendance records
DROP POLICY IF EXISTS students_select_staff_or_parent ON public.students;
DROP POLICY IF EXISTS students_manage_staff ON public.students;
CREATE POLICY students_select_staff_or_parent ON public.students
  FOR SELECT
  USING (public.is_staff() OR public.is_parent_for_student(lrn));
CREATE POLICY students_manage_staff ON public.students
  FOR INSERT
  WITH CHECK (public.is_staff());
CREATE POLICY students_update_staff ON public.students
  FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
CREATE POLICY students_delete_staff ON public.students
  FOR DELETE
  USING (public.is_staff());

DROP POLICY IF EXISTS attendance_logs_select_staff_or_parent ON public.attendance_logs;
DROP POLICY IF EXISTS attendance_logs_manage_staff ON public.attendance_logs;
CREATE POLICY attendance_logs_select_staff_or_parent ON public.attendance_logs
  FOR SELECT
  USING (public.is_staff() OR public.is_parent_for_student(student_lrn));
CREATE POLICY attendance_logs_manage_staff ON public.attendance_logs
  FOR INSERT
  WITH CHECK (public.is_staff());
CREATE POLICY attendance_logs_update_staff ON public.attendance_logs
  FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
CREATE POLICY attendance_logs_delete_staff ON public.attendance_logs
  FOR DELETE
  USING (public.is_staff());

DROP POLICY IF EXISTS parent_attendance_notes_select_staff_or_parent ON public.parent_attendance_notes;
DROP POLICY IF EXISTS parent_attendance_notes_manage_staff ON public.parent_attendance_notes;
CREATE POLICY parent_attendance_notes_select_staff_or_parent ON public.parent_attendance_notes
  FOR SELECT
  USING (public.is_staff() OR public.is_parent_for_student(student_lrn));
CREATE POLICY parent_attendance_notes_manage_staff ON public.parent_attendance_notes
  FOR INSERT
  WITH CHECK (public.is_staff());
CREATE POLICY parent_attendance_notes_update_staff ON public.parent_attendance_notes
  FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
CREATE POLICY parent_attendance_notes_delete_staff ON public.parent_attendance_notes
  FOR DELETE
  USING (public.is_staff());

-- Scheduling tables
DROP POLICY IF EXISTS school_years_select_auth ON public.school_years;
DROP POLICY IF EXISTS school_years_manage_staff ON public.school_years;
CREATE POLICY school_years_select_auth ON public.school_years
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY school_years_manage_staff ON public.school_years
  FOR INSERT
  WITH CHECK (public.is_staff());
CREATE POLICY school_years_update_staff ON public.school_years
  FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
CREATE POLICY school_years_delete_staff ON public.school_years
  FOR DELETE
  USING (public.is_staff());

DROP POLICY IF EXISTS student_schedules_select_auth ON public.student_schedules;
DROP POLICY IF EXISTS student_schedules_manage_staff ON public.student_schedules;
CREATE POLICY student_schedules_select_auth ON public.student_schedules
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY student_schedules_manage_staff ON public.student_schedules
  FOR INSERT
  WITH CHECK (public.is_staff());
CREATE POLICY student_schedules_update_staff ON public.student_schedules
  FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
CREATE POLICY student_schedules_delete_staff ON public.student_schedules
  FOR DELETE
  USING (public.is_staff());

DROP POLICY IF EXISTS student_attendance_schedules_select_auth ON public.student_attendance_schedules;
DROP POLICY IF EXISTS student_attendance_schedules_manage_staff ON public.student_attendance_schedules;
CREATE POLICY student_attendance_schedules_select_auth ON public.student_attendance_schedules
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY student_attendance_schedules_manage_staff ON public.student_attendance_schedules
  FOR INSERT
  WITH CHECK (public.is_staff());
CREATE POLICY student_attendance_schedules_update_staff ON public.student_attendance_schedules
  FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
CREATE POLICY student_attendance_schedules_delete_staff ON public.student_attendance_schedules
  FOR DELETE
  USING (public.is_staff());

DROP POLICY IF EXISTS summer_enrollments_select_auth ON public.summer_enrollments;
DROP POLICY IF EXISTS summer_enrollments_manage_staff ON public.summer_enrollments;
CREATE POLICY summer_enrollments_select_auth ON public.summer_enrollments
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY summer_enrollments_manage_staff ON public.summer_enrollments
  FOR INSERT
  WITH CHECK (public.is_staff());
CREATE POLICY summer_enrollments_update_staff ON public.summer_enrollments
  FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
CREATE POLICY summer_enrollments_delete_staff ON public.summer_enrollments
  FOR DELETE
  USING (public.is_staff());

-- General app data tables
DROP POLICY IF EXISTS heatmap_zones_select_auth ON public.heatmap_zones;
DROP POLICY IF EXISTS heatmap_zones_manage_staff ON public.heatmap_zones;
CREATE POLICY heatmap_zones_select_auth ON public.heatmap_zones
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY heatmap_zones_manage_staff ON public.heatmap_zones
  FOR INSERT
  WITH CHECK (public.is_staff());
CREATE POLICY heatmap_zones_update_staff ON public.heatmap_zones
  FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
CREATE POLICY heatmap_zones_delete_staff ON public.heatmap_zones
  FOR DELETE
  USING (public.is_staff());

DROP POLICY IF EXISTS behavioral_events_select_staff_or_parent ON public.behavioral_events;
DROP POLICY IF EXISTS behavioral_events_manage_staff ON public.behavioral_events;
CREATE POLICY behavioral_events_select_staff_or_parent ON public.behavioral_events
  FOR SELECT
  USING (public.is_staff() OR public.is_parent_for_student(student_lrn));
CREATE POLICY behavioral_events_manage_staff ON public.behavioral_events
  FOR INSERT
  WITH CHECK (public.is_staff());
CREATE POLICY behavioral_events_update_staff ON public.behavioral_events
  FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
CREATE POLICY behavioral_events_delete_staff ON public.behavioral_events
  FOR DELETE
  USING (public.is_staff());

DROP POLICY IF EXISTS achievements_select_staff_or_parent ON public.achievements;
DROP POLICY IF EXISTS achievements_manage_staff ON public.achievements;
CREATE POLICY achievements_select_staff_or_parent ON public.achievements
  FOR SELECT
  USING (public.is_staff() OR public.is_parent_for_student(student_lrn));
CREATE POLICY achievements_manage_staff ON public.achievements
  FOR INSERT
  WITH CHECK (public.is_staff());
CREATE POLICY achievements_update_staff ON public.achievements
  FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
CREATE POLICY achievements_delete_staff ON public.achievements
  FOR DELETE
  USING (public.is_staff());

DROP POLICY IF EXISTS school_events_select_auth ON public.school_events;
DROP POLICY IF EXISTS school_events_manage_staff ON public.school_events;
CREATE POLICY school_events_select_auth ON public.school_events
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY school_events_manage_staff ON public.school_events
  FOR INSERT
  WITH CHECK (public.is_staff());
CREATE POLICY school_events_update_staff ON public.school_events
  FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
CREATE POLICY school_events_delete_staff ON public.school_events
  FOR DELETE
  USING (public.is_staff());

DROP POLICY IF EXISTS role_notifications_select_auth ON public.role_notifications;
DROP POLICY IF EXISTS role_notifications_manage_staff ON public.role_notifications;
CREATE POLICY role_notifications_select_auth ON public.role_notifications
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY role_notifications_manage_staff ON public.role_notifications
  FOR INSERT
  WITH CHECK (public.is_staff());
CREATE POLICY role_notifications_update_staff ON public.role_notifications
  FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS attendance_patterns_select_staff_or_parent ON public.attendance_patterns;
DROP POLICY IF EXISTS attendance_patterns_manage_staff ON public.attendance_patterns;
CREATE POLICY attendance_patterns_select_staff_or_parent ON public.attendance_patterns
  FOR SELECT
  USING (public.is_staff() OR public.is_parent_for_student(student_lrn));
CREATE POLICY attendance_patterns_manage_staff ON public.attendance_patterns
  FOR INSERT
  WITH CHECK (public.is_staff());
CREATE POLICY attendance_patterns_update_staff ON public.attendance_patterns
  FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS absence_predictions_select_staff_or_parent ON public.absence_predictions;
DROP POLICY IF EXISTS absence_predictions_manage_staff ON public.absence_predictions;
CREATE POLICY absence_predictions_select_staff_or_parent ON public.absence_predictions
  FOR SELECT
  USING (public.is_staff() OR public.is_parent_for_student(student_lrn));
CREATE POLICY absence_predictions_manage_staff ON public.absence_predictions
  FOR INSERT
  WITH CHECK (public.is_staff());
CREATE POLICY absence_predictions_update_staff ON public.absence_predictions
  FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS student_attendance_summary_select_staff_or_parent ON public.student_attendance_summary;
DROP POLICY IF EXISTS student_attendance_summary_manage_staff ON public.student_attendance_summary;
CREATE POLICY student_attendance_summary_select_staff_or_parent ON public.student_attendance_summary
  FOR SELECT
  USING (public.is_staff() OR public.is_parent_for_student(student_lrn));
CREATE POLICY student_attendance_summary_manage_staff ON public.student_attendance_summary
  FOR INSERT
  WITH CHECK (public.is_staff());
CREATE POLICY student_attendance_summary_update_staff ON public.student_attendance_summary
  FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS system_settings_select_staff ON public.system_settings;
DROP POLICY IF EXISTS system_settings_manage_staff ON public.system_settings;
CREATE POLICY system_settings_select_staff ON public.system_settings
  FOR SELECT
  USING (public.is_staff());
CREATE POLICY system_settings_manage_staff ON public.system_settings
  FOR INSERT
  WITH CHECK (public.is_staff());
CREATE POLICY system_settings_update_staff ON public.system_settings
  FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
CREATE POLICY system_settings_delete_staff ON public.system_settings
  FOR DELETE
  USING (public.is_staff());

DROP POLICY IF EXISTS school_year_undos_select_auth ON public.school_year_undos;
DROP POLICY IF EXISTS school_year_undos_manage_staff ON public.school_year_undos;
CREATE POLICY school_year_undos_select_auth ON public.school_year_undos
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY school_year_undos_manage_staff ON public.school_year_undos
  FOR INSERT
  WITH CHECK (public.is_staff());
CREATE POLICY school_year_undos_update_staff ON public.school_year_undos
  FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
CREATE POLICY school_year_undos_delete_staff ON public.school_year_undos
  FOR DELETE
  USING (public.is_staff());

DROP POLICY IF EXISTS event_categories_select_auth ON public.event_categories;
DROP POLICY IF EXISTS event_categories_manage_staff ON public.event_categories;
CREATE POLICY event_categories_select_auth ON public.event_categories
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY event_categories_manage_staff ON public.event_categories
  FOR INSERT
  WITH CHECK (public.is_staff());
CREATE POLICY event_categories_update_staff ON public.event_categories
  FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
CREATE POLICY event_categories_delete_staff ON public.event_categories
  FOR DELETE
  USING (public.is_staff());
