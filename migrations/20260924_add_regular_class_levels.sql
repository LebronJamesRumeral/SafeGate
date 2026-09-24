ALTER TABLE culminating_activities
  ADD COLUMN IF NOT EXISTS regular_levels TEXT[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION apply_culminating_activity(
  p_activity_date DATE,
  p_levels_included TEXT[],
  p_activity_name TEXT,
  p_regular_levels TEXT[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  activity_id UUID;
  regular_levels TEXT[] := COALESCE(p_regular_levels, '{}');
BEGIN
  IF COALESCE(array_length(p_levels_included, 1), 0) = 0 THEN
    RAISE EXCEPTION 'At least one level must be selected';
  END IF;

  IF p_levels_included && regular_levels THEN
    RAISE EXCEPTION 'A level cannot be both participating and regular class';
  END IF;

  INSERT INTO culminating_activities (activity_date, activity_name, levels_included, regular_levels, created_by)
  VALUES (p_activity_date, NULLIF(trim(p_activity_name), ''), p_levels_included, regular_levels, auth.uid())
  RETURNING id INTO activity_id;

  INSERT INTO attendance_logs (
    student_lrn,
    check_in_time,
    check_out_time,
    date,
    is_present,
    attendance_status,
    cancellation_status,
    is_late,
    is_invalid_timeout,
    activity_name,
    is_auto_generated
  )
  SELECT
    s.lrn,
    CASE WHEN existing.check_in_time IS NOT NULL
          AND existing.is_auto_generated IS DISTINCT FROM TRUE
      THEN existing.check_in_time
      ELSE p_activity_date::timestamp AT TIME ZONE 'UTC' END,
    existing.check_out_time,
    p_activity_date,
    CASE WHEN existing.check_in_time IS NOT NULL
          AND existing.is_auto_generated IS DISTINCT FROM TRUE THEN TRUE
         ELSE FALSE END,
    CASE WHEN existing.check_in_time IS NOT NULL
          AND existing.is_auto_generated IS DISTINCT FROM TRUE THEN 'present'
         WHEN s.level = ANY(p_levels_included) THEN 'culminating_activity'
         WHEN s.level = ANY(regular_levels) THEN 'absent'
         ELSE 'excused' END,
    NULL,
    CASE WHEN existing.check_in_time IS NOT NULL
          AND existing.is_auto_generated IS DISTINCT FROM TRUE THEN existing.is_late ELSE FALSE END,
    CASE WHEN existing.check_in_time IS NOT NULL
          AND existing.is_auto_generated IS DISTINCT FROM TRUE THEN existing.is_invalid_timeout ELSE FALSE END,
    NULLIF(trim(p_activity_name), ''),
    CASE WHEN existing.check_in_time IS NOT NULL
          AND existing.is_auto_generated IS DISTINCT FROM TRUE THEN FALSE ELSE TRUE END
  FROM students s
  LEFT JOIN attendance_logs existing
    ON existing.student_lrn = s.lrn AND existing.date = p_activity_date
  WHERE lower(COALESCE(s.status, 'active')) IN ('active', 'enrolled', 'current', 'on_roll', 'student', '', 'null')
  ON CONFLICT (student_lrn, date) DO UPDATE SET
    check_in_time = EXCLUDED.check_in_time,
    check_out_time = EXCLUDED.check_out_time,
    is_present = EXCLUDED.is_present,
    attendance_status = EXCLUDED.attendance_status,
    cancellation_status = EXCLUDED.cancellation_status,
    is_late = EXCLUDED.is_late,
    is_invalid_timeout = EXCLUDED.is_invalid_timeout,
    activity_name = EXCLUDED.activity_name,
    is_auto_generated = EXCLUDED.is_auto_generated;

  RETURN activity_id;
END;
$$;

REVOKE ALL ON FUNCTION apply_culminating_activity(DATE, TEXT[], TEXT, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION apply_culminating_activity(DATE, TEXT[], TEXT, TEXT[]) TO authenticated;