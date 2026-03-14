import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('Missing Supabase credentials');
      return Response.json(
        {
          success: true,
          data: [],
          count: 0,
          message: 'Database not yet initialized',
        },
        { status: 200 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('student_attendance_summary')
      .select(`
        student_lrn,
        current_attendance_rate,
        risk_level,
        next_likely_absent_date,
        next_absent_confidence,
        students(name, parent_contact, parent_email)
      `)
      .in('risk_level', ['high', 'critical'])
      .order('current_attendance_rate', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      return Response.json(
        {
          success: true,
          data: [],
          count: 0,
          message: 'No high-risk students found',
        },
        { status: 200 }
      );
    }

    const highRiskStudents = (data || []).map((student: any) => ({
      lrn: student.student_lrn,
      name: student.students?.name || 'Unknown',
      parentContact: student.students?.parent_contact || 'N/A',
      parentEmail: student.students?.parent_email || null,
      attendanceRate: student.current_attendance_rate,
      riskLevel: student.risk_level,
      nextAbsentDate: student.next_likely_absent_date,
      predictionConfidence: student.next_absent_confidence,
    }));

    return Response.json({
      success: true,
      data: highRiskStudents,
      count: highRiskStudents.length,
    });
  } catch (error) {
    console.error('API Error:', error);
    return Response.json(
      {
        success: true,
        data: [],
        count: 0,
        message: 'Database connection error',
      },
      { status: 200 }
    );
  }
}
