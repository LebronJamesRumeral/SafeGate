-- Migration: Add is_special_case flag to students
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_special_case BOOLEAN DEFAULT false;
-- Ensure no nulls after migration
UPDATE students SET is_special_case = false WHERE is_special_case IS NULL;
CREATE INDEX IF NOT EXISTS idx_students_is_special_case ON students(is_special_case);
