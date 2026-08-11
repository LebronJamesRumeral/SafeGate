-- Recalculate risk scores for all active students
-- Run this after applying the migration to update all student risk levels

-- Step 1: Call update_student_summary for all active students
WITH active_students AS (
  SELECT lrn
  FROM students
  WHERE status = 'active'
)
SELECT update_student_summary(lrn)
FROM active_students;

-- Step 2: Update the students table with the latest risk levels from student_attendance_summary
UPDATE students s
SET risk_level = sas.risk_level, updated_at = NOW()
FROM student_attendance_summary sas
WHERE s.lrn = sas.student_lrn
  AND s.status = 'active';

-- Step 3: Verify the distribution
SELECT 
  risk_level,
  COUNT(*) as student_count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM students WHERE status = 'active'), 1) as percentage
FROM students
WHERE status = 'active'
GROUP BY risk_level
ORDER BY CASE 
  WHEN risk_level = 'critical' THEN 1
  WHEN risk_level = 'high' THEN 2
  WHEN risk_level = 'medium' THEN 3
  WHEN risk_level = 'low' THEN 4
  ELSE 5
END;
