-- Add Early Out support for attendance check-out
ALTER TABLE attendance_logs
  ADD COLUMN IF NOT EXISTS is_early_out BOOLEAN DEFAULT false;

ALTER TABLE attendance_logs
  ADD COLUMN IF NOT EXISTS early_out_reason TEXT;
