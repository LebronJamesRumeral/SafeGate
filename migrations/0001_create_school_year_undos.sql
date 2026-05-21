-- Migration: create table to store server-side undo payloads for school year advancement

CREATE TABLE IF NOT EXISTS school_year_undos (
  id serial PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  previous_school_year jsonb,
  previous_students jsonb,
  new_school_year_id integer,
  new_school_year_label text,
  is_active boolean DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_school_year_undos_expires_at ON school_year_undos (expires_at);
CREATE INDEX IF NOT EXISTS idx_school_year_undos_is_active ON school_year_undos (is_active);
