// ============================================================================
// ML Integration Examples - Use in Your Next.js App
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import { formatLocalDateKey } from './utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================================================
// 1. GET STUDENT ATTENDANCE SUMMARY
// ============================================================================

export async function getStudentAttendanceSummary(studentLrn: string) {
  const { data, error } = await supabase
    .from('student_attendance_summary')
    .select('*')
    .eq('student_lrn', studentLrn)
    .single();

  if (error) {
    console.error('Error fetching student summary:', error);
    return null;
  }

  return {
    attendanceRate: data.current_attendance_rate,
    trend: data.attendance_trend, // 'improving' | 'stable' | 'declining'
    riskLevel: data.risk_level, // 'low' | 'medium' | 'high' | 'critical'
    nextLikelyAbsentDate: data.next_likely_absent_date,
    predictionConfidence: data.next_absent_confidence,
    daysUntilCritical: data.days_until_critical_threshold,
  };
}

// ============================================================================
// 2. PREDICT NEXT ABSENCE FOR A STUDENT
// ============================================================================

export async function predictStudentAbsence(studentLrn: string) {
  // Call the ML prediction function
  const { data, error } = await supabase
    .rpc('analyze_and_predict_absence', {
      p_student_lrn: studentLrn,
    });

  if (error) {
    console.error('Error predicting absence:', error);
    return null;
  }

  return {
    patternType: data[0].pattern_type,
    patternConfidence: data[0].pattern_confidence,
    predictedAbsentDate: data[0].predicted_absent_date,
    predictionConfidence: data[0].prediction_confidence,
    riskFactors: data[0].risk_factors,
    recommendation: data[0].recommendation,
  };
}

// ============================================================================
// 3. GET ALL HIGH-RISK STUDENTS
// ============================================================================

export async function getHighRiskStudents() {
  const { data, error } = await supabase
    .from('student_attendance_summary')
    .select(`
      student_lrn,
      current_attendance_rate,
      risk_level,
      next_likely_absent_date,
      next_absent_confidence
    `)
    .in('risk_level', ['high', 'critical'])
    .order('current_attendance_rate', { ascending: true });

  if (error) {
    console.error('Error fetching high-risk students:', error);
    return [];
  }

  return (data || []).map((student: any) => ({
    lrn: student.student_lrn,
    name: student.name || student.student_lrn,
    parentContact: null,
    parentEmail: null,
    attendanceRate: student.current_attendance_rate,
    riskLevel: student.risk_level,
    nextAbsentDate: student.next_likely_absent_date,
    predictionConfidence: student.next_absent_confidence,
  }));
}

// ============================================================================
// 3B. GET ALL STUDENTS WITH COMPREHENSIVE RISK SCORES
// ============================================================================

export async function getAllStudentsWithRiskScores() {
  try {
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select(`
        lrn,
        name,
        level,
        parent_contact,
        parent_email,
        student_attendance_summary(
          current_attendance_rate,
          risk_level,
          next_likely_absent_date,
          next_absent_confidence,
          attendance_trend
        )
      `)
      .eq('status', 'active');

    if (studentsError) {
      console.error('Error fetching students with risk scores:', studentsError);
      return [];
    }

    return (students || []).map((student: any) => {
      const summary = student.student_attendance_summary?.[0];
      return {
        lrn: student.lrn,
        name: student.name,
        level: student.level,
        parentContact: student.parent_contact || student.parent_email,
        parentEmail: student.parent_email || null,
        attendanceRate: summary?.current_attendance_rate || 0,
        riskLevel: summary?.risk_level || 'low',
        trend: summary?.attendance_trend || 'stable',
        nextAbsentDate: summary?.next_likely_absent_date || null,
        predictionConfidence: summary?.next_absent_confidence || 0,
      };
    });
  } catch (error) {
    console.error('Error in getAllStudentsWithRiskScores:', error);
    return [];
  }
}

// ============================================================================
// 4. LOG ATTENDANCE & TRIGGER ML UPDATE
// ============================================================================

export async function logAttendance(studentLrn: string, checkInTime: Date) {
  try {
    // Insert attendance log
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance_logs')
      .insert({
        student_lrn: studentLrn,
        check_in_time: checkInTime,
        check_out_time: null,
        date: formatLocalDateKey(checkInTime),
        is_present: true,
      });

    if (attendanceError) throw attendanceError;

    // Trigger ML update for this student
    const { data: predictionData, error: predictionError } = await supabase.rpc(
      'store_absence_prediction',
      {
        p_student_lrn: studentLrn,
      }
    );

    if (predictionError) throw predictionError;

    // Update student summary
    const { data: summaryData, error: summaryError } = await supabase.rpc(
      'update_student_summary',
      {
        p_student_lrn: studentLrn,
      }
    );

    if (summaryError) throw summaryError;

    return {
      success: true,
      prediction: predictionData,
      summary: summaryData,
    };
  } catch (error) {
    console.error('Error logging attendance:', error);
    return { success: false, error };
  }
}

