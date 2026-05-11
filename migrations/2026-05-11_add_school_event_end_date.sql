ALTER TABLE school_events
  ADD COLUMN IF NOT EXISTS end_date DATE;

-- Backfill existing records so historical single-date events behave as one-day ranges.
UPDATE school_events
SET end_date = event_date
WHERE end_date IS NULL;

ALTER TABLE school_events
  DROP CONSTRAINT IF EXISTS school_event_dates_valid;

ALTER TABLE school_events
  ADD CONSTRAINT school_event_dates_valid CHECK (end_date IS NULL OR end_date >= event_date);

CREATE INDEX IF NOT EXISTS idx_school_events_end_date ON school_events(end_date);