-- Migration: count cancelled/holiday attendance correctly in student summary and attendance metrics
-- Date: 2026-08-11

ALTER TABLE student_attendance_summary
  ADD COLUMN IF NOT EXISTS total_days_cancelled INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_days_holiday INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_no_class_days INT DEFAULT 0;

DROP FUNCTION IF EXISTS calculate_student_attendance_metrics(VARCHAR, INT) CASCADE;
CREATE OR REPLACE FUNCTION calculate_student_attendance_metrics(p_student_lrn VARCHAR, p_days_back INT DEFAULT 60)
RETURNS TABLE(
  attendance_rate DECIMAL,
  days_present INT,
  school_days INT,
  late_arrivals INT,
  on_time_count INT,
  cancelled_days INT,
  holiday_days INT,
  no_class_days INT
) AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  v_start_date := CURRENT_DATE - (p_days_back || ' days')::interval;
  v_end_date := CURRENT_DATE;

  RETURN QUERY
  WITH school_day_series AS (
    SELECT gs::date AS school_day
    FROM generate_series(v_start_date, v_end_date, '1 day'::interval) AS gs
    WHERE EXTRACT(DOW FROM gs) BETWEEN 1 AND 5
  ),
  effective_school_days AS (
    SELECT COUNT(s.school_day)::INT AS effective_school_days
    FROM school_day_series s
    WHERE NOT EXISTS (
      SELECT 1
      FROM attendance_logs al
      WHERE al.student_lrn = p_student_lrn
        AND al.date = s.school_day
        AND al.attendance_status IN ('holiday', 'cancelled_class')
    )
  ),
  attendance_stats AS (
    SELECT
      COUNT(DISTINCT CASE WHEN al.is_present = true AND al.attendance_status NOT IN ('holiday', 'cancelled_class') THEN al.date END)::INT AS days_present,
      COUNT(DISTINCT CASE WHEN al.attendance_status = 'cancelled_class' THEN al.date END)::INT AS cancelled_days,
      COUNT(DISTINCT CASE WHEN al.attendance_status = 'holiday' THEN al.date END)::INT AS holiday_days,
      COUNT(DISTINCT CASE WHEN al.attendance_status IN ('cancelled_class', 'holiday') THEN al.date END)::INT AS no_class_days,
      COUNT(*) FILTER (
        WHERE al.is_present = true
          AND al.attendance_status NOT IN ('holiday', 'cancelled_class')
          AND (
            EXTRACT(HOUR FROM al.check_in_time) > 8
            OR (EXTRACT(HOUR FROM al.check_in_time) = 8 AND EXTRACT(MINUTE FROM al.check_in_time) > 30)
          )
      )::INT AS late_arrivals,
      COUNT(*) FILTER (
        WHERE al.is_present = true
          AND al.attendance_status NOT IN ('holiday', 'cancelled_class')
          AND (
            EXTRACT(HOUR FROM al.check_in_time) < 8
            OR (EXTRACT(HOUR FROM al.check_in_time) = 8 AND EXTRACT(MINUTE FROM al.check_in_time) <= 30)
          )
      )::INT AS on_time_count
    FROM attendance_logs al
    WHERE al.student_lrn = p_student_lrn
      AND al.date >= v_start_date
      AND al.date <= v_end_date
      AND al.attendance_status NOT IN ('holiday', 'cancelled_class')
  )
  SELECT
    CASE
      WHEN COALESCE(effective_school_days.effective_school_days, 0) = 0 THEN 0
      ELSE ROUND((COALESCE(attendance_stats.days_present, 0)::DECIMAL / effective_school_days.effective_school_days) * 100, 2)
    END,
    COALESCE(attendance_stats.days_present, 0),
    COALESCE(effective_school_days.effective_school_days, 0),
    COALESCE(attendance_stats.late_arrivals, 0),
    COALESCE(attendance_stats.on_time_count, 0),
    COALESCE(attendance_stats.cancelled_days, 0),
    COALESCE(attendance_stats.holiday_days, 0),
    COALESCE(attendance_stats.no_class_days, 0)
  FROM effective_school_days
  CROSS JOIN attendance_stats;
