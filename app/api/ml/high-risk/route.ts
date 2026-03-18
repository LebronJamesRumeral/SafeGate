import { createClient } from '@supabase/supabase-js';
import { compileStudentIssues, applyRiskDowngrade } from '@/lib/ml-risk-calculator';

type RiskLevel = 'low' | 'medium' | 'high' | 'critical' | 'monitoring';

function deriveBehaviorStatus(riskLevel: RiskLevel, concerningEvents: number): 'stable' | 'watch' | 'concerning' | 'critical' {
  if (riskLevel === 'critical') return 'critical';
  if (riskLevel === 'high' || concerningEvents >= 3) return 'concerning';
  if (riskLevel === 'monitoring' || riskLevel === 'medium' || concerningEvents >= 1) return 'watch';
  return 'stable';
}

function buildAttendanceSignal(attendanceRate: number, attendanceComponent: number, latePercentage: number): string {
  if (attendanceComponent >= 30 || attendanceRate < 70) {
    return 'Attendance trend is amplifying behavior risk and needs intervention support.';
  }

  if (latePercentage >= 30 || attendanceComponent >= 15) {
    return 'Attendance friction is contributing to behavior concerns and should be monitored.';
  }

  return 'Attendance is currently a stable supporting signal.';
}

function riskPriority(riskLevel: RiskLevel): number {
  if (riskLevel === 'critical') return 5;
  if (riskLevel === 'high') return 4;
  if (riskLevel === 'medium') return 3;
  if (riskLevel === 'low') return 2;
  if (riskLevel === 'monitoring') return 1;
  return 0;
}

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

    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('lrn, name, parent_contact, parent_email')
      .eq('status', 'active');

    if (studentsError) {
      console.error('Supabase students query error:', studentsError);
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

    const studentList = students || [];

    const { data: summaries } = await supabase
      .from('student_attendance_summary')
      .select('student_lrn, next_likely_absent_date, next_absent_confidence')
      .in('student_lrn', studentList.map((s) => s.lrn));

    const summaryByLrn = new Map((summaries || []).map((row: any) => [row.student_lrn, row]));

    const calculated = await Promise.all(
      studentList.map(async (student: any) => {
        const { data: riskRows, error: riskError } = await supabase.rpc('calculate_student_risk_score', {
          p_student_lrn: student.lrn,
        });

        if (riskError || !riskRows || riskRows.length === 0) {
          return null;
        }

        const risk = riskRows[0];
        const breakdown = risk.breakdown || {};
        const concerningEvents = Number(breakdown.negative_events || 0);
        const positiveEvents = Number(breakdown.positive_events || 0);
        const attendanceRate = Number(breakdown.attendance_rate || 0);
        const latePercentage = Number(breakdown.late_percentage || 0);
        let level = String(risk.risk_level || 'low') as RiskLevel;
        
        // Apply risk downgrade logic based on positive events and attendance stability
        level = applyRiskDowngrade(level, {
          attendance_rate: attendanceRate,
          negative_events: concerningEvents,
          positive_events: positiveEvents,
          late_percentage: latePercentage,
        });
        
        const behaviorStatus = deriveBehaviorStatus(level, concerningEvents);
        const attendanceSignal = buildAttendanceSignal(attendanceRate, Number(risk.attendance_component || 0), latePercentage);
        const summary = summaryByLrn.get(student.lrn);

        // Compile multiple issues into a single comprehensive term
        const issueCompilation = await compileStudentIssues(student.lrn);
        const patternType = issueCompilation.compiledIssue;

        return {
          lrn: student.lrn,
          name: student.name || 'Unknown',
          parentContact: student.parent_contact || 'N/A',
          parentEmail: student.parent_email || null,
          riskLevel: level,
          behaviorStatus,
          concerningEvents,
          positiveEvents,
          patternType,
          attendanceSignal,
          nextAbsentDate: summary?.next_likely_absent_date || null,
          predictionConfidence: Number(summary?.next_absent_confidence || 0),
        };
      })
    );

    const highRiskStudents = calculated
      .filter((student): student is NonNullable<typeof student> => Boolean(student))
      .filter(
        (student) =>
          student.riskLevel !== 'low' && student.riskLevel !== 'monitoring' ||
          student.concerningEvents > 0 ||
          student.patternType !== 'No Issues Detected'
      )
      .sort((a, b) => {
        const riskDiff = riskPriority(b.riskLevel) - riskPriority(a.riskLevel);
        if (riskDiff !== 0) return riskDiff;
        return b.concerningEvents - a.concerningEvents;
      });

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
