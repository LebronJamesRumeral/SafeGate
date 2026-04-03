-- =========================
-- Safe Gate PWA - Clean Database Schema
-- Pure migrations without mock data
-- =========================

-- Function: update_student_lrn
-- Updates a student's LRN everywhere it is referenced, in a single transaction
CREATE OR REPLACE FUNCTION update_student_lrn(old_lrn VARCHAR, new_lrn VARCHAR, student_id BIGINT)
RETURNS void AS $$
BEGIN
  -- Only update the students table; ON UPDATE CASCADE will update all referencing tables
  UPDATE students SET lrn = new_lrn WHERE id = student_id AND lrn = old_lrn;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DROP EXISTING TABLES (fresh start)
-- ============================================================================
DROP TABLE IF EXISTS student_behavioral_summary CASCADE;
DROP TABLE IF EXISTS role_notifications CASCADE;
DROP TABLE IF EXISTS parent_notifications CASCADE;
DROP TABLE IF EXISTS interventions CASCADE;
DROP TABLE IF EXISTS behavioral_patterns CASCADE;
DROP TABLE IF EXISTS behavioral_events CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS event_categories CASCADE;
DROP TABLE IF EXISTS student_attendance_summary CASCADE;
DROP TABLE IF EXISTS absence_predictions CASCADE;
DROP TABLE IF EXISTS attendance_patterns CASCADE;
DROP TABLE IF EXISTS parent_attendance_notes CASCADE;
DROP TABLE IF EXISTS attendance_logs CASCADE;
DROP TABLE IF EXISTS student_schedules CASCADE;
DROP TABLE IF EXISTS student_attendance_schedules CASCADE;
DROP TABLE IF EXISTS school_years CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS heatmap_zones CASCADE;
DROP TABLE IF EXISTS parents CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ============================================================================
-- CORE TABLES: PROFILES, PARENTS, STUDENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create parents table for validated parent accounts
CREATE TABLE IF NOT EXISTS parents (
  id BIGSERIAL PRIMARY KEY,
  parent_email VARCHAR(255) UNIQUE NOT NULL,
  full_name TEXT,
  contact VARCHAR(50),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS students (
  id BIGSERIAL PRIMARY KEY,
  lrn VARCHAR(50) UNIQUE,
  rfid_uid VARCHAR(32) UNIQUE,
  name VARCHAR(255) NOT NULL,
  gender VARCHAR(20) NOT NULL,
  birthday DATE NOT NULL,
  address TEXT,
  level VARCHAR(50) NOT NULL,
  parent_name VARCHAR(255),
  parent_contact VARCHAR(50),
  parent_email VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active',
  substatus VARCHAR(32),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_parent_email FOREIGN KEY (parent_email) REFERENCES parents(parent_email) ON DELETE SET NULL
);

-- Backward-compatible migration for existing databases
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_email VARCHAR(255);
ALTER TABLE students ADD COLUMN IF NOT EXISTS rfid_uid VARCHAR(32);
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_rfid_uid_unique ON students(rfid_uid) WHERE rfid_uid IS NOT NULL;

-- ============================================================================
-- ATTENDANCE TABLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS attendance_logs (
  id BIGSERIAL PRIMARY KEY,
  student_lrn VARCHAR(50) NOT NULL REFERENCES students(lrn) ON DELETE CASCADE,
  check_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
  check_out_time TIMESTAMP WITH TIME ZONE,
  date DATE NOT NULL,
  is_present BOOLEAN DEFAULT true,
  attendance_status VARCHAR(30) DEFAULT 'present',
  is_late BOOLEAN DEFAULT false,
  is_invalid_timeout BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_lrn, date)
);

