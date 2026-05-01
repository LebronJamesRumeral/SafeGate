-- Migration: Add optional parent2 columns to students table
-- Adds parent2_name and parent2_contact as nullable columns for optional secondary parent data

ALTER TABLE IF EXISTS students
  ADD COLUMN IF NOT EXISTS parent2_name VARCHAR(255);

ALTER TABLE IF EXISTS students
  ADD COLUMN IF NOT EXISTS parent2_contact VARCHAR(50);

-- No foreign key or parent account creation for parent2; this is data-only and optional.