END;
$$ LANGUAGE plpgsql;

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
  v_late_arrivals INT;
  v_cancelled_days INT;
  v_holiday_days INT;
  v_no_class_days INT;
  v_absent_days INT;
BEGIN
  SELECT
    attendance_rate,
    days_present,
    school_days,
    late_arrivals,
    cancelled_days,
    holiday_days,
    no_class_days
  INTO
    v_current_attendance,
    v_days_present,
    v_school_days,
    v_late_arrivals,
    v_cancelled_days,
    v_holiday_days,
    v_no_class_days
  FROM calculate_student_attendance_metrics(p_student_lrn, 30)
  LIMIT 1;

  SELECT COALESCE(attendance_rate, 0)
  INTO v_previous_attendance
  FROM calculate_student_attendance_metrics(p_student_lrn, 60)
  LIMIT 1;

  IF v_current_attendance > v_previous_attendance + 3 THEN
    v_trend := 'improving';
  ELSIF v_current_attendance < v_previous_attendance - 3 THEN
    v_trend := 'declining';
  ELSE
    v_trend := 'stable';
  END IF;

  IF v_school_days = 0 THEN
    v_risk_level := 'low';
  ELSIF v_current_attendance < 50 THEN
    v_risk_level := 'critical';
  ELSIF v_current_attendance < 70 THEN
    v_risk_level := 'high';
  ELSIF v_current_attendance < 85 THEN
    v_risk_level := 'medium';  -- Fair attendance (50-85%) falls here
  ELSE
    v_risk_level := 'low';
  END IF;

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

  v_absent_days := GREATEST(v_school_days - v_days_present, 0);

  INSERT INTO student_attendance_summary AS sas (
    student_lrn,
    current_attendance_rate,
    attendance_trend,
    risk_level,
    total_days_present,
    total_days_absent,
    total_days_late,
    total_days_cancelled,
    total_days_holiday,
    total_no_class_days,
    recent_attendance_rate,
    recent_absent_count,
    next_likely_absent_date,
    next_absent_confidence,
    last_calculated
  )
  VALUES (
    p_student_lrn,
    v_current_attendance,
    v_trend,
    v_risk_level,
    v_days_present,
    v_absent_days,
    v_late_arrivals,
    v_cancelled_days,
    v_holiday_days,
    v_no_class_days,
    v_current_attendance,
    v_absent_days,
    v_next_absent_date,
    v_prediction_confidence,
    NOW()
  )
  ON CONFLICT (student_lrn)
  DO UPDATE SET
    current_attendance_rate = EXCLUDED.current_attendance_rate,
    attendance_trend = EXCLUDED.attendance_trend,
    risk_level = EXCLUDED.risk_level,
    total_days_present = EXCLUDED.total_days_present,
    total_days_absent = EXCLUDED.total_days_absent,
    total_days_late = EXCLUDED.total_days_late,
    total_days_cancelled = EXCLUDED.total_days_cancelled,
    total_days_holiday = EXCLUDED.total_days_holiday,
    total_no_class_days = EXCLUDED.total_no_class_days,
    recent_attendance_rate = EXCLUDED.recent_attendance_rate,
    recent_absent_count = EXCLUDED.recent_absent_count,
    next_likely_absent_date = EXCLUDED.next_likely_absent_date,
    next_absent_confidence = EXCLUDED.next_absent_confidence,
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
  v_late_percentage DECIMAL;