-- Parent-attached notes on attendance logs
CREATE TABLE IF NOT EXISTS parent_attendance_notes (
  id BIGSERIAL PRIMARY KEY,
  attendance_log_id BIGINT NOT NULL REFERENCES attendance_logs(id) ON DELETE CASCADE,
  student_lrn VARCHAR(50) NOT NULL REFERENCES students(lrn) ON DELETE CASCADE,
  parent_email VARCHAR(255) NOT NULL REFERENCES parents(parent_email) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(attendance_log_id, parent_email)
);

-- School years for enrollment and advancement tracking
CREATE TABLE IF NOT EXISTS school_years (
  id BIGSERIAL PRIMARY KEY,
  label VARCHAR(20) UNIQUE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT school_year_dates_valid CHECK (start_date <= end_date)
);

-- Student attendance schedules (entry/exit times and school days by year level)
CREATE TABLE IF NOT EXISTS student_attendance_schedules (
  id BIGSERIAL PRIMARY KEY,
  student_lrn VARCHAR(50) NOT NULL REFERENCES students(lrn) ON DELETE CASCADE,
  school_year_id BIGINT REFERENCES school_years(id) ON DELETE SET NULL,
  year_level VARCHAR(50) NOT NULL,
  entry_time TIME NOT NULL,
  exit_time TIME NOT NULL,
  school_days JSONB DEFAULT '{"monday": true, "tuesday": true, "wednesday": true, "thursday": true, "friday": true, "saturday": false, "sunday": false}',
  grace_period_minutes SMALLINT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT entry_exit_time_valid CHECK (entry_time < exit_time),
  CONSTRAINT unique_student_schedule UNIQUE (student_lrn, school_year_id)
);

-- Weekly schedule per student (class/subject schedule)
CREATE TABLE IF NOT EXISTS student_schedules (
  id BIGSERIAL PRIMARY KEY,
  student_lrn VARCHAR(50) NOT NULL,
  school_year_id BIGINT REFERENCES school_years(id) ON DELETE SET NULL,
  day_of_week VARCHAR(12) NOT NULL,
  day_number SMALLINT NOT NULL,
  subject VARCHAR(120) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room VARCHAR(80),
  teacher_name VARCHAR(120),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT student_schedule_time_valid CHECK (start_time < end_time),
  CONSTRAINT student_schedule_day_valid CHECK (day_number BETWEEN 1 AND 7),
  CONSTRAINT student_schedule_unique UNIQUE (student_lrn, day_number, start_time, end_time, subject)
);

-- Add foreign key constraint for ON UPDATE CASCADE after table creation
ALTER TABLE student_schedules
  DROP CONSTRAINT IF EXISTS student_schedules_student_lrn_fkey;
ALTER TABLE student_schedules
  ADD CONSTRAINT student_schedules_student_lrn_fkey
  FOREIGN KEY (student_lrn)
  REFERENCES students(lrn)
  ON UPDATE CASCADE
  ON DELETE CASCADE;

-- ============================================================================
-- DATABASE INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_students_lrn ON students(lrn);
CREATE INDEX IF NOT EXISTS idx_students_level ON students(level);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_attendance_student_lrn ON attendance_logs(student_lrn);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_logs(date);
CREATE INDEX IF NOT EXISTS idx_attendance_is_present ON attendance_logs(is_present);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_logs(attendance_status);
CREATE INDEX IF NOT EXISTS idx_parent_attendance_notes_log_id ON parent_attendance_notes(attendance_log_id);
CREATE INDEX IF NOT EXISTS idx_parent_attendance_notes_student_lrn ON parent_attendance_notes(student_lrn);
CREATE INDEX IF NOT EXISTS idx_parent_attendance_notes_parent_email ON parent_attendance_notes(parent_email);
CREATE INDEX IF NOT EXISTS idx_attendance_schedules_lrn ON student_attendance_schedules(student_lrn);
CREATE INDEX IF NOT EXISTS idx_attendance_schedules_active ON student_attendance_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_attendance_schedules_year_level ON student_attendance_schedules(year_level);
CREATE INDEX IF NOT EXISTS idx_school_years_current ON school_years(is_current);
CREATE INDEX IF NOT EXISTS idx_student_schedules_lrn ON student_schedules(student_lrn);
CREATE INDEX IF NOT EXISTS idx_student_schedules_day_time ON student_schedules(day_number, start_time);
CREATE INDEX IF NOT EXISTS idx_student_schedules_active ON student_schedules(is_active);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) FOR SCHEDULE TABLES
-- ============================================================================
ALTER TABLE school_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_attendance_schedules ENABLE ROW LEVEL SECURITY;

