/**
 * Student Summary API Route
 * Returns behavior-focused ML summary with attendance as a supporting signal
 * Compiles multiple issues into single comprehensive term
 */

import { createClient } from '@supabase/supabase-js';
import { applyRiskDowngrade, compileStudentIssues } from '@/lib/ml-risk-calculator';

type RiskLevel = 'low' | 'medium' | 'high' | 'critical' | 'monitoring';

function deriveBehaviorStatus(riskLevel: RiskLevel, concerningEvents: number): 'stable' | 'watch' | 'concerning' | 'critical' {
  if (riskLevel === 'critical') return 'critical';
  if (riskLevel === 'high' || concerningEvents >= 3) return 'concerning';
  if (riskLevel === 'medium' || riskLevel === 'monitoring' || concerningEvents >= 1) return 'watch';
  return 'stable';
}

function buildAttendanceSignal(attendanceRate: number, attendanceComponent: number, latePercentage: number): string {
  if (attendanceComponent >= 30 || attendanceRate < 70) {
    return 'Attendance trend is amplifying behavior risk and requires intervention support.';
  }

  if (latePercentage >= 30 || attendanceComponent >= 15) {
    return 'Attendance friction is contributing to behavior concerns and should be monitored.';
  }

  return 'Attendance is currently a stable supporting signal.';
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentLrn = searchParams.get('studentLrn');

    if (!studentLrn) {
      return Response.json(
        { error: 'studentLrn query parameter is required' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return Response.json(
        {
          success: false,
          error: 'Missing Supabase credentials',
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const [{ data: riskRows, error: riskError }, { data: summaryRows }, { data: trendRows }] = await Promise.all([
      supabase.rpc('calculate_student_risk_score', { p_student_lrn: studentLrn }),
      supabase
        .from('student_attendance_summary')
        .select('next_likely_absent_date, next_absent_confidence')
        .eq('student_lrn', studentLrn)
        .maybeSingle(),
      supabase.rpc('calculate_student_trend', { p_student_lrn: studentLrn }),
    ]);

    if (riskError || !riskRows || riskRows.length === 0) {
      return Response.json(
        {
          success: false,
          error: 'Unable to calculate risk summary',
          detail: riskError?.message || 'No risk data returned',
        },
        { status: 500 }
      );
    }

    const risk = riskRows[0];
    const breakdown = risk.breakdown || {};
    const concerningEvents = Number(breakdown.negative_events || 0);
    const positiveEvents = Number(breakdown.positive_events || 0);
    const attendanceRate = Number(breakdown.attendance_rate || 0);
    const latePercentage = Number(breakdown.late_percentage || 0);
    let riskLevel = String(risk.risk_level || 'low') as RiskLevel;
    riskLevel = applyRiskDowngrade(riskLevel, {
      attendance_rate: attendanceRate,
      negative_events: concerningEvents,
      positive_events: positiveEvents,
      late_percentage: latePercentage,
    });
    const behaviorStatus = deriveBehaviorStatus(riskLevel, concerningEvents);
    const attendanceSignal = buildAttendanceSignal(attendanceRate, Number(risk.attendance_component || 0), latePercentage);
    const trend = Array.isArray(trendRows) && trendRows.length > 0
      ? String(trendRows[0].trend_direction || 'stable')
      : 'stable';

    // Compile multiple issues into a single comprehensive term
    const issueCompilation = await compileStudentIssues(studentLrn);
    const patternType = issueCompilation.compiledIssue;

    return Response.json({
      success: true,
      data: {
        riskLevel,
        behaviorStatus,
        concerningEvents,
        positiveEvents,
        patternType,
        attendanceSignal,
        trend,
        nextLikelyAbsentDate: summaryRows?.next_likely_absent_date || null,
        predictionConfidence: Number(summaryRows?.next_absent_confidence || 0),
      },
    });
  } catch (error) {
    console.error('Summary Proxy Error:', error);
    return Response.json(
      {
        success: false,
        error: 'Failed to fetch student summary',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
