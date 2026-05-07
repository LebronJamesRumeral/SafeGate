-- Migration: Add guidance scoring columns and include guidance score in ML risk calculation

ALTER TABLE behavioral_events
  ADD COLUMN IF NOT EXISTS guidance_score_input INT,
  ADD COLUMN IF NOT EXISTS guidance_behavior_score INT;

CREATE OR REPLACE FUNCTION calculate_student_risk_score(p_student_lrn VARCHAR)
RETURNS TABLE(
  risk_score DECIMAL,
  risk_level VARCHAR,
  attendance_component INT,
  behavior_component INT,
  pattern_component INT,
  confidence INT,
  breakdown JSONB
) AS $$
DECLARE
  v_attendance_rate DECIMAL;
  v_days_present INT;
  v_school_days INT;
  v_late_arrivals INT;
  v_on_time_count INT;
  v_negative_events INT;
  v_positive_events INT;
  v_guidance_average_score DECIMAL := 0;
  v_guidance_component INT := 0;
  v_risk_score DECIMAL := 0;
  v_risk_level VARCHAR;
  v_attendance_component INT := 0;
  v_behavior_component INT := 0;
  v_pattern_component INT := 0;
  v_confidence INT := 70;
  v_breakdown JSONB;
  v_pattern_type VARCHAR;
BEGIN
  -- Get attendance metrics (60 days)
  SELECT
    COALESCE(attendance_rate, 0),
    COALESCE(days_present, 0),
    COALESCE(school_days, 0),
    COALESCE(late_arrivals, 0),
    COALESCE(on_time_count, 0)
  INTO v_attendance_rate, v_days_present, v_school_days, v_late_arrivals, v_on_time_count
  FROM calculate_student_attendance_metrics(p_student_lrn, 60)
  LIMIT 1;

  -- Get behavioral events (last 30 days)
  SELECT
    COUNT(*) FILTER (WHERE severity IN ('major', 'critical')) as neg_events,
    COUNT(*) FILTER (WHERE severity = 'positive') as pos_events
  INTO v_negative_events, v_positive_events
  FROM behavioral_events
  WHERE student_lrn = p_student_lrn
    AND event_date >= CURRENT_DATE - INTERVAL '30 days';

  -- Get averaged guidance score from reviewed logs (last 30 days)
  SELECT COALESCE(AVG(guidance_behavior_score), 0)
  INTO v_guidance_average_score
  FROM behavioral_events
  WHERE student_lrn = p_student_lrn
    AND guidance_behavior_score IS NOT NULL
    AND event_date >= CURRENT_DATE - INTERVAL '30 days';

  -- Get pattern type
  SELECT pattern_type INTO v_pattern_type
  FROM attendance_patterns
  WHERE student_lrn = p_student_lrn
  LIMIT 1;

  -- 1. ATTENDANCE COMPONENT (0-40 points)
  IF v_attendance_rate >= 95 THEN
    v_attendance_component := 0;
  ELSIF v_attendance_rate >= 85 THEN
    v_attendance_component := 8;
  ELSIF v_attendance_rate >= 75 THEN
    v_attendance_component := 15;
  ELSIF v_attendance_rate >= 60 THEN
    v_attendance_component := 25;
  ELSE
    v_attendance_component := 40;
  END IF;

  -- Add late arrival penalty if high frequency
  IF (v_late_arrivals + v_on_time_count) > 0 THEN
    IF (v_late_arrivals::DECIMAL / (v_late_arrivals + v_on_time_count)) > 0.5 THEN
      v_attendance_component := LEAST(v_attendance_component + 10, 40);
    END IF;
  END IF;

  -- 2. BEHAVIOR COMPONENT (0-35 points)
  IF v_negative_events = 0 AND v_positive_events > 0 THEN
    v_behavior_component := 0;
  ELSIF v_negative_events = 0 THEN
    v_behavior_component := 5;
  ELSIF v_negative_events = 1 THEN
    v_behavior_component := 10;
  ELSIF v_negative_events = 2 THEN
    v_behavior_component := 15;
  ELSIF v_negative_events = 3 THEN
    v_behavior_component := 22;
  ELSE
    v_behavior_component := 35;
  END IF;

  -- 3. PATTERN COMPONENT (0-25 points)
  IF v_pattern_type = 'High Consistency' THEN
    v_pattern_component := 0;
  ELSIF v_pattern_type = 'Average Attendance' THEN
    v_pattern_component := 5;
  ELSIF v_pattern_type = 'Late Arrival Trend' THEN
    v_pattern_component := 10;
  ELSIF v_pattern_type = 'Monday Absent' OR v_pattern_type = 'Friday Absent' THEN
    v_pattern_component := 12;
  ELSIF v_pattern_type = 'Sporadic Absent' THEN
    v_pattern_component := 18;
  ELSIF v_pattern_type = 'Chronic Absent' THEN
    v_pattern_component := 25;
  ELSE
    v_pattern_component := 8;
  END IF;

  -- 4. GUIDANCE COMPONENT (0-15 points)
  IF v_guidance_average_score >= 90 THEN
    v_guidance_component := 15;
  ELSIF v_guidance_average_score >= 75 THEN
    v_guidance_component := 12;
  ELSIF v_guidance_average_score >= 60 THEN
    v_guidance_component := 9;
  ELSIF v_guidance_average_score >= 45 THEN
    v_guidance_component := 6;
  ELSIF v_guidance_average_score >= 30 THEN
    v_guidance_component := 3;
  ELSE
    v_guidance_component := 0;
  END IF;

  -- CALCULATE TOTAL RISK SCORE (0-100)
  v_risk_score := LEAST(
    100,
    (
      v_attendance_component::DECIMAL
      + v_behavior_component::DECIMAL
      + v_pattern_component::DECIMAL
      + v_guidance_component::DECIMAL
    )
  );

  -- DETERMINE RISK LEVEL
  IF v_risk_score >= 75 THEN
    v_risk_level := 'critical';
  ELSIF v_risk_score >= 50 THEN
    v_risk_level := 'high';
  ELSIF v_risk_score >= 25 THEN
    v_risk_level := 'medium';
  ELSE
    v_risk_level := 'low';
  END IF;

  -- BUILD BREAKDOWN OBJECT
  v_breakdown := jsonb_build_object(
    'attendance_rate', ROUND(v_attendance_rate::NUMERIC, 1),
    'days_present', v_days_present,
    'school_days', v_school_days,
    'late_percentage', CASE
      WHEN (v_late_arrivals + v_on_time_count) > 0 THEN ROUND((v_late_arrivals::DECIMAL / (v_late_arrivals + v_on_time_count) * 100)::NUMERIC, 1)
      ELSE 0
    END,
    'negative_events', v_negative_events,
    'positive_events', v_positive_events,
    'guidance_average_score', ROUND(v_guidance_average_score::NUMERIC, 1),
    'guidance_component', v_guidance_component,
    'calculation_date', CURRENT_DATE::TEXT,
    'pattern_type', v_pattern_type
  );

  RETURN QUERY SELECT
    ROUND(v_risk_score::NUMERIC, 1)::DECIMAL,
    v_risk_level::VARCHAR,
    v_attendance_component::INT,
    v_behavior_component::INT,
    v_pattern_component::INT,
    v_confidence::INT,
    v_breakdown::JSONB;
END;
$$ LANGUAGE plpgsql;