-- Public access policies for schedule tables
CREATE POLICY "Enable read for all on school years" ON school_years FOR SELECT USING (true);
CREATE POLICY "Enable insert for all on school years" ON school_years FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all on school years" ON school_years FOR UPDATE USING (true);
CREATE POLICY "Enable read for all on student schedules" ON student_schedules FOR SELECT USING (true);
CREATE POLICY "Enable insert for all on student schedules" ON student_schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all on student schedules" ON student_schedules FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all on student schedules" ON student_schedules FOR DELETE USING (true);
CREATE POLICY "Enable read for all on student attendance schedules" ON student_attendance_schedules FOR SELECT USING (true);
CREATE POLICY "Enable insert for all on student attendance schedules" ON student_attendance_schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all on student attendance schedules" ON student_attendance_schedules FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all on student attendance schedules" ON student_attendance_schedules FOR DELETE USING (true);

-- ============================================================================
-- HEATMAP ZONES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS heatmap_zones (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  top FLOAT NOT NULL,
  "left" FLOAT NOT NULL,
  width FLOAT NOT NULL,
  height FLOAT NOT NULL,
  keywords TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS and public access policies for heatmap_zones
ALTER TABLE heatmap_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read for all on heatmap_zones" ON heatmap_zones FOR SELECT USING (true);
CREATE POLICY "Enable insert for all on heatmap_zones" ON heatmap_zones FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all on heatmap_zones" ON heatmap_zones FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all on heatmap_zones" ON heatmap_zones FOR DELETE USING (true);

-- ============================================================================
-- ML CORE: ATTENDANCE PATTERNS & PREDICTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS attendance_patterns (
  id BIGSERIAL PRIMARY KEY,
  student_lrn VARCHAR(50) UNIQUE NOT NULL REFERENCES students(lrn) ON DELETE CASCADE,
  pattern_type VARCHAR(100),
  pattern_confidence DECIMAL(5,2),
  attendance_rate DECIMAL(5,2),
  days_present INT,
  days_absent INT,
  total_school_days INT,
  avg_check_in_minute INT,
  late_arrivals_count INT,
  late_arrival_frequency DECIMAL(5,2),
  monday_absent_rate DECIMAL(5,2),
  friday_absent_rate DECIMAL(5,2),
  weekend_correlation BOOLEAN,
  absence_trend VARCHAR(20),
  critical_threshold_days INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ML predictions: When will student be absent?
CREATE TABLE IF NOT EXISTS absence_predictions (
  id BIGSERIAL PRIMARY KEY,
  student_lrn VARCHAR(50) NOT NULL REFERENCES students(lrn) ON DELETE CASCADE,
  predicted_absent_date DATE NOT NULL,
  prediction_type VARCHAR(50),
  confidence_score DECIMAL(5,2),
  risk_factors JSONB,
  model_version VARCHAR(20) DEFAULT '1.0',
  training_data_size INT,
  prediction_made_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actual_present BOOLEAN,
  verified_at TIMESTAMP WITH TIME ZONE,
  model_accuracy_impact DECIMAL(5,2),
  UNIQUE(student_lrn, predicted_absent_date)
);

-- Student attendance summary (aggregated, updated daily)
CREATE TABLE IF NOT EXISTS student_attendance_summary (
  id BIGSERIAL PRIMARY KEY,
  student_lrn VARCHAR(50) UNIQUE NOT NULL REFERENCES students(lrn) ON DELETE CASCADE,
  current_attendance_rate DECIMAL(5,2),
  attendance_trend VARCHAR(20),
  risk_level VARCHAR(20),
  total_days_present INT DEFAULT 0,
  total_days_absent INT DEFAULT 0,
  total_days_late INT DEFAULT 0,
  recent_attendance_rate DECIMAL(5,2),
  recent_absent_count INT,
  next_likely_absent_date DATE,
  next_absent_confidence DECIMAL(5,2),
  days_until_critical_threshold INT,
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
  guidance_status VARCHAR(30) DEFAULT 'pending_guidance',
  guidance_reviewed_by VARCHAR(255),
  guidance_reviewed_at TIMESTAMP WITH TIME ZONE,
  guidance_intervention_notes TEXT,
  action_taken TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_lrn, event_date, event_time, event_type)
);

-- Positive achievements and recognitions
CREATE TABLE IF NOT EXISTS achievements (
  id BIGSERIAL PRIMARY KEY,
  student_lrn VARCHAR(50) NOT NULL REFERENCES students(lrn) ON DELETE CASCADE,
  category_type VARCHAR(50) DEFAULT 'Achievements' NOT NULL,
  achievement_type VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  notes TEXT,
  reported_by VARCHAR(255) NOT NULL,
  achievement_date DATE NOT NULL,
  achievement_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indices for behavioral events
CREATE INDEX IF NOT EXISTS idx_behavioral_events_student ON behavioral_events(student_lrn);
CREATE INDEX IF NOT EXISTS idx_behavioral_events_date ON behavioral_events(event_date);
CREATE INDEX IF NOT EXISTS idx_behavioral_events_severity ON behavioral_events(severity);
CREATE INDEX IF NOT EXISTS idx_behavioral_events_category ON behavioral_events(category_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_events_guidance_status ON behavioral_events(guidance_status);
CREATE INDEX IF NOT EXISTS idx_achievements_student ON achievements(student_lrn);
CREATE INDEX IF NOT EXISTS idx_achievements_date ON achievements(achievement_date);
CREATE INDEX IF NOT EXISTS idx_achievements_type ON achievements(achievement_type);

-- ============================================================================
-- ROLE-BASED NOTIFICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS role_notifications (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  target_roles TEXT[] NOT NULL,
  read_by_roles TEXT[] NOT NULL DEFAULT '{}',
  created_by VARCHAR(255),
  related_event_id BIGINT REFERENCES behavioral_events(id) ON DELETE SET NULL,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_role_notifications_created_at ON role_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_role_notifications_target_roles ON role_notifications USING GIN(target_roles);
CREATE INDEX IF NOT EXISTS idx_role_notifications_read_by_roles ON role_notifications USING GIN(read_by_roles);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) FOR BEHAVIORAL TABLES
-- ============================================================================
ALTER TABLE event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE absence_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_attendance_summary ENABLE ROW LEVEL SECURITY;

-- Set up public access policies
CREATE POLICY "Enable read for all on event categories" ON event_categories FOR SELECT USING (true);
CREATE POLICY "Enable insert for all on event categories" ON event_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable read for all on behavioral events" ON behavioral_events FOR SELECT USING (true);
CREATE POLICY "Enable insert for all on behavioral_events" ON behavioral_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all on behavioral events" ON behavioral_events FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all on behavioral events" ON behavioral_events FOR DELETE USING (true);
CREATE POLICY "Enable read for all on achievements" ON achievements FOR SELECT USING (true);
CREATE POLICY "Enable insert for all on achievements" ON achievements FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all on achievements" ON achievements FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all on achievements" ON achievements FOR DELETE USING (true);
CREATE POLICY "Enable read for all on role notifications" ON role_notifications FOR SELECT USING (true);
CREATE POLICY "Enable insert for all on role notifications" ON role_notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all on role notifications" ON role_notifications FOR UPDATE USING (true);
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
-- ML PREDICTION FUNCTIONS
-- ============================================================================
DROP FUNCTION IF EXISTS calculate_student_attendance_metrics(VARCHAR, INT) CASCADE;
DROP FUNCTION IF EXISTS analyze_and_predict_absence(VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS store_absence_prediction(VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS update_student_summary(VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS calculate_student_risk_score(VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS generate_behavioral_events_from_patterns(VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS update_attendance_patterns(VARCHAR) CASCADE;

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
  observed_school_days AS (
    SELECT COUNT(DISTINCT al.date) AS total_school_days
    FROM attendance_logs al
    WHERE al.date >= (SELECT start_date FROM date_range)
      AND al.date <= (SELECT end_date FROM date_range)
      AND EXTRACT(DOW FROM al.date) BETWEEN 1 AND 5
  ),
  generated_school_days AS (
    SELECT COUNT(DISTINCT DATE(d)) as total_school_days
    FROM generate_series(
      (SELECT start_date FROM date_range),
      (SELECT end_date FROM date_range),
      '1 day'::interval
    ) AS d
    WHERE EXTRACT(DOW FROM d) BETWEEN 1 AND 5
  ),
  school_days_calc AS (
    SELECT CASE
      WHEN (SELECT total_school_days FROM observed_school_days) > 0
        THEN (SELECT total_school_days FROM observed_school_days)
      ELSE (SELECT total_school_days FROM generated_school_days)
    END AS total_school_days
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
      AND al.date = om.date
    ))::DECIMAL / NULLIF(COUNT(*), 0) * 100),
    0
  )
  INTO v_monday_rate
  FROM (
    SELECT DISTINCT date
    FROM attendance_logs
    WHERE date >= CURRENT_DATE - INTERVAL '60 day'
      AND date <= CURRENT_DATE
      AND EXTRACT(DOW FROM date) = 1
  ) om;

  SELECT COALESCE(
    (COUNT(*) FILTER (WHERE NOT EXISTS (
      SELECT 1 FROM attendance_logs al
      WHERE al.student_lrn = p_student_lrn
      AND al.date = ofr.date
    ))::DECIMAL / NULLIF(COUNT(*), 0) * 100),
    0
  )
  INTO v_friday_rate
  FROM (
    SELECT DISTINCT date
    FROM attendance_logs
    WHERE date >= CURRENT_DATE - INTERVAL '60 day'
      AND date <= CURRENT_DATE
      AND EXTRACT(DOW FROM date) = 5
  ) ofr;

  -- Pattern Detection Logic
  IF v_attendance_rate < 60 THEN
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
    v_pattern_type := 'Monday Absent';
    v_pattern_confidence := v_monday_rate;
    v_risk_factors := 'Strong Monday absence pattern (' || ROUND(v_monday_rate::NUMERIC, 1) || '% of Mondays absent). ';
    v_next_absent_date := CURRENT_DATE + INTERVAL '1 day' * (CASE WHEN EXTRACT(DOW FROM CURRENT_DATE) = 1 THEN 7 
                                                               WHEN EXTRACT(DOW FROM CURRENT_DATE) <= 1 THEN 1 - EXTRACT(DOW FROM CURRENT_DATE)
                                                               ELSE 8 - EXTRACT(DOW FROM CURRENT_DATE) END);
    v_prediction_confidence := LEAST(v_monday_rate, 95);
    v_recommendation := 'Student frequently absent on Mondays. Proactive parent contact on Sunday recommended.';
  ELSIF v_friday_rate > 45 THEN
    v_pattern_type := 'Friday Absent';
    v_pattern_confidence := v_friday_rate;
    v_risk_factors := 'Strong Friday absence pattern (' || ROUND(v_friday_rate::NUMERIC, 1) || '% of Fridays absent). ';
    v_next_absent_date := CURRENT_DATE + INTERVAL '1 day' * (CASE WHEN EXTRACT(DOW FROM CURRENT_DATE) = 5 THEN 7
                                                               WHEN EXTRACT(DOW FROM CURRENT_DATE) < 5 THEN 5 - EXTRACT(DOW FROM CURRENT_DATE)
                                                               ELSE 12 - EXTRACT(DOW FROM CURRENT_DATE) END);
    v_prediction_confidence := LEAST(v_friday_rate, 95);
    v_recommendation := 'Student frequently absent on Fridays. Teacher monitoring and parent contact recommended.';
  ELSIF v_late_percentage > 50 THEN
    v_pattern_type := 'Late Arrival Trend';
    v_pattern_confidence := v_late_percentage;
    v_risk_factors := 'Chronic lateness (' || ROUND(v_late_percentage::NUMERIC, 1) || '% of days). High risk for escalation to absence. ';
    v_next_absent_date := CURRENT_DATE + INTERVAL '2 days';
    v_prediction_confidence := 65;
    v_recommendation := 'Pattern of lateness may escalate to absence. Early intervention needed.';
  ELSIF v_attendance_rate >= 95 THEN
    v_pattern_type := 'High Consistency';
    v_pattern_confidence := v_attendance_rate;
    v_risk_factors := 'Excellent attendance record. ';
    v_next_absent_date := NULL;
    v_prediction_confidence := 95;
    v_recommendation := 'Student has excellent attendance. Monitor for any pattern changes.';
  ELSE
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


    RETURN QUERY SELECT
      v_prediction_id,
      p_student_lrn,
      v_next_absent_date,
      v_pattern_type,
      ROUND(v_prediction_confidence::NUMERIC, 2);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Update student summary function
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

  -- Upsert summary

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

-- Calculate risk score function
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

-- Generate behavioral events from patterns
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

  -- If no pattern data yet, return
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


  RETURN QUERY SELECT v_event_id, v_event_type, v_severity, v_description;
END;
$$ LANGUAGE plpgsql;

-- Update attendance patterns function
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
      AND al.date = om.date
    ))::DECIMAL / NULLIF(COUNT(*), 0) * 100),
    0
  )
  INTO v_monday_rate
  FROM (
    SELECT DISTINCT date
    FROM attendance_logs
    WHERE date >= CURRENT_DATE - INTERVAL '60 day'
      AND date <= CURRENT_DATE
      AND EXTRACT(DOW FROM date) = 1
  ) om;

  SELECT COALESCE(
    (COUNT(*) FILTER (WHERE NOT EXISTS (
      SELECT 1 FROM attendance_logs al
      WHERE al.student_lrn = p_student_lrn
      AND al.date = ofr.date
    ))::DECIMAL / NULLIF(COUNT(*), 0) * 100),
    0
  )
  INTO v_friday_rate
  FROM (
    SELECT DISTINCT date
    FROM attendance_logs
    WHERE date >= CURRENT_DATE - INTERVAL '60 day'
      AND date <= CURRENT_DATE
      AND EXTRACT(DOW FROM date) = 5
  ) ofr;

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

  RETURN QUERY SELECT
    p_student_lrn::VARCHAR,
    v_pattern_type::VARCHAR,
    ROUND(v_pattern_confidence::NUMERIC, 2)::DECIMAL,
    ROUND(v_attendance_rate::NUMERIC, 2)::DECIMAL,
    v_days_present::INT,
    v_days_absent::INT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- END OF CLEAN MIGRATION SCHEMA
-- ============================================================================
-- This file contains:
-- âœ… All CREATE TABLE statements
-- âœ… All CREATE INDEX statements
-- âœ… All CREATE FUNCTION statements
-- âœ… All ALTER TABLE constraints
-- âœ… All ROW LEVEL SECURITY (RLS) policies
-- âŒ NO INSERT statements
-- âŒ NO mock data
-- Use this file for fresh database setup without test data
-- ============================================================================