// ============================================================================
// 5. DASHBOARD VIEW MODEL - STUDENT RISK CARD
// ============================================================================

export function buildStudentRiskCardView(summary: any) {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical':
        return 'bg-red-100 dark:bg-red-900/30 border-red-500 dark:border-red-700/50 text-red-700 dark:text-red-400';
      case 'high':
        return 'bg-orange-100 dark:bg-orange-900/30 border-orange-500 dark:border-orange-700/50 text-orange-700 dark:text-orange-400';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500 dark:border-yellow-700/50 text-yellow-700 dark:text-yellow-400';
      default:
        return 'bg-green-100 dark:bg-green-900/30 border-green-500 dark:border-green-700/50 text-green-700 dark:text-green-400';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return '📈';
      case 'declining':
        return '📉';
      default:
        return '➡️';
    }
  };

  return {
    riskBadgeClass: getRiskColor(summary?.riskLevel || 'low'),
    trendIcon: getTrendIcon(summary?.trend || 'stable'),
    attendanceRate: summary?.attendanceRate || 0,
    riskLevel: summary?.riskLevel || 'low',
    nextLikelyAbsentDate: summary?.nextLikelyAbsentDate || null,
    daysUntilCritical: summary?.daysUntilCritical || 0,
  };
}

// ============================================================================
// 6. ALERTS & NOTIFICATIONS
// ============================================================================

export async function checkAndNotifyHighRiskStudents() {
  const students = await getHighRiskStudents();

  for (const student of students) {
    if (student.riskLevel === 'critical') {
      // Send urgent notification
      await sendParentNotification({
        studentName: student.name,
        parentPhone: student.parentContact,
        message: `URGENT: ${student.name} has ${student.attendanceRate}% attendance. Immediate intervention needed.`,
        priority: 'critical',
      });
    } else if (student.riskLevel === 'high' && student.nextAbsentDate) {
      // Send predictive notification
      await sendParentNotification({
        studentName: student.name,
        parentPhone: student.parentContact,
        message: `${student.name} shows pattern of absences. We predict possible absence on ${student.nextAbsentDate} (${Math.round(student.predictionConfidence)}% confidence). Please monitor.`,
        priority: 'high',
      });
    }
  }
}

async function sendParentNotification(options: {
  studentName: string;
  parentPhone?: string | null;
  message: string;
  priority: string;
}) {
  if (!options.parentPhone) {
    console.log('📢 Notification skipped:', options.message);
    return;
  }

  // Implement SMS/Email service here
  console.log('📢 Notification:', options.message);
}

// ============================================================================
// 7. ML INSIGHTS PAGE
// ============================================================================

export async function getMLInsightsForStudent(studentLrn: string) {
  const [
    attendanceMetrics,
    prediction,
    patterns,
  ] = await Promise.all([
    supabase.rpc('calculate_student_attendance_metrics', {
      p_student_lrn: studentLrn,
      p_days_back: 60,
    }),
    predictStudentAbsence(studentLrn),
    supabase
      .from('attendance_patterns')
      .select('*')
      .eq('student_lrn', studentLrn)
      .single(),
  ]);

  return {
    metrics: attendanceMetrics.data?.[0],
    prediction,
    pattern: patterns.data,
  };
}

// ============================================================================
// 8. DAILY BATCH JOB - Update All Student Summaries
// ============================================================================

export async function updateAllStudentSummaries() {
  console.log('🔄 Updating all student summaries...');

  // Get all active students
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('lrn')
    .eq('status', 'active');

  if (studentsError) {
    console.error('Error fetching students:', studentsError);
    return;
  }

  // Update each student's summary
  for (const student of students) {
    try {
      await supabase.rpc('update_student_summary', {
        p_student_lrn: student.lrn,
      });
      console.log(`✅ Updated ${student.lrn}`);
    } catch (error) {
      console.error(`❌ Failed for ${student.lrn}:`, error);
    }
  }

  // Check for alerts
  await checkAndNotifyHighRiskStudents();

  console.log('✅ Daily update complete');
}

// ============================================================================
// 9. API ENDPOINT EXAMPLE (Next.js App Router)
// ============================================================================

// pages/api/student/[lrn]/risk.ts

export async function GET(request: Request, { params }: any) {
  const { lrn } = params;

  const summary = await getStudentAttendanceSummary(lrn);

  if (!summary) {
    return Response.json({ error: 'Student not found' }, { status: 404 });
  }

  return Response.json(summary);
}

// ============================================================================
// 10. REAL-TIME SUBSCRIPTION (Optional)
// ============================================================================

export function subscribeToStudentRiskUpdates(
  studentLrn: string,
  onUpdate: (summary: any) => void
) {
  console.warn('Realtime subscription example is not enabled in this helper file.');
  return () => undefined;
}
