-- Rollback for the RLS hardening migration
-- Use this if the new policies block access unexpectedly.

DROP POLICY IF EXISTS profiles_select_staff_or_self ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;
DROP POLICY IF EXISTS profiles_update_staff_or_self ON public.profiles;

DROP POLICY IF EXISTS students_select_staff_or_parent ON public.students;
DROP POLICY IF EXISTS students_manage_staff ON public.students;
DROP POLICY IF EXISTS students_update_staff ON public.students;
DROP POLICY IF EXISTS students_delete_staff ON public.students;

DROP POLICY IF EXISTS attendance_logs_select_staff_or_parent ON public.attendance_logs;
DROP POLICY IF EXISTS attendance_logs_manage_staff ON public.attendance_logs;
DROP POLICY IF EXISTS attendance_logs_update_staff ON public.attendance_logs;
DROP POLICY IF EXISTS attendance_logs_delete_staff ON public.attendance_logs;

DROP POLICY IF EXISTS parent_attendance_notes_select_staff_or_parent ON public.parent_attendance_notes;
DROP POLICY IF EXISTS parent_attendance_notes_manage_staff ON public.parent_attendance_notes;
DROP POLICY IF EXISTS parent_attendance_notes_update_staff ON public.parent_attendance_notes;
DROP POLICY IF EXISTS parent_attendance_notes_delete_staff ON public.parent_attendance_notes;

DROP POLICY IF EXISTS school_years_select_auth ON public.school_years;
DROP POLICY IF EXISTS school_years_manage_staff ON public.school_years;
DROP POLICY IF EXISTS school_years_update_staff ON public.school_years;
DROP POLICY IF EXISTS school_years_delete_staff ON public.school_years;

DROP POLICY IF EXISTS student_schedules_select_auth ON public.student_schedules;
DROP POLICY IF EXISTS student_schedules_manage_staff ON public.student_schedules;
DROP POLICY IF EXISTS student_schedules_update_staff ON public.student_schedules;
DROP POLICY IF EXISTS student_schedules_delete_staff ON public.student_schedules;

DROP POLICY IF EXISTS student_attendance_schedules_select_auth ON public.student_attendance_schedules;
DROP POLICY IF EXISTS student_attendance_schedules_manage_staff ON public.student_attendance_schedules;
DROP POLICY IF EXISTS student_attendance_schedules_update_staff ON public.student_attendance_schedules;
DROP POLICY IF EXISTS student_attendance_schedules_delete_staff ON public.student_attendance_schedules;

DROP POLICY IF EXISTS summer_enrollments_select_auth ON public.summer_enrollments;
DROP POLICY IF EXISTS summer_enrollments_manage_staff ON public.summer_enrollments;
DROP POLICY IF EXISTS summer_enrollments_update_staff ON public.summer_enrollments;
DROP POLICY IF EXISTS summer_enrollments_delete_staff ON public.summer_enrollments;

DROP POLICY IF EXISTS heatmap_zones_select_auth ON public.heatmap_zones;
DROP POLICY IF EXISTS heatmap_zones_manage_staff ON public.heatmap_zones;
DROP POLICY IF EXISTS heatmap_zones_update_staff ON public.heatmap_zones;
DROP POLICY IF EXISTS heatmap_zones_delete_staff ON public.heatmap_zones;

DROP POLICY IF EXISTS behavioral_events_select_staff_or_parent ON public.behavioral_events;
DROP POLICY IF EXISTS behavioral_events_manage_staff ON public.behavioral_events;
DROP POLICY IF EXISTS behavioral_events_update_staff ON public.behavioral_events;
DROP POLICY IF EXISTS behavioral_events_delete_staff ON public.behavioral_events;

DROP POLICY IF EXISTS achievements_select_staff_or_parent ON public.achievements;
DROP POLICY IF EXISTS achievements_manage_staff ON public.achievements;
DROP POLICY IF EXISTS achievements_update_staff ON public.achievements;
DROP POLICY IF EXISTS achievements_delete_staff ON public.achievements;

DROP POLICY IF EXISTS school_events_select_auth ON public.school_events;
DROP POLICY IF EXISTS school_events_manage_staff ON public.school_events;
DROP POLICY IF EXISTS school_events_update_staff ON public.school_events;
DROP POLICY IF EXISTS school_events_delete_staff ON public.school_events;

DROP POLICY IF EXISTS role_notifications_select_auth ON public.role_notifications;
DROP POLICY IF EXISTS role_notifications_manage_staff ON public.role_notifications;
DROP POLICY IF EXISTS role_notifications_update_staff ON public.role_notifications;

DROP POLICY IF EXISTS attendance_patterns_select_staff_or_parent ON public.attendance_patterns;
DROP POLICY IF EXISTS attendance_patterns_manage_staff ON public.attendance_patterns;
DROP POLICY IF EXISTS attendance_patterns_update_staff ON public.attendance_patterns;

DROP POLICY IF EXISTS absence_predictions_select_staff_or_parent ON public.absence_predictions;
DROP POLICY IF EXISTS absence_predictions_manage_staff ON public.absence_predictions;
DROP POLICY IF EXISTS absence_predictions_update_staff ON public.absence_predictions;

DROP POLICY IF EXISTS student_attendance_summary_select_staff_or_parent ON public.student_attendance_summary;
DROP POLICY IF EXISTS student_attendance_summary_manage_staff ON public.student_attendance_summary;
DROP POLICY IF EXISTS student_attendance_summary_update_staff ON public.student_attendance_summary;

DROP POLICY IF EXISTS system_settings_select_staff ON public.system_settings;
DROP POLICY IF EXISTS system_settings_manage_staff ON public.system_settings;
DROP POLICY IF EXISTS system_settings_update_staff ON public.system_settings;
DROP POLICY IF EXISTS system_settings_delete_staff ON public.system_settings;

DROP POLICY IF EXISTS school_year_undos_select_auth ON public.school_year_undos;
DROP POLICY IF EXISTS school_year_undos_manage_staff ON public.school_year_undos;
DROP POLICY IF EXISTS school_year_undos_update_staff ON public.school_year_undos;
DROP POLICY IF EXISTS school_year_undos_delete_staff ON public.school_year_undos;

DROP POLICY IF EXISTS event_categories_select_auth ON public.event_categories;
DROP POLICY IF EXISTS event_categories_manage_staff ON public.event_categories;
DROP POLICY IF EXISTS event_categories_update_staff ON public.event_categories;
DROP POLICY IF EXISTS event_categories_delete_staff ON public.event_categories;

DROP FUNCTION IF EXISTS public.user_role();
DROP FUNCTION IF EXISTS public.is_staff();
DROP FUNCTION IF EXISTS public.is_parent_for_student(text);

-- Re-enable permissive access by restoring the old public policies if you want a full rollback
-- You can also simply drop the RLS on tables if you want to restore access quickly.
-- Example:
-- ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.attendance_logs DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.behavioral_events DISABLE ROW LEVEL SECURITY;
