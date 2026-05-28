-- Migration: Add ON UPDATE CASCADE to foreign keys referencing students(lrn)
-- Date: 2026-05-27

BEGIN;

-- student_schedules
ALTER TABLE student_schedules
  DROP CONSTRAINT IF EXISTS student_schedules_student_lrn_fkey;
ALTER TABLE student_schedules
  ADD CONSTRAINT student_schedules_student_lrn_fkey
  FOREIGN KEY (student_lrn)
  REFERENCES students(lrn)
  ON UPDATE CASCADE
  ON DELETE CASCADE;

-- attendance_logs
ALTER TABLE attendance_logs
  DROP CONSTRAINT IF EXISTS attendance_logs_student_lrn_fkey;
ALTER TABLE attendance_logs
  ADD CONSTRAINT attendance_logs_student_lrn_fkey
  FOREIGN KEY (student_lrn)
  REFERENCES students(lrn)
  ON UPDATE CASCADE
  ON DELETE CASCADE;

-- parent_attendance_notes
ALTER TABLE parent_attendance_notes
  DROP CONSTRAINT IF EXISTS parent_attendance_notes_student_lrn_fkey;
ALTER TABLE parent_attendance_notes
  ADD CONSTRAINT parent_attendance_notes_student_lrn_fkey
  FOREIGN KEY (student_lrn)
  REFERENCES students(lrn)
  ON UPDATE CASCADE
  ON DELETE CASCADE;

-- student_attendance_schedules
ALTER TABLE student_attendance_schedules
  DROP CONSTRAINT IF EXISTS student_attendance_schedules_student_lrn_fkey;
ALTER TABLE student_attendance_schedules
  ADD CONSTRAINT student_attendance_schedules_student_lrn_fkey
  FOREIGN KEY (student_lrn)
  REFERENCES students(lrn)
  ON UPDATE CASCADE
  ON DELETE CASCADE;

-- summer_enrollments
ALTER TABLE summer_enrollments
  DROP CONSTRAINT IF EXISTS summer_enrollments_student_lrn_fkey;
ALTER TABLE summer_enrollments
  ADD CONSTRAINT summer_enrollments_student_lrn_fkey
  FOREIGN KEY (student_lrn)
  REFERENCES students(lrn)
  ON UPDATE CASCADE
  ON DELETE CASCADE;

-- attendance_patterns
ALTER TABLE attendance_patterns
  DROP CONSTRAINT IF EXISTS attendance_patterns_student_lrn_fkey;
ALTER TABLE attendance_patterns
  ADD CONSTRAINT attendance_patterns_student_lrn_fkey
  FOREIGN KEY (student_lrn)
  REFERENCES students(lrn)
  ON UPDATE CASCADE
  ON DELETE CASCADE;

-- absence_predictions
ALTER TABLE absence_predictions
  DROP CONSTRAINT IF EXISTS absence_predictions_student_lrn_fkey;
ALTER TABLE absence_predictions
  ADD CONSTRAINT absence_predictions_student_lrn_fkey
  FOREIGN KEY (student_lrn)
  REFERENCES students(lrn)
  ON UPDATE CASCADE
  ON DELETE CASCADE;

-- student_attendance_summary
ALTER TABLE student_attendance_summary
  DROP CONSTRAINT IF EXISTS student_attendance_summary_student_lrn_fkey;
ALTER TABLE student_attendance_summary
  ADD CONSTRAINT student_attendance_summary_student_lrn_fkey
  FOREIGN KEY (student_lrn)
  REFERENCES students(lrn)
  ON UPDATE CASCADE
  ON DELETE CASCADE;

-- behavioral_events
ALTER TABLE behavioral_events
  DROP CONSTRAINT IF EXISTS behavioral_events_student_lrn_fkey;
ALTER TABLE behavioral_events
  ADD CONSTRAINT behavioral_events_student_lrn_fkey
  FOREIGN KEY (student_lrn)
  REFERENCES students(lrn)
  ON UPDATE CASCADE
  ON DELETE CASCADE;

COMMIT;