BEGIN
  SELECT
    COALESCE(attendance_rate, 0),
    COALESCE(days_present, 0),
    COALESCE(school_days, 0),
    COALESCE(late_arrivals, 0),
    COALESCE(on_time_count, 0)
  INTO
    v_attendance_rate,
    v_days_present,
    v_school_days,
    v_late_arrivals,
    v_on_time_count
  FROM calculate_student_attendance_metrics(p_student_lrn, 60)
  LIMIT 1;

  SELECT
    COUNT(*) FILTER (WHERE severity IN ('major', 'critical')),
    COUNT(*) FILTER (WHERE severity = 'positive')
  INTO v_negative_events, v_positive_events
  FROM behavioral_events
  WHERE student_lrn = p_student_lrn
    AND event_date >= CURRENT_DATE - INTERVAL '30 days';

  SELECT COALESCE(AVG(guidance_behavior_score), 0)
  INTO v_guidance_average_score
  FROM behavioral_events
  WHERE student_lrn = p_student_lrn
    AND guidance_behavior_score IS NOT NULL
    AND event_date >= CURRENT_DATE - INTERVAL '30 days';

  SELECT pattern_type
  INTO v_pattern_type
  FROM attendance_patterns
  WHERE student_lrn = p_student_lrn
  ORDER BY created_at DESC NULLS LAST
  LIMIT 1;

  IF v_school_days = 0 THEN
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
      'negative_events', COALESCE(v_negative_events, 0),
      'positive_events', COALESCE(v_positive_events, 0),
      'guidance_average_score', ROUND(v_guidance_average_score::NUMERIC, 1),
      'guidance_component', 0,
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
  END IF;

  -- Adjusted thresholds to align Fair attendance (54-60%) with medium risk
  IF v_attendance_rate >= 90 THEN
    v_attendance_component := 0;
  ELSIF v_attendance_rate >= 80 THEN
    v_attendance_component := 5;
  ELSIF v_attendance_rate >= 70 THEN
    v_attendance_component := 12;
  ELSIF v_attendance_rate >= 60 THEN
    v_attendance_component := 18;
  ELSIF v_attendance_rate >= 50 THEN
    v_attendance_component := 25;  -- Fair attendance (50-60%) = medium risk baseline
  ELSIF v_attendance_rate >= 40 THEN
    v_attendance_component := 35;
  ELSE
    v_attendance_component := 45;  -- Below 40% = very high risk
  END IF;

  v_late_percentage := CASE
    WHEN (v_late_arrivals + v_on_time_count) > 0 THEN (v_late_arrivals::DECIMAL / (v_late_arrivals + v_on_time_count)) * 100
    ELSE 0
  END;

  IF v_late_percentage > 50 THEN
    v_attendance_component := LEAST(v_attendance_component + 10, 40);
  END IF;

  IF COALESCE(v_negative_events, 0) = 0 AND COALESCE(v_positive_events, 0) > 0 THEN
    v_behavior_component := 0;
  ELSIF COALESCE(v_negative_events, 0) = 0 THEN
    v_behavior_component := 5;
  ELSIF COALESCE(v_negative_events, 0) = 1 THEN
    v_behavior_component := 10;
  ELSIF COALESCE(v_negative_events, 0) = 2 THEN
    v_behavior_component := 15;
  ELSIF COALESCE(v_negative_events, 0) = 3 THEN
    v_behavior_component := 22;
  ELSE
    v_behavior_component := 35;
  END IF;

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

  -- Inverted: better guidance scores reduce risk
  IF v_guidance_average_score >= 85 THEN
    v_guidance_component := 0;
  ELSIF v_guidance_average_score >= 75 THEN
    v_guidance_component := 3;
  ELSIF v_guidance_average_score >= 60 THEN
    v_guidance_component := 6;
  ELSIF v_guidance_average_score >= 45 THEN
    v_guidance_component := 9;
  ELSIF v_guidance_average_score >= 30 THEN
    v_guidance_component := 12;
  ELSE
    v_guidance_component := 15;
  END IF;

  v_risk_score := LEAST(
    100,
    (
      v_attendance_component::DECIMAL
      + v_behavior_component::DECIMAL
      + v_pattern_component::DECIMAL
      + v_guidance_component::DECIMAL
    )
  );

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
    'late_percentage', ROUND(v_late_percentage::NUMERIC, 1),
    'negative_events', COALESCE(v_negative_events, 0),
    'positive_events', COALESCE(v_positive_events, 0),
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

WITH active_students AS (
  SELECT lrn
  FROM students
  WHERE status = 'active'
)
SELECT update_student_summary(lrn)
FROM active_students;
