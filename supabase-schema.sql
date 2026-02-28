-- ============================================================================

DROP TABLE IF EXISTS student_behavioral_summary CASCADE;
DROP TABLE IF EXISTS parent_notifications CASCADE;
DROP TABLE IF EXISTS interventions CASCADE;
DROP TABLE IF EXISTS behavioral_patterns CASCADE;
DROP TABLE IF EXISTS behavioral_events CASCADE;
DROP TABLE IF EXISTS event_categories CASCADE;
-- Remove custom users table for Supabase Auth migration
DROP TABLE IF EXISTS student_attendance_summary CASCADE;
DROP TABLE IF EXISTS absence_predictions CASCADE;
DROP TABLE IF EXISTS attendance_patterns CASCADE;
DROP TABLE IF EXISTS attendance_logs CASCADE;
DROP TABLE IF EXISTS students CASCADE;

-- ============================================================================

-- Supabase Auth Profile Table (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id BIGSERIAL PRIMARY KEY,
  lrn VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  gender VARCHAR(20) NOT NULL,
  birthday DATE NOT NULL,
  address TEXT,
  level VARCHAR(50) NOT NULL,
  parent_name VARCHAR(255),
  parent_contact VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create attendance_logs table (Core ML Data Source)
CREATE TABLE IF NOT EXISTS attendance_logs (
  id BIGSERIAL PRIMARY KEY,
  student_lrn VARCHAR(50) NOT NULL REFERENCES students(lrn) ON DELETE CASCADE,
  check_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
  check_out_time TIMESTAMP WITH TIME ZONE,
  date DATE NOT NULL,
  is_present BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_lrn, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_students_lrn ON students(lrn);
CREATE INDEX IF NOT EXISTS idx_students_level ON students(level);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_attendance_student_lrn ON attendance_logs(student_lrn);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_logs(date);
CREATE INDEX IF NOT EXISTS idx_attendance_is_present ON attendance_logs(is_present);

-- Insert sample students
INSERT INTO students (lrn, name, gender, birthday, address, level, parent_name, parent_contact, status) VALUES
  ('LRN-2026-0001', 'Sarah Johnson', 'Female', '2014-05-12', '12 Lakeview St, City', 'Grade 4', 'Maria Johnson', '0917-555-0101', 'active'),
  ('LRN-2026-0002', 'James Smith', 'Male', '2013-11-03', '88 Maple Ave, City', 'Grade 5', 'Anthony Smith', '0917-555-0102', 'active'),
  ('LRN-2026-0003', 'Emily Davis', 'Female', '2016-02-19', '5 Sunrise Rd, City', 'Grade 2', 'Laura Davis', '0917-555-0103', 'active'),
  ('LRN-2026-0004', 'Michael Brown', 'Male', '2015-09-21', '77 Pine St, City', 'Grade 3', 'Daniel Brown', '0917-555-0104', 'active'),
  ('LRN-2026-0005', 'Jessica White', 'Female', '2012-07-30', '23 River Dr, City', 'Grade 6', 'Grace White', '0917-555-0105', 'active'),
  ('LRN-2026-0006', 'David Wilson', 'Male', '2017-01-08', '9 Orchard Ln, City', 'Grade 1', 'Chloe Wilson', '0917-555-0106', 'active'),
  ('LRN-2026-0007', 'Lisa Anderson', 'Female', '2023-03-15', '31 Hillside St, City', 'Kinder 1', 'Evelyn Anderson', '0917-555-0107', 'active'),
  ('LRN-2026-0008', 'Robert Taylor', 'Male', '2022-10-20', '54 Sunset Blvd, City', 'Kinder 2', 'Noah Taylor', '0917-555-0108', 'active'),
  ('LRN-2026-0009', 'Mia Santos', 'Female', '2023-01-15', '18 Garden St, City', 'Toddler & Nursery', 'Ana Santos', '0917-555-0109', 'active'),
  ('LRN-2026-0010', 'Sophia Garcia', 'Female', '2022-02-08', '42 Oak St, City', 'Pre-K', 'Rosa Garcia', '0917-555-0110', 'active'),
  ('LRN-2026-0011', 'Liam Martinez', 'Male', '2014-08-16', '67 Cedar Ave, City', 'Grade 4', 'Carmen Martinez', '0917-555-0111', 'active'),
  ('LRN-2026-0012', 'Olivia Hernandez', 'Female', '2015-12-05', '91 Willow St, City', 'Grade 3', 'Diego Hernandez', '0917-555-0112', 'active'),
  ('LRN-2026-0013', 'Noah Lopez', 'Male', '2013-04-28', '14 Birch Ln, City', 'Grade 5', 'Sofia Lopez', '0917-555-0113', 'active'),
  ('LRN-2026-0014', 'Emma Gonzalez', 'Female', '2016-06-14', '36 Elm St, City', 'Grade 2', 'Miguel Gonzalez', '0917-555-0114', 'active'),
  ('LRN-2026-0015', 'Ava Ramirez', 'Female', '2023-07-22', '58 Spruce Dr, City', 'Kinder 1', 'Isabel Ramirez', '0917-555-0115', 'active')
ON CONFLICT (lrn) DO NOTHING;

-- Insert sample attendance logs (last 90 days) - Foundation for ML training
INSERT INTO attendance_logs (student_lrn, check_in_time, check_out_time, date, is_present) VALUES
  -- High attendance student (LRN-2026-0001: Sarah Johnson)
  ('LRN-2026-0001', '2025-11-15 07:45:00+00', '2025-11-15 15:30:00+00', '2025-11-15', true),
  ('LRN-2026-0001', '2025-11-16 07:48:00+00', '2025-11-16 15:28:00+00', '2025-11-16', true),
  ('LRN-2026-0001', '2025-11-17 07:50:00+00', '2025-11-17 15:32:00+00', '2025-11-17', true),
  ('LRN-2026-0001', '2025-11-18 07:45:00+00', '2025-11-18 15:30:00+00', '2025-11-18', true),
  ('LRN-2026-0001', '2025-11-19 07:52:00+00', '2025-11-19 15:25:00+00', '2025-11-19', true),
  ('LRN-2026-0001', '2025-11-22 07:48:00+00', '2025-11-22 15:30:00+00', '2025-11-22', true),
  ('LRN-2026-0001', '2025-11-23 07:46:00+00', '2025-11-23 15:28:00+00', '2025-11-23', true),
  ('LRN-2026-0001', '2025-11-24 07:50:00+00', '2025-11-24 15:32:00+00', '2025-11-24', true),
  ('LRN-2026-0001', '2025-11-25 07:45:00+00', '2025-11-25 15:30:00+00', '2025-11-25', true),
  ('LRN-2026-0001', '2025-11-26 07:48:00+00', '2025-11-26 15:28:00+00', '2025-11-26', true),
  
  -- Chronic absence Monday pattern (LRN-2026-0005: Jessica White)
  ('LRN-2026-0005', '2025-11-18 07:55:00+00', '2025-11-18 15:30:00+00', '2025-11-18', true),
  ('LRN-2026-0005', '2025-11-19 08:15:00+00', '2025-11-19 15:05:00+00', '2025-11-19', true),
  ('LRN-2026-0005', '2025-11-21 08:10:00+00', '2025-11-21 15:15:00+00', '2025-11-21', true),
  ('LRN-2026-0005', '2025-11-25 08:20:00+00', '2025-11-25 15:10:00+00', '2025-11-25', true),
  ('LRN-2026-0005', '2025-11-26 08:05:00+00', '2025-11-26 15:20:00+00', '2025-11-26', true),
  
  -- Late arrival pattern (LRN-2026-0002: James Smith)
  ('LRN-2026-0002', '2025-11-15 08:35:00+00', '2025-11-15 15:30:00+00', '2025-11-15', true),
  ('LRN-2026-0002', '2025-11-16 08:40:00+00', '2025-11-16 15:28:00+00', '2025-11-16', true),
  ('LRN-2026-0002', '2025-11-17 08:30:00+00', '2025-11-17 15:32:00+00', '2025-11-17', true),
  ('LRN-2026-0002', '2025-11-18 08:45:00+00', '2025-11-18 15:30:00+00', '2025-11-18', true),
  ('LRN-2026-0002', '2025-11-19 08:50:00+00', '2025-11-19 15:25:00+00', '2025-11-19', true),
  ('LRN-2026-0002', '2025-11-22 08:35:00+00', '2025-11-22 15:30:00+00', '2025-11-22', true),
  ('LRN-2026-0002', '2025-11-24 08:40:00+00', '2025-11-24 15:32:00+00', '2025-11-24', true),
  ('LRN-2026-0002', '2025-11-25 08:30:00+00', '2025-11-25 15:30:00+00', '2025-11-25', true),
  
  -- Inconsistent attendance (LRN-2026-0012: Olivia Hernandez)
  ('LRN-2026-0012', '2025-11-15 07:58:00+00', '2025-11-15 15:22:00+00', '2025-11-15', true),
  ('LRN-2026-0012', '2025-11-18 07:55:00+00', '2025-11-18 15:25:00+00', '2025-11-18', true),
  ('LRN-2026-0012', '2025-11-24 08:10:00+00', '2025-11-24 15:15:00+00', '2025-11-24', true),
  ('LRN-2026-0012', '2025-11-26 08:05:00+00', '2025-11-26 15:20:00+00', '2025-11-26', true),
  
  -- Recent dates (current week - for forecasting)
  ('LRN-2026-0001', '2026-02-02 07:48:00+00', '2026-02-02 15:30:00+00', '2026-02-02', true),
  ('LRN-2026-0001', '2026-02-03 07:50:00+00', '2026-02-03 15:28:00+00', '2026-02-03', true),
  ('LRN-2026-0001', '2026-02-04 07:45:00+00', '2026-02-04 15:32:00+00', '2026-02-04', true),
  ('LRN-2026-0005', '2026-02-03 08:10:00+00', '2026-02-03 15:15:00+00', '2026-02-03', true),
  ('LRN-2026-0005', '2026-02-04 08:15:00+00', '2026-02-04 15:10:00+00', '2026-02-04', true),
  ('LRN-2026-0002', '2026-02-02 08:40:00+00', '2026-02-02 15:30:00+00', '2026-02-02', true),
  ('LRN-2026-0002', '2026-02-03 08:35:00+00', '2026-02-03 15:28:00+00', '2026-02-03', true),
  ('LRN-2026-0012', '2026-02-04 08:10:00+00', '2026-02-04 15:20:00+00', '2026-02-04', true)
ON CONFLICT (student_lrn, date) DO NOTHING;

-- ============================================================================
-- ML CORE: Behavioral Analytics Based on Attendance Patterns
-- ============================================================================

-- Table for storing computed attendance patterns
CREATE TABLE IF NOT EXISTS attendance_patterns (
  id BIGSERIAL PRIMARY KEY,
  student_lrn VARCHAR(50) UNIQUE NOT NULL REFERENCES students(lrn) ON DELETE CASCADE,
  
  -- Pattern Classification
  pattern_type VARCHAR(100), -- 'High Consistency', 'Late Arrival', 'Monday Absent', 'Chronic Absent', 'Sporadic'
  pattern_confidence DECIMAL(5,2), -- 0-100: Pattern strength confidence
  
  -- Attendance Metrics (last 60 days)
  attendance_rate DECIMAL(5,2), -- 0-100: % of school days present
  days_present INT,
  days_absent INT,
  total_school_days INT,
  
  -- Time Pattern Metrics
  avg_check_in_minute INT, -- Average minute of check-in (0-1439)
  late_arrivals_count INT, -- Count of check-ins after 8:30am
  late_arrival_frequency DECIMAL(5,2), -- % of days late
  
  -- Day-specific patterns
  monday_absent_rate DECIMAL(5,2),
  friday_absent_rate DECIMAL(5,2),
  weekend_correlation BOOLEAN, -- Is absence correlated with weekends?
  
  -- Risk Indicators
  absence_trend VARCHAR(20), -- 'improving', 'declining', 'stable'
  critical_threshold_days INT, -- Days until 70% attendance critical level
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for ML predictions: When will student be absent?
CREATE TABLE IF NOT EXISTS absence_predictions (
  id BIGSERIAL PRIMARY KEY,
  student_lrn VARCHAR(50) NOT NULL REFERENCES students(lrn) ON DELETE CASCADE,
  
  -- Prediction details
  predicted_absent_date DATE NOT NULL,
  prediction_type VARCHAR(50), -- 'Monday Pattern', 'Friday Pattern', 'Chronic', 'Anomaly'
  confidence_score DECIMAL(5,2), -- 0-100: How confident in prediction
  risk_factors JSONB, -- Array of contributing factors
  
  -- Model metadata
  model_version VARCHAR(20) DEFAULT '1.0',
  training_data_size INT, -- How many historical days used
  prediction_made_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Validation (updated after actual date)
  actual_present BOOLEAN,
  verified_at TIMESTAMP WITH TIME ZONE,
  model_accuracy_impact DECIMAL(5,2), -- +points if correct, -points if wrong
  
  UNIQUE(student_lrn, predicted_absent_date)
);

-- Student behavioral summary (aggregated, updated daily)
CREATE TABLE IF NOT EXISTS student_attendance_summary (
  id BIGSERIAL PRIMARY KEY,
  student_lrn VARCHAR(50) UNIQUE NOT NULL REFERENCES students(lrn) ON DELETE CASCADE,
  
  -- Current status
  current_attendance_rate DECIMAL(5,2),
  attendance_trend VARCHAR(20), -- 'improving', 'stable', 'declining', 'critical'
  risk_level VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
  
  -- Historical counts (all-time)
  total_days_present INT DEFAULT 0,
  total_days_absent INT DEFAULT 0,
  total_days_late INT DEFAULT 0,
  
  -- Recent metrics (30 days)
  recent_attendance_rate DECIMAL(5,2),
  recent_absent_count INT,
  
  -- Predictions
  next_likely_absent_date DATE,
  next_absent_confidence DECIMAL(5,2),
  days_until_critical_threshold INT,
  
  -- Last update
  last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indices for ML operations
CREATE INDEX IF NOT EXISTS idx_attendance_patterns_lrn ON attendance_patterns(student_lrn);
CREATE INDEX IF NOT EXISTS idx_attendance_patterns_type ON attendance_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_absence_predictions_student ON absence_predictions(student_lrn);
CREATE INDEX IF NOT EXISTS idx_absence_predictions_date ON absence_predictions(predicted_absent_date);
CREATE INDEX IF NOT EXISTS idx_student_summary_risk ON student_attendance_summary(risk_level);
CREATE INDEX IF NOT EXISTS idx_student_summary_trend ON student_attendance_summary(attendance_trend);

-- ============================================================================
-- BEHAVIORAL EVENTS: Based on Attendance Patterns
-- ============================================================================

-- Event categories based on attendance behavior
CREATE TABLE IF NOT EXISTS event_categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category_type VARCHAR(50) NOT NULL,
  severity_level VARCHAR(20) NOT NULL,
  color_code VARCHAR(20) DEFAULT '#6b7280',
  description TEXT,
  notify_parent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Behavioral events derived from attendance patterns
CREATE TABLE IF NOT EXISTS behavioral_events (
  id BIGSERIAL PRIMARY KEY,
  student_lrn VARCHAR(50) NOT NULL REFERENCES students(lrn) ON DELETE CASCADE,
  category_id BIGINT REFERENCES event_categories(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(255),
  reported_by VARCHAR(255) NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  parent_notified BOOLEAN DEFAULT false,
  follow_up_required BOOLEAN DEFAULT false,
  action_taken TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_lrn, event_date, event_time, event_type)
);

-- Create indices for behavioral events
CREATE INDEX IF NOT EXISTS idx_behavioral_events_student ON behavioral_events(student_lrn);
CREATE INDEX IF NOT EXISTS idx_behavioral_events_date ON behavioral_events(event_date);
CREATE INDEX IF NOT EXISTS idx_behavioral_events_severity ON behavioral_events(severity);
CREATE INDEX IF NOT EXISTS idx_behavioral_events_category ON behavioral_events(category_id);

-- Insert attendance-based event categories
INSERT INTO event_categories (name, category_type, severity_level, color_code, description, notify_parent) VALUES
  ('Chronic Absent', 'Attendance', 'critical', '#dc2626', 'Student has very low attendance', true),
  ('Sporadic Absent', 'Attendance', 'major', '#ef4444', 'Student has inconsistent attendance', true),
  ('Monday Absent', 'Attendance', 'minor', '#f59e0b', 'Student frequently absent on Mondays', true),
  ('Friday Absent', 'Attendance', 'minor', '#f59e0b', 'Student frequently absent on Fridays', true),
  ('Late Arrival Trend', 'Attendance', 'minor', '#f59e0b', 'Student frequently arrives late', true),
  ('High Consistency', 'Attendance', 'positive', '#10b981', 'Student has excellent attendance', false),
  ('Average Attendance', 'Attendance', 'positive', '#10b981', 'Student has average attendance', false)
ON CONFLICT DO NOTHING;

-- Enable RLS on behavioral tables
ALTER TABLE event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_events ENABLE ROW LEVEL SECURITY;

-- Set up public access policies
CREATE POLICY "Enable read for all on event categories" ON event_categories FOR SELECT USING (true);
CREATE POLICY "Enable insert for all on event categories" ON event_categories FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read for all on behavioral events" ON behavioral_events FOR SELECT USING (true);
CREATE POLICY "Enable insert for all on behavioral events" ON behavioral_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all on behavioral events" ON behavioral_events FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all on behavioral events" ON behavioral_events FOR DELETE USING (true);

-- ============================================================================
-- ML PREDICTION FUNCTIONS: Core Absence Forecasting Engine
-- ============================================================================

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS calculate_student_attendance_metrics(VARCHAR, INT) CASCADE;
DROP FUNCTION IF EXISTS analyze_and_predict_absence(VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS store_absence_prediction(VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS update_student_summary(VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS calculate_student_risk_score(VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS generate_behavioral_events_from_patterns(VARCHAR) CASCADE;

-- Helper function to calculate student attendance metrics
CREATE OR REPLACE FUNCTION calculate_student_attendance_metrics(p_student_lrn VARCHAR, p_days_back INT DEFAULT 60)
RETURNS TABLE(
  attendance_rate DECIMAL,
  days_present INT,
  school_days INT,
  late_arrivals INT,
  on_time_count INT
) AS $$
BEGIN
  RETURN QUERY
  WITH date_range AS (
    SELECT CURRENT_DATE - INTERVAL '1 day' * p_days_back AS start_date,
           CURRENT_DATE AS end_date
  ),
  school_days_calc AS (
    SELECT COUNT(DISTINCT DATE(d)) as total_school_days
    FROM generate_series(
      (SELECT start_date FROM date_range),
      (SELECT end_date FROM date_range),
      '1 day'::interval
    ) AS d
    WHERE EXTRACT(DOW FROM d) BETWEEN 1 AND 5
  ),
  student_days AS (
    SELECT COUNT(DISTINCT date) as present_days
    FROM attendance_logs
    WHERE student_lrn = p_student_lrn
      AND date >= (SELECT start_date FROM date_range)
      AND date <= (SELECT end_date FROM date_range)
      AND is_present = true
  ),
  late_calc AS (
    SELECT 
      COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM check_in_time) > 8 OR 
                              (EXTRACT(HOUR FROM check_in_time) = 8 AND EXTRACT(MINUTE FROM check_in_time) > 30)) as late_cnt,
      COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM check_in_time) <= 8 AND 
                              (EXTRACT(HOUR FROM check_in_time) < 8 OR EXTRACT(MINUTE FROM check_in_time) <= 30)) as on_time_cnt
    FROM attendance_logs
    WHERE student_lrn = p_student_lrn
      AND date >= (SELECT start_date FROM date_range)
      AND date <= (SELECT end_date FROM date_range)
      AND is_present = true
  )
  SELECT
    ROUND((COALESCE((SELECT present_days FROM student_days), 0)::DECIMAL / 
           NULLIF((SELECT total_school_days FROM school_days_calc), 0) * 100)::NUMERIC, 2),
    COALESCE((SELECT present_days FROM student_days), 0)::INT,
    (SELECT total_school_days FROM school_days_calc)::INT,
    COALESCE((SELECT late_cnt FROM late_calc), 0)::INT,
    COALESCE((SELECT on_time_cnt FROM late_calc), 0)::INT;
END;
$$ LANGUAGE plpgsql;

-- Main function: Analyze patterns and predict next absent date
CREATE OR REPLACE FUNCTION analyze_and_predict_absence(p_student_lrn VARCHAR)
RETURNS TABLE(
  pattern_type VARCHAR,
  pattern_confidence DECIMAL,
  predicted_absent_date DATE,
  prediction_confidence DECIMAL,
  risk_factors TEXT,
  recommendation VARCHAR
) AS $$
DECLARE
  v_attendance_rate DECIMAL;
  v_days_present INT;
  v_school_days INT;
  v_late_count INT;
  v_on_time_count INT;
  v_monday_rate DECIMAL;
  v_friday_rate DECIMAL;
  v_pattern_type VARCHAR;
  v_pattern_confidence DECIMAL;
  v_next_absent_date DATE;
  v_prediction_confidence DECIMAL;
  v_risk_factors TEXT := '';
  v_recommendation VARCHAR := '';
  v_late_percentage DECIMAL;
BEGIN
  -- Get attendance metrics (last 60 days)
  SELECT 
    COALESCE(attendance_rate, 0),
    COALESCE(days_present, 0),
    COALESCE(school_days, 0),
    COALESCE(late_arrivals, 0),
    COALESCE(on_time_count, 0)
  INTO v_attendance_rate, v_days_present, v_school_days, v_late_count, v_on_time_count
  FROM calculate_student_attendance_metrics(p_student_lrn, 60);

  -- Calculate late percentage
  v_late_percentage := CASE WHEN (v_late_count + v_on_time_count) > 0 
    THEN (v_late_count::DECIMAL / (v_late_count + v_on_time_count)) * 100 
    ELSE 0 END;

  -- Determine Monday/Friday absence rates
  SELECT COALESCE(
    (COUNT(*) FILTER (WHERE NOT EXISTS (
      SELECT 1 FROM attendance_logs al 
      WHERE al.student_lrn = p_student_lrn 
      AND al.date = DATE(d)
    ))::DECIMAL / NULLIF(COUNT(*), 0) * 100),
    0
  )
  INTO v_monday_rate
  FROM generate_series(
    CURRENT_DATE - INTERVAL '60 day',
    CURRENT_DATE,
    '1 day'::interval
  ) AS d
  WHERE EXTRACT(DOW FROM d) = 1;

  SELECT COALESCE(
    (COUNT(*) FILTER (WHERE NOT EXISTS (
      SELECT 1 FROM attendance_logs al 
      WHERE al.student_lrn = p_student_lrn 
      AND al.date = DATE(d)
    ))::DECIMAL / NULLIF(COUNT(*), 0) * 100),
    0
  )
  INTO v_friday_rate
  FROM generate_series(
    CURRENT_DATE - INTERVAL '60 day',
    CURRENT_DATE,
    '1 day'::interval
  ) AS d
  WHERE EXTRACT(DOW FROM d) = 5;

  -- Pattern Detection Logic
  IF v_attendance_rate < 60 THEN
    -- Chronic absence pattern
    v_pattern_type := 'Chronic Absent';
    v_pattern_confidence := LEAST((100 - v_attendance_rate) / 2, 99);
    v_risk_factors := 'Very low attendance rate (' || ROUND(v_attendance_rate::NUMERIC, 1) || '%). ';
    v_next_absent_date := CURRENT_DATE + INTERVAL '1 day';
    v_prediction_confidence := 85;
    v_recommendation := 'URGENT: Immediate parent contact and intervention required. Attendance crisis.';
    
  ELSIF v_attendance_rate < 75 THEN
    v_pattern_type := 'Sporadic Absent';
    v_pattern_confidence := 75;
    v_risk_factors := 'Inconsistent attendance (' || ROUND(v_attendance_rate::NUMERIC, 1) || '%). ';
    v_next_absent_date := CURRENT_DATE + INTERVAL '3 days';
    v_prediction_confidence := 70;
    v_recommendation := 'High risk of absence. Monitor closely. Parent meeting recommended.';
    
  ELSIF v_monday_rate > 45 THEN
    -- Monday pattern detected
    v_pattern_type := 'Monday Absent';
    v_pattern_confidence := v_monday_rate;
    v_risk_factors := 'Strong Monday absence pattern (' || ROUND(v_monday_rate::NUMERIC, 1) || '% of Mondays absent). ';
    -- Find next Monday
    v_next_absent_date := CURRENT_DATE + INTERVAL '1 day' * (CASE WHEN EXTRACT(DOW FROM CURRENT_DATE) = 1 THEN 7 
                                                               WHEN EXTRACT(DOW FROM CURRENT_DATE) <= 1 THEN 1 - EXTRACT(DOW FROM CURRENT_DATE)
                                                               ELSE 8 - EXTRACT(DOW FROM CURRENT_DATE) END);
    v_prediction_confidence := LEAST(v_monday_rate, 95);
    v_recommendation := 'Student frequently absent on Mondays. Proactive parent contact on Sunday recommended.';
    
  ELSIF v_friday_rate > 45 THEN
    -- Friday pattern detected
    v_pattern_type := 'Friday Absent';
    v_pattern_confidence := v_friday_rate;
    v_risk_factors := 'Strong Friday absence pattern (' || ROUND(v_friday_rate::NUMERIC, 1) || '% of Fridays absent). ';
    -- Find next Friday
    v_next_absent_date := CURRENT_DATE + INTERVAL '1 day' * (CASE WHEN EXTRACT(DOW FROM CURRENT_DATE) = 5 THEN 7
                                                               WHEN EXTRACT(DOW FROM CURRENT_DATE) < 5 THEN 5 - EXTRACT(DOW FROM CURRENT_DATE)
                                                               ELSE 12 - EXTRACT(DOW FROM CURRENT_DATE) END);
    v_prediction_confidence := LEAST(v_friday_rate, 95);
    v_recommendation := 'Student frequently absent on Fridays. Teacher monitoring and parent contact recommended.';
    
  ELSIF v_late_percentage > 50 THEN
    -- Late arrival pattern - high risk of absence
    v_pattern_type := 'Late Arrival Trend';
    v_pattern_confidence := v_late_percentage;
    v_risk_factors := 'Chronic lateness (' || ROUND(v_late_percentage::NUMERIC, 1) || '% of days). High risk for escalation to absence. ';
    v_next_absent_date := CURRENT_DATE + INTERVAL '2 days';
    v_prediction_confidence := 65;
    v_recommendation := 'Pattern of lateness may escalate to absence. Early intervention needed.';
    
  ELSIF v_attendance_rate >= 95 THEN
    -- Excellent attendance
    v_pattern_type := 'High Consistency';
    v_pattern_confidence := v_attendance_rate;
    v_risk_factors := 'Excellent attendance record. ';
    v_next_absent_date := NULL;
    v_prediction_confidence := 95;
    v_recommendation := 'Student has excellent attendance. Monitor for any pattern changes.';
    
  ELSE
    -- Average attendance
    v_pattern_type := 'Average Attendance';
    v_pattern_confidence := 60;
    v_risk_factors := 'Stable attendance (' || ROUND(v_attendance_rate::NUMERIC, 1) || '%). ';
    v_next_absent_date := NULL;
    v_prediction_confidence := 50;
    v_recommendation := 'Normal attendance pattern. Continue regular monitoring.';
  END IF;

  -- If no specific absent date predicted, estimate based on patterns
  IF v_next_absent_date IS NULL AND v_attendance_rate < 90 THEN
    v_next_absent_date := CURRENT_DATE + INTERVAL '4 days';
  END IF;

  RETURN QUERY SELECT
    v_pattern_type AS pattern_type,
    ROUND(v_pattern_confidence::NUMERIC, 2) AS pattern_confidence,
    v_next_absent_date AS predicted_absent_date,
    ROUND(v_prediction_confidence::NUMERIC, 2) AS prediction_confidence,
    v_risk_factors AS risk_factors,
    v_recommendation AS recommendation;
END;
$$ LANGUAGE plpgsql;

-- Store and update predictions
CREATE OR REPLACE FUNCTION store_absence_prediction(p_student_lrn VARCHAR)
RETURNS TABLE(
  prediction_id BIGINT,
  student_lrn VARCHAR,
  predicted_date DATE,
  prediction_type VARCHAR,
  confidence DECIMAL
) AS $$
DECLARE
  v_pattern_type VARCHAR;
  v_pattern_confidence DECIMAL;
  v_next_absent_date DATE;
  v_prediction_confidence DECIMAL;
  v_risk_factors TEXT;
  v_recommendation VARCHAR;
  v_prediction_id BIGINT;
BEGIN
  -- Get prediction from analysis function
  SELECT 
    apred.pattern_type, apred.pattern_confidence, apred.predicted_absent_date, 
    apred.prediction_confidence, apred.risk_factors, apred.recommendation
  INTO 
    v_pattern_type, v_pattern_confidence, v_next_absent_date,
    v_prediction_confidence, v_risk_factors, v_recommendation
  FROM analyze_and_predict_absence(p_student_lrn) AS apred
  LIMIT 1;

  -- Only store if we have a predicted date
  IF v_next_absent_date IS NOT NULL THEN
    -- Check if prediction already exists for this date
    DELETE FROM absence_predictions 
    WHERE student_lrn = p_student_lrn 
    AND predicted_absent_date = v_next_absent_date
    AND verified_at IS NULL;

    -- Insert new prediction
    INSERT INTO absence_predictions (
      student_lrn, predicted_absent_date, prediction_type, 
      confidence_score, risk_factors, training_data_size
    ) VALUES (
      p_student_lrn, v_next_absent_date, v_pattern_type,
      v_prediction_confidence, v_risk_factors::JSONB, 
      (EXTRACT(DAY FROM CURRENT_DATE - DATE('2025-11-15')))::INT
    )
    RETURNING id INTO v_prediction_id;

    RETURN QUERY SELECT
      v_prediction_id,
      p_student_lrn,
      v_next_absent_date,
      v_pattern_type,
      ROUND(v_prediction_confidence::NUMERIC, 2);
  END IF;
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
  v_recommendation TEXT;  -- FIXED: Now TEXT (not VARCHAR)
BEGIN

  -- Get current 30-day attendance
  SELECT COALESCE(attendance_rate, 0)
  INTO v_current_attendance
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

  -- Determine risk level
  IF v_current_attendance < 60 THEN
    v_risk_level := 'critical';
  ELSIF v_current_attendance < 75 THEN
    v_risk_level := 'high';
  ELSIF v_current_attendance < 85 THEN
    v_risk_level := 'medium';
  ELSE
    v_risk_level := 'low';
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

  -- Upsert summary safely
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

  -- Return properly typed values
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

-- Enable RLS on ML tables
ALTER TABLE attendance_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE absence_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_attendance_summary ENABLE ROW LEVEL SECURITY;

-- Set up public access policies for ML tables
CREATE POLICY "Enable read for all on attendance patterns" ON attendance_patterns FOR SELECT USING (true);
CREATE POLICY "Enable insert for all on attendance patterns" ON attendance_patterns FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all on attendance patterns" ON attendance_patterns FOR UPDATE USING (true);

CREATE POLICY "Enable read for all on absence predictions" ON absence_predictions FOR SELECT USING (true);
CREATE POLICY "Enable insert for all on absence predictions" ON absence_predictions FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all on absence predictions" ON absence_predictions FOR UPDATE USING (true);

CREATE POLICY "Enable read for all on student summary" ON student_attendance_summary FOR SELECT USING (true);
CREATE POLICY "Enable insert for all on student summary" ON student_attendance_summary FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all on student summary" ON student_attendance_summary FOR UPDATE USING (true);

-- ============================================================================
-- CALCULATE STUDENT RISK SCORE (COMBINES ATTENDANCE + BEHAVIOR)
-- ============================================================================

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

  -- Get pattern type
  SELECT pattern_type INTO v_pattern_type
  FROM attendance_patterns
  WHERE student_lrn = p_student_lrn
  LIMIT 1;

  -- ========== CALCULATE RISK COMPONENTS ==========
  
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

  -- CALCULATE TOTAL RISK SCORE (0-100)
  v_risk_score := (v_attendance_component::DECIMAL + v_behavior_component::DECIMAL + v_pattern_component::DECIMAL);
  
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
    'late_percentage', CASE WHEN (v_late_arrivals + v_on_time_count) > 0 
      THEN ROUND((v_late_arrivals::DECIMAL / (v_late_arrivals + v_on_time_count) * 100)::NUMERIC, 1)
      ELSE 0 END,
    'negative_events', v_negative_events,
    'positive_events', v_positive_events,
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

-- ============================================================================
-- AUTOMATICALLY GENERATE BEHAVIORAL EVENTS FROM ATTENDANCE PATTERNS
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_behavioral_events_from_patterns(p_student_lrn VARCHAR)
RETURNS TABLE(
  event_id BIGINT,
  event_type VARCHAR,
  severity VARCHAR,
  description TEXT
) AS $$
DECLARE
  v_attendance_rate DECIMAL;
  v_pattern_type VARCHAR;
  v_category_id BIGINT;
  v_event_type VARCHAR;
  v_severity VARCHAR;
  v_description TEXT;
  v_event_id BIGINT;
BEGIN
  -- Get current attendance rate and pattern
  SELECT COALESCE(attendance_rate, 0), COALESCE(pattern_type, 'Unknown')
  INTO v_attendance_rate, v_pattern_type
  FROM attendance_patterns
  WHERE student_lrn = p_student_lrn
  LIMIT 1;

  -- If no pattern data yet, calculate it first
  IF v_pattern_type = 'Unknown' THEN
    RETURN;
  END IF;

  -- Determine severity and get category ID
  IF v_attendance_rate < 60 THEN
    v_severity := 'critical';
    v_event_type := 'Chronic Absent';
    v_description := 'Critical attendance crisis: ' || ROUND(v_attendance_rate::NUMERIC, 1) || '% attendance. Immediate intervention required.';
  ELSIF v_attendance_rate < 75 THEN
    v_severity := 'major';
    v_event_type := 'Sporadic Absent';
    v_description := 'High absence rate: ' || ROUND(v_attendance_rate::NUMERIC, 1) || '% attendance. Monitor closely.';
  ELSIF v_pattern_type = 'Monday Absent' THEN
    v_severity := 'minor';
    v_event_type := 'Monday Absent';
    v_description := 'Pattern detected: Student frequently absent on Mondays.';
  ELSIF v_pattern_type = 'Friday Absent' THEN
    v_severity := 'minor';
    v_event_type := 'Friday Absent';
    v_description := 'Pattern detected: Student frequently absent on Fridays.';
  ELSIF v_pattern_type = 'Late Arrival Trend' THEN
    v_severity := 'minor';
    v_event_type := 'Late Arrival Trend';
    v_description := 'Pattern detected: Student frequently arrives late.';
  ELSIF v_attendance_rate >= 95 THEN
    v_severity := 'positive';
    v_event_type := 'High Consistency';
    v_description := 'Excellent attendance: ' || ROUND(v_attendance_rate::NUMERIC, 1) || '% - Keep up the great work!';
  ELSE
    v_severity := 'positive';
    v_event_type := 'Average Attendance';
    v_description := 'Stable attendance: ' || ROUND(v_attendance_rate::NUMERIC, 1) || '%.';
  END IF;

  -- Get category ID
  SELECT id INTO v_category_id
  FROM event_categories
  WHERE name = v_event_type
  LIMIT 1;

  -- Delete old behavioral event for this student from today
  DELETE FROM behavioral_events
  WHERE student_lrn = p_student_lrn
  AND event_date = CURRENT_DATE
  AND event_type = v_event_type;

  -- Insert new behavioral event
  INSERT INTO behavioral_events (
    student_lrn, category_id, event_type, severity, description,
    location, reported_by, event_date, event_time, notes
  ) VALUES (
    p_student_lrn, v_category_id, v_event_type, v_severity, v_description,
    'School Campus', 'ML System', CURRENT_DATE, '08:00:00'::TIME,
    'Auto-generated from attendance pattern analysis. Pattern: ' || v_pattern_type
  )
  RETURNING id, event_type, severity, description
  INTO v_event_id, v_event_type, v_severity, v_description;

  RETURN QUERY SELECT v_event_id, v_event_type, v_severity, v_description;

END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- UPDATE ATTENDANCE PATTERNS BASED ON CURRENT ATTENDANCE
-- ============================================================================

CREATE OR REPLACE FUNCTION update_attendance_patterns(p_student_lrn VARCHAR)
RETURNS TABLE(
  student_lrn VARCHAR,
  pattern_type VARCHAR,
  pattern_confidence DECIMAL,
  attendance_rate DECIMAL,
  days_present INT,
  days_absent INT
) AS $$
DECLARE
  v_attendance_rate DECIMAL;
  v_days_present INT;
  v_school_days INT;
  v_days_absent INT;
  v_late_arrivals INT;
  v_on_time_count INT;
  v_pattern_type VARCHAR;
  v_pattern_confidence DECIMAL;
  v_monday_rate DECIMAL;
  v_friday_rate DECIMAL;
  v_late_percentage DECIMAL;
BEGIN
  -- Get current attendance metrics
  SELECT 
    COALESCE(attendance_rate, 0),
    COALESCE(days_present, 0),
    COALESCE(school_days, 0),
    COALESCE(late_arrivals, 0),
    COALESCE(on_time_count, 0)
  INTO v_attendance_rate, v_days_present, v_school_days, v_late_arrivals, v_on_time_count
  FROM calculate_student_attendance_metrics(p_student_lrn, 60)
  LIMIT 1;

  v_days_absent := v_school_days - v_days_present;
  v_late_percentage := CASE WHEN (v_late_arrivals + v_on_time_count) > 0 
    THEN (v_late_arrivals::DECIMAL / (v_late_arrivals + v_on_time_count)) * 100 
    ELSE 0 END;

  -- Calculate Monday/Friday absence rates
  SELECT COALESCE(
    (COUNT(*) FILTER (WHERE NOT EXISTS (
      SELECT 1 FROM attendance_logs al 
      WHERE al.student_lrn = p_student_lrn 
      AND al.date = DATE(d)
    ))::DECIMAL / NULLIF(COUNT(*), 0) * 100),
    0
  )
  INTO v_monday_rate
  FROM generate_series(
    CURRENT_DATE - INTERVAL '60 day',
    CURRENT_DATE,
    '1 day'::interval
  ) AS d
  WHERE EXTRACT(DOW FROM d) = 1;

  SELECT COALESCE(
    (COUNT(*) FILTER (WHERE NOT EXISTS (
      SELECT 1 FROM attendance_logs al 
      WHERE al.student_lrn = p_student_lrn 
      AND al.date = DATE(d)
    ))::DECIMAL / NULLIF(COUNT(*), 0) * 100),
    0
  )
  INTO v_friday_rate
  FROM generate_series(
    CURRENT_DATE - INTERVAL '60 day',
    CURRENT_DATE,
    '1 day'::interval
  ) AS d
  WHERE EXTRACT(DOW FROM d) = 5;

  -- Determine pattern type
  IF v_attendance_rate < 60 THEN
    v_pattern_type := 'Chronic Absent';
    v_pattern_confidence := LEAST((100 - v_attendance_rate) / 2, 99);
  ELSIF v_attendance_rate < 75 THEN
    v_pattern_type := 'Sporadic Absent';
    v_pattern_confidence := 75;
  ELSIF v_monday_rate > 45 THEN
    v_pattern_type := 'Monday Absent';
    v_pattern_confidence := v_monday_rate;
  ELSIF v_friday_rate > 45 THEN
    v_pattern_type := 'Friday Absent';
    v_pattern_confidence := v_friday_rate;
  ELSIF v_late_percentage > 50 THEN
    v_pattern_type := 'Late Arrival Trend';
    v_pattern_confidence := v_late_percentage;
  ELSIF v_attendance_rate >= 95 THEN
    v_pattern_type := 'High Consistency';
    v_pattern_confidence := v_attendance_rate;
  ELSE
    v_pattern_type := 'Average Attendance';
    v_pattern_confidence := 60;
  END IF;

  -- Update or insert attendance pattern record
  INSERT INTO attendance_patterns (
    student_lrn, pattern_type, pattern_confidence, attendance_rate,
    days_present, days_absent, total_school_days, late_arrival_frequency,
    last_updated
  ) VALUES (
    p_student_lrn, v_pattern_type, ROUND(v_pattern_confidence::NUMERIC, 2),
    ROUND(v_attendance_rate::NUMERIC, 2), v_days_present, v_days_absent,
    v_school_days, ROUND(v_late_percentage::NUMERIC, 2), NOW()
  )
  ON CONFLICT (student_lrn)
  DO UPDATE SET
    pattern_type = EXCLUDED.pattern_type,
    pattern_confidence = EXCLUDED.pattern_confidence,
    attendance_rate = EXCLUDED.attendance_rate,
    days_present = EXCLUDED.days_present,
    days_absent = EXCLUDED.days_absent,
    total_school_days = EXCLUDED.total_school_days,
    late_arrival_frequency = EXCLUDED.late_arrival_frequency,
    last_updated = NOW();

  RETURN QUERY SELECT
    p_student_lrn::VARCHAR,
    v_pattern_type::VARCHAR,
    ROUND(v_pattern_confidence::NUMERIC, 2)::DECIMAL,
    ROUND(v_attendance_rate::NUMERIC, 2)::DECIMAL,
    v_days_present::INT,
    v_days_absent::INT;

END;
$$ LANGUAGE plpgsql;

-- Initialize student attendance patterns and summaries
INSERT INTO attendance_patterns (
  student_lrn, pattern_type, pattern_confidence, attendance_rate,
  days_present, days_absent, total_school_days, late_arrival_frequency
)
SELECT DISTINCT s.lrn, 
  (SELECT pattern_type FROM analyze_and_predict_absence(s.lrn) LIMIT 1),
  (SELECT pattern_confidence FROM analyze_and_predict_absence(s.lrn) LIMIT 1),
  (SELECT COALESCE(attendance_rate, 0) FROM calculate_student_attendance_metrics(s.lrn, 60) LIMIT 1),
  (SELECT COALESCE(days_present, 0) FROM calculate_student_attendance_metrics(s.lrn, 60) LIMIT 1),
  (SELECT COALESCE(school_days, 0) - COALESCE(days_present, 0) FROM calculate_student_attendance_metrics(s.lrn, 60) LIMIT 1),
  (SELECT COALESCE(school_days, 0) FROM calculate_student_attendance_metrics(s.lrn, 60) LIMIT 1),
  (SELECT CASE WHEN (late_arrivals + on_time_count) > 0 THEN (late_arrivals::DECIMAL / (late_arrivals + on_time_count)) * 100 ELSE 0 END 
   FROM calculate_student_attendance_metrics(s.lrn, 60) LIMIT 1)
FROM students s
ON CONFLICT (student_lrn) DO NOTHING;

-- ============================================================================
-- GENERATE BEHAVIORAL EVENTS FROM PATTERNS
-- ============================================================================

-- Insert behavioral events based on detected patterns
INSERT INTO behavioral_events (
  student_lrn, category_id, event_type, severity, description,
  location, reported_by, event_date, event_time, notes
)
SELECT 
  s.lrn,
  ec.id,
  ap.pattern_type,
  ec.severity_level,
  ec.description,
  'School Campus',
  'Attendance System',
  CURRENT_DATE,
  '08:00:00'::TIME,
  'ML Pattern Analysis: ' || ap.pattern_type || ' (Confidence: ' || ROUND(ap.pattern_confidence::NUMERIC, 1) || '%)'
FROM students s
JOIN attendance_patterns ap ON s.lrn = ap.student_lrn
JOIN event_categories ec ON ap.pattern_type = ec.name
ON CONFLICT (student_lrn, event_date, event_time, event_type) DO NOTHING;

-- Update student summaries
SELECT update_student_summary(lrn) FROM students;