CREATE OR REPLACE FUNCTION recalculate_all_risk_scores()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
  student_record RECORD;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM students
  WHERE lower(COALESCE(status, 'active')) IN ('active', 'enrolled', 'current', 'on_roll', 'student', '', 'null');

  FOR student_record IN
    SELECT lrn
    FROM students
    WHERE lower(COALESCE(status, 'active')) IN ('active', 'enrolled', 'current', 'on_roll', 'student', '', 'null')
  LOOP
    PERFORM update_student_summary(student_record.lrn);
  END LOOP;

  UPDATE students s
  SET risk_level = sas.risk_level,
      updated_at = NOW()
  FROM student_attendance_summary sas
  WHERE s.lrn = sas.student_lrn
    AND lower(COALESCE(s.status, 'active')) IN ('active', 'enrolled', 'current', 'on_roll', 'student', '', 'null');

  RETURN updated_count;
END;
$$;

REVOKE ALL ON FUNCTION recalculate_all_risk_scores() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION recalculate_all_risk_scores() TO authenticated;