-- Migration: Default new students and no-attendance students to LOW risk
-- Date: 2026-05-07
-- This migration replaces the DB-side functions to treat students with no attendance history
-- as LOW risk and provides a recompute step to update existing summaries.

-- Replace update_student_summary to default to low for students with no attendance
DROP FUNCTION IF EXISTS update_student_summary(VARCHAR) CASCADE;
CREATE OR REPLACE FUNCTION update_student_summary(p_student_lrn VARCHAR)
RETURNS TABLE(
  result_student_lrn VARCHAR,
  current_attendance_rate DECIMAL,
  attendance_trend VARCHAR,
  risk_level VARCHAR,
  next_likely_absent_date DATE,
  recommendation TEXT
) AS $$
DECLARE
  v_current_attendance DECIMAL;
  v_previous_attendance DECIMAL;
  v_trend VARCHAR;
  v_risk_level VARCHAR;
  v_pattern_type VARCHAR;
  v_pattern_confidence DECIMAL;
  v_next_absent_date DATE;
  v_prediction_confidence DECIMAL;
  v_risk_factors TEXT;
  v_recommendation TEXT;
  v_days_present INT;
  v_school_days INT;
BEGIN
  -- Get current 30-day attendance and counts
  SELECT COALESCE(attendance_rate, 0), COALESCE(days_present, 0), COALESCE(school_days, 0)
  INTO v_current_attendance, v_days_present, v_school_days
  FROM calculate_student_attendance_metrics(p_student_lrn, 30)
  LIMIT 1;

  -- Get previous 60-day attendance
  SELECT COALESCE(attendance_rate, 0)
  INTO v_previous_attendance
  FROM calculate_student_attendance_metrics(p_student_lrn, 60)
  LIMIT 1;

  -- Determine trend
  IF v_current_attendance > v_previous_attendance + 3 THEN
    v_trend := 'improving';
  ELSIF v_current_attendance < v_previous_attendance - 3 THEN
    v_trend := 'declining';
  ELSE
    v_trend := 'stable';
  END IF;

  -- If there is no attendance data (new student), default to low risk
  IF v_school_days = 0 OR v_days_present = 0 THEN
    v_risk_level := 'low';
  ELSE
    -- Determine risk level from attendance rate
    IF v_current_attendance < 60 THEN
      v_risk_level := 'critical';
    ELSIF v_current_attendance < 75 THEN
      v_risk_level := 'high';
    ELSIF v_current_attendance < 85 THEN
      v_risk_level := 'medium';
    ELSE
      v_risk_level := 'low';
    END IF;
  END IF;

  -- Get ML prediction
  SELECT 
    apred.pattern_type,
    apred.pattern_confidence,
    apred.predicted_absent_date,
    apred.prediction_confidence,
    apred.risk_factors,
    apred.recommendation
  INTO 
    v_pattern_type,
    v_pattern_confidence,
    v_next_absent_date,
    v_prediction_confidence,
    v_risk_factors,
    v_recommendation
  FROM analyze_and_predict_absence(p_student_lrn) AS apred
  LIMIT 1;

  -- Upsert summary
  INSERT INTO student_attendance_summary AS sas (
    student_lrn,
    current_attendance_rate,
    attendance_trend,
    risk_level,
    next_likely_absent_date,
    next_absent_confidence,
    recent_attendance_rate,
    last_calculated
  )
  VALUES (
    p_student_lrn,
    v_current_attendance,
    v_trend,
    v_risk_level,
    v_next_absent_date,
    v_prediction_confidence,
    v_current_attendance,
    NOW()
  )
  ON CONFLICT (student_lrn)
  DO UPDATE SET
    current_attendance_rate = EXCLUDED.current_attendance_rate,
    attendance_trend = EXCLUDED.attendance_trend,
    risk_level = EXCLUDED.risk_level,
    next_likely_absent_date = EXCLUDED.next_likely_absent_date,
    next_absent_confidence = EXCLUDED.next_absent_confidence,
    recent_attendance_rate = EXCLUDED.recent_attendance_rate,
    updated_at = NOW(),
    last_calculated = NOW();

  RETURN QUERY
  SELECT
    p_student_lrn::VARCHAR,
    ROUND(v_current_attendance::NUMERIC, 2)::DECIMAL,
    v_trend::VARCHAR,
    v_risk_level::VARCHAR,
    v_next_absent_date::DATE,
    v_recommendation::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Replace calculate_student_risk_score to return LOW when no attendance history
DROP FUNCTION IF EXISTS calculate_student_risk_score(VARCHAR) CASCADE;
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

  -- If there is no attendance data (new student), treat as low risk
  IF v_school_days = 0 OR v_days_present = 0 THEN
    v_risk_score := 0;
    v_risk_level := 'low';
    v_attendance_component := 0;
    v_behavior_component := 0;
    v_pattern_component := 0;
    v_confidence := 50;
    v_breakdown := jsonb_build_object(
      'attendance_rate', ROUND(v_attendance_rate::NUMERIC, 1),
      'days_present', v_days_present,
      'school_days', v_school_days,
      'late_percentage', 0,
      'negative_events', 0,
      'positive_events', 0,
      'guidance_average_score', 0,
      'guidance_component', 0,
      'calculation_date', CURRENT_DATE::TEXT,
      'pattern_type', NULL
    );

    RETURN QUERY SELECT
      ROUND(v_risk_score::NUMERIC, 1)::DECIMAL,
      v_risk_level::VARCHAR,
      v_attendance_component::INT,
      v_behavior_component::INT,
      v_pattern_component::INT,
      v_confidence::INT,
      v_breakdown::JSONB;
  END IF;

  -- (rest of original function behavior remains unchanged; the DB already contains the implementation)
  -- For safety, delegate to existing logic by continuing the function body if attendance exists.

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

  -- ========== CALCULATE RISK COMPONENTS ==========
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

  -- Behavior component
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

  -- Pattern component mapping
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

  -- Guidance component
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

  v_risk_score := LEAST(100, (v_attendance_component::DECIMAL + v_behavior_component::DECIMAL + v_pattern_component::DECIMAL + v_guidance_component::DECIMAL));

  IF v_risk_score >= 75 THEN
    v_risk_level := 'critical';
  ELSIF v_risk_score >= 50 THEN
    v_risk_level := 'high';
  ELSIF v_risk_score >= 25 THEN
    v_risk_level := 'medium';
  ELSE
    v_risk_level := 'low';
  END IF;

  v_breakdown := jsonb_build_object(
    'attendance_rate', ROUND(v_attendance_rate::NUMERIC, 1),
    'days_present', v_days_present,
    'school_days', v_school_days,
    'late_percentage', CASE WHEN (v_late_arrivals + v_on_time_count) > 0 THEN ROUND((v_late_arrivals::DECIMAL / (v_late_arrivals + v_on_time_count) * 100)::NUMERIC, 1) ELSE 0 END,
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

-- Recompute summaries for all students (safe single-statement loop)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT lrn FROM students LOOP
    PERFORM update_student_summary(r.lrn);
  END LOOP;
END
$$;

-- Normalize any null/empty student.risk_level values to 'low'
UPDATE students SET risk_level = 'low' WHERE risk_level IS NULL OR risk_level = '';
