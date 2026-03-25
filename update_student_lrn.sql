-- Function: update_student_lrn
-- Updates a student's LRN everywhere it is referenced, in a single transaction
CREATE OR REPLACE FUNCTION update_student_lrn(old_lrn VARCHAR, new_lrn VARCHAR, student_id BIGINT)
RETURNS void AS $$
BEGIN
  -- Update students table
  UPDATE students SET lrn = new_lrn WHERE id = student_id;

  -- Update all referencing tables
  UPDATE student_schedules SET student_lrn = new_lrn WHERE student_lrn = old_lrn;
  UPDATE student_attendance_schedules SET student_lrn = new_lrn WHERE student_lrn = old_lrn;
  UPDATE attendance_logs SET student_lrn = new_lrn WHERE student_lrn = old_lrn;
  -- Add more tables if needed
END;
$$ LANGUAGE plpgsql;

-- Usage example (in Supabase JS):
-- await supabase.rpc('update_student_lrn', { old_lrn: 'OLD', new_lrn: 'NEW', student_id: 123 });
