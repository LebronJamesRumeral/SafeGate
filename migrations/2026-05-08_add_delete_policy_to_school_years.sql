-- =========================
-- Migration: Add DELETE policy to school_years table
-- Date: 2026-05-08
-- Purpose: Enable deletion of school year records and fix RLS policies
-- =========================

-- Add missing DELETE policy for school_years RLS
CREATE POLICY "Enable delete for all on school years" ON school_years FOR DELETE USING (true);

-- Verify the policy was created
-- SELECT * FROM pg_policies WHERE tablename = 'school_years' AND policyname LIKE '%delete%';
