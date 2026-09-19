-- Culminating activity attendance override.
-- SafeGate uses attendance_status/date/student_lrn in attendance_logs.

ALTER TABLE attendance_logs
  ADD COLUMN IF NOT EXISTS activity_name TEXT;

ALTER TABLE attendance_logs
  ADD COLUMN IF NOT EXISTS is_auto_generated BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE attendance_logs
  DROP CONSTRAINT IF EXISTS attendance_logs_attendance_status_check;

ALTER TABLE attendance_logs
  ADD CONSTRAINT attendance_logs_attendance_status_check
  CHECK (attendance_status IN (
    'present',
    'absent',
    'late',
    'invalid_timeout',
    'cancelled_class',
    'cancelled_morning',
    'cancelled_afternoon',
    'holiday',
    'culminating_activity',
    'excused'
  )) NOT VALID;

CREATE INDEX IF NOT EXISTS idx_attendance_logs_date_status
  ON attendance_logs(date, attendance_status);

CREATE TABLE IF NOT EXISTS culminating_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_date DATE NOT NULL,
  activity_name TEXT,
  levels_included TEXT[] NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE culminating_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage culminating activities" ON culminating_activities;
CREATE POLICY "Admins can manage culminating activities"
  ON culminating_activities
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION apply_culminating_activity(
  p_activity_date DATE,
  p_levels_included TEXT[],
  p_activity_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  activity_id UUID;
BEGIN
  IF COALESCE(array_length(p_levels_included, 1), 0) = 0 THEN
    RAISE EXCEPTION 'At least one level must be selected';
  END IF;

  INSERT INTO culminating_activities (activity_date, activity_name, levels_included, created_by)
  VALUES (p_activity_date, NULLIF(trim(p_activity_name), ''), p_levels_included, auth.uid())
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
            AND NOT (existing.is_present = FALSE AND existing.check_in_time::time = TIME '00:00:00')
          THEN existing.check_in_time
          ELSE p_activity_date::timestamp AT TIME ZONE 'UTC' END,
    existing.check_out_time,
    p_activity_date,
    CASE WHEN existing.check_in_time IS NOT NULL
          AND existing.is_auto_generated IS DISTINCT FROM TRUE
          AND NOT (existing.is_present = FALSE AND existing.check_in_time::time = TIME '00:00:00') THEN TRUE
         WHEN s.level = ANY(p_levels_included) THEN TRUE
         ELSE FALSE END,
    CASE WHEN existing.check_in_time IS NOT NULL
          AND existing.is_auto_generated IS DISTINCT FROM TRUE
          AND NOT (existing.is_present = FALSE AND existing.check_in_time::time = TIME '00:00:00') THEN 'present'
         WHEN s.level = ANY(p_levels_included) THEN 'culminating_activity'
         ELSE 'excused' END,
    NULL,
    CASE WHEN existing.check_in_time IS NOT NULL
          AND existing.is_auto_generated IS DISTINCT FROM TRUE
          AND NOT (existing.is_present = FALSE AND existing.check_in_time::time = TIME '00:00:00') THEN existing.is_late ELSE FALSE END,
    CASE WHEN existing.check_in_time IS NOT NULL
          AND existing.is_auto_generated IS DISTINCT FROM TRUE
          AND NOT (existing.is_present = FALSE AND existing.check_in_time::time = TIME '00:00:00') THEN existing.is_invalid_timeout ELSE FALSE END,
    NULLIF(trim(p_activity_name), ''),
    CASE WHEN existing.check_in_time IS NOT NULL
          AND existing.is_auto_generated IS DISTINCT FROM TRUE
          AND NOT (existing.is_present = FALSE AND existing.check_in_time::time = TIME '00:00:00') THEN FALSE ELSE TRUE END
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

REVOKE ALL ON FUNCTION apply_culminating_activity(DATE, TEXT[], TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION apply_culminating_activity(DATE, TEXT[], TEXT) TO authenticated;
