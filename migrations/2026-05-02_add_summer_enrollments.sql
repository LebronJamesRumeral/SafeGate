-- =========================
-- Migration: Add Summer Enrollments Table
-- Date: May 2, 2026
-- Purpose: Enable summer class enrollment tracking for students attending during summer break
-- =========================

-- Create summer_enrollments table for tracking students enrolled in summer classes
CREATE TABLE IF NOT EXISTS summer_enrollments (
  id BIGSERIAL PRIMARY KEY,
  student_lrn VARCHAR(50) UNIQUE NOT NULL REFERENCES students(lrn) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT summer_dates_valid CHECK (start_date <= end_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_summer_enrollments_lrn ON summer_enrollments(student_lrn);
CREATE INDEX IF NOT EXISTS idx_summer_enrollments_dates ON summer_enrollments(start_date, end_date);

-- Enable Row Level Security
ALTER TABLE summer_enrollments ENABLE ROW LEVEL SECURITY;

-- Set up public access policies for summer_enrollments
CREATE POLICY "Enable read for all on summer enrollments" ON summer_enrollments FOR SELECT USING (true);
CREATE POLICY "Enable insert for all on summer enrollments" ON summer_enrollments FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all on summer enrollments" ON summer_enrollments FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all on summer enrollments" ON summer_enrollments FOR DELETE USING (true);

-- =========================
-- Migration Complete
-- =========================
-- The summer_enrollments table is now ready to track:
-- - student_lrn: Links to students table (unique per student)
-- - start_date: When the summer class period begins
-- - end_date: When the summer class period ends
-- - Timestamps for audit trail
--
-- Attendance logic will use this table to:
-- 1. Check if a student is enrolled in summer when the date is after school year end
-- 2. Only track attendance for students within their summer enrollment period
-- 3. Mark students out_of_session if they're outside both school year and summer dates
-- =========================
