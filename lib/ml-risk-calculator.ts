import { supabase } from './supabase';

export interface AttendanceMetrics {
  attendance_rate: number;
  days_present: number;
  school_days: number;
  late_arrivals: number;
  on_time_count: number;
  consistency_score: number;
}

export interface AbsencePattern {
  pattern: string;
  severity: number;
  evidence: string;
  detection_confidence: number;
}

export interface RiskScore {
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  attendance_component: number;
  behavior_component: number;
  pattern_component: number;
  confidence: number;
  breakdown: {
    attendance_rate: number;
    days_present: number;
    school_days: number;
    late_percentage: number;
    negative_events: number;
    positive_events: number;
    calculation_date: string;
  };
}

/**
 * Calculates detailed attendance metrics for a student
 * Uses scanned attendance data from the last 60 days
 */
export async function getAttendanceMetrics(
  studentLrn: string
): Promise<AttendanceMetrics | null> {
  try {
    console.log(`[ML] Fetching attendance metrics for ${studentLrn}`);
    const { data, error } = await supabase.rpc(
      'calculate_student_attendance_metrics',
      {
        p_student_lrn: studentLrn,
        p_days_back: 60,
      }
    );

    if (error) {
      console.error(`[ML] Attendance metrics RPC failed for ${studentLrn}:`, error);
      return null;
    }

    if (data && data.length > 0) {
      console.log(`[ML] Attendance: ${data[0].attendance_rate}% for ${studentLrn}`);
      return data[0] as AttendanceMetrics;
    }

    console.warn(`[ML] No attendance data returned for ${studentLrn}`);
    return null;
  } catch (error) {
    console.error(`[ML] Exception in getAttendanceMetrics for ${studentLrn}:`, error);
    return null;
  }
}

/**
 * Detects absence patterns in student attendance data
 * Identifies patterns like high absence rate, Monday absences, Friday absences
 */
export async function detectAbsencePatterns(
  studentLrn: string,
  daysBack: number = 30
): Promise<AbsencePattern[]> {
  try {
    console.log(`[ML] Detecting absence patterns for ${studentLrn} (${daysBack} days)`);
    const { data, error } = await supabase.rpc(
      'detect_student_absence_patterns',
      {
        p_student_lrn: studentLrn,
        p_days_back: daysBack,
      }
    );

    if (error) {
      console.error(`[ML] Absence pattern RPC failed for ${studentLrn}:`, error);
      return [];
    }

    if (data && data.length > 0) {
      console.log(`[ML] Detected ${data.length} pattern(s) for ${studentLrn}`);
      return data as AbsencePattern[];
    }

    console.log(`[ML] No absence patterns detected for ${studentLrn}`);
    return [];
  } catch (error) {
    console.error(`[ML] Exception in detectAbsencePatterns for ${studentLrn}:`, error);
    return [];
  }
}

/**
 * Calculates comprehensive risk score for a student
 * Combines attendance metrics, behavioral events, and patterns
 * Returns a risk score (0-100) and risk level assessment
 */
export async function calculateStudentRiskScore(
  studentLrn: string
): Promise<RiskScore | null> {
  try {
    console.log(`[ML] Calling RPC function calculate_student_risk_score for student: ${studentLrn}`);
    
    const { data, error } = await supabase.rpc(
      'calculate_student_risk_score',
      {
        p_student_lrn: studentLrn,
      }
    );

    if (error) {
      // Detailed error logging to diagnose RPC issues
      console.error(
        `[ML ERROR] RPC call failed for ${studentLrn}:`,
        JSON.stringify({
          error_message: error.message,
          error_code: (error as any).code,
          error_details: (error as any).details,
          error_hint: (error as any).hint,
          full_error: error
        }, null, 2)
      );
      
      console.warn(`[ML] Falling back to simple risk score calculation for ${studentLrn}`);
      return await getSimpleRiskScore(studentLrn);
    }

    if (!data) {
      console.warn(`[ML] RPC returned no data for student ${studentLrn}, using fallback`);
      return await getSimpleRiskScore(studentLrn);
    }

    if (data && data.length > 0) {
      console.log(`[ML] Successfully calculated risk score: ${data[0].risk_score} (${data[0].risk_level}) for ${studentLrn}`);
      return data[0] as RiskScore;
    }

    console.warn(`[ML] RPC returned empty data array for student ${studentLrn}, using fallback`);
    return await getSimpleRiskScore(studentLrn);
  } catch (error) {
    console.error(
      `[ML EXCEPTION] Unexpected error in calculateStudentRiskScore for ${studentLrn}:`,
      {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack
      }
    );
    
    console.warn(`[ML] Falling back to simple risk score calculation due to exception for ${studentLrn}`);
    return await getSimpleRiskScore(studentLrn);
  }
}

/**
 * Simple fallback risk calculation when database functions are unavailable
 * Uses basic metrics: attendance + behavioral events
 */
async function getSimpleRiskScore(studentLrn: string): Promise<RiskScore | null> {
  try {
    console.log(`[ML FALLBACK] Computing simple risk score for ${studentLrn} using direct queries`);
    
    // Fetch attendance data
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance_logs')
      .select('date')
      .eq('student_lrn', studentLrn)
      .gte('date', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (attendanceError) throw attendanceError;

    // Count school days (Mon-Fri only)
    const schoolDays = attendanceData?.filter((log: any) => {
      const dayOfWeek = new Date(log.date).getDay();
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    }).length || 0;

    console.log(`[ML FALLBACK] Found ${schoolDays} school days for ${studentLrn}`);

    // Estimate based on simple checks
    let simpleRiskScore = 0;
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    if (schoolDays < 20) {
      simpleRiskScore = 70; // Low attendance = high risk
      riskLevel = 'high';
    } else if (schoolDays < 30) {
      simpleRiskScore = 50;
      riskLevel = 'medium';
    } else {
      simpleRiskScore = 20;
      riskLevel = 'low';
    }

    console.log(`[ML FALLBACK] Risk score (simple method): ${simpleRiskScore} (${riskLevel}) for ${studentLrn}`);

    return {
      risk_score: simpleRiskScore,
      risk_level: riskLevel,
      attendance_component: schoolDays < 20 ? 30 : 10,
      behavior_component: 0,
      pattern_component: 0,
      confidence: 60,
      breakdown: {
        attendance_rate: schoolDays ? (schoolDays / 40) * 100 : 0,
        days_present: schoolDays,
        school_days: schoolDays,
        late_percentage: 0,
        negative_events: 0,
        positive_events: 0,
        calculation_date: new Date().toISOString().split('T')[0],
      }
    };
  } catch (error) {
    console.error(`Error in fallback risk calculation for ${studentLrn}:`, error);
    return null;
  }
}

/**
 * Batch calculates risk scores for multiple students
 * Useful for dashboard and list views
 */
export async function calculateBatchRiskScores(
  studentLrns: string[]
): Promise<Map<string, RiskScore>> {
  const results = new Map<string, RiskScore>();

  if (!studentLrns || studentLrns.length === 0) {
    return results;
  }

  try {
    const promises = studentLrns.map(lrn => calculateStudentRiskScore(lrn));
    const scores = await Promise.all(promises);

    scores.forEach((score, index) => {
      if (score) {
        results.set(studentLrns[index], score);
      }
    });

    console.log(`Risk scores calculated: ${results.size}/${studentLrns.length} students`);
    return results;
  } catch (error) {
    console.error('Error in calculateBatchRiskScores:', error);
    return results;
  }
}

/**
 * Gets detailed student profile with all ML insights
 */
export async function getStudentMLProfile(studentLrn: string) {
  try {
    const [metrics, patterns, riskScore] = await Promise.all([
      getAttendanceMetrics(studentLrn),
      detectAbsencePatterns(studentLrn, 30),
      calculateStudentRiskScore(studentLrn),
    ]);

    return {
      metrics,
      patterns,
      riskScore,
    };
  } catch (error) {
    console.error('Error getting student ML profile:', error);
    return {
      metrics: null,
      patterns: [],
      riskScore: null,
    };
  }
}

/**
 * Determines risk badge color based on risk level
 */
export function getRiskColor(riskLevel: string): string {
  switch (riskLevel) {
    case 'critical':
      return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700/50';
    case 'high':
      return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700/50';
    case 'medium':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700/50';
    case 'low':
    default:
      return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700/50';
  }
}

/**
 * Determines risk icon
 */
export function getRiskIcon(riskLevel: string): string {
  switch (riskLevel) {
    case 'critical':
      return '🚨';
    case 'high':
      return '⚠️';
    case 'medium':
      return '⚡';
    case 'low':
    default:
      return '✅';
  }
}

/**
 * Formats attendance rate as a percentage string
 */
export function formatAttendanceRate(rate: number): string {
  return `${Math.round(rate)}%`;
}

/**
 * Gets descriptive text for risk level
 */
export function getRiskDescription(riskLevel: string): string {
  switch (riskLevel) {
    case 'critical':
      return 'Requires immediate intervention';
    case 'high':
      return 'Close monitoring recommended';
    case 'medium':
      return 'Watch for trends';
    case 'low':
    default:
      return 'On track';
  }
}

/**
 * Determines action recommendations based on risk profile
 */
export function getActionRecommendations(riskScore: RiskScore): string[] {
  const recommendations: string[] = [];

  // Based on components
  if (riskScore.attendance_component > 20) {
    recommendations.push('Low attendance rate - Review with parents');
    recommendations.push('Consider attendance intervention plan');
  }

  if (riskScore.behavior_component > 15) {
    recommendations.push('Multiple behavioral incidents - Implement behavior plan');
    recommendations.push('Schedule meeting with student and parents');
  }

  if (riskScore.pattern_component > 12) {
    recommendations.push('Recurring patterns detected - Investigate root causes');
  }

  // Based on attendance metrics
  if (riskScore.breakdown.late_percentage > 30) {
    recommendations.push('High tardiness rate - Discuss morning routines');
  }

  if (riskScore.breakdown.school_days < 10) {
    recommendations.push('Limited data - Track attendance closely');
  }

  if (recommendations.length === 0) {
    recommendations.push('Continue monitoring - No immediate actions needed');
  }

  return recommendations;
}

// NEW: Predictive and Adaptive ML Functions

export interface TrendAnalysis {
  current_attendance_rate: number;
  previous_attendance_rate: number;
  attendance_trend: string;
  trend_direction: 'improving' | 'stable' | 'declining';
  days_until_critical: number;
  confidence: number;
}

/**
 * Analyzes attendance trends over time
 * Compares last 30 days to previous 30 days
 * Predicts days until critical attendance level (70%)
 */
export async function getTrendAnalysis(
  studentLrn: string
): Promise<TrendAnalysis | null> {
  try {
    console.log(`[ML TREND] Analyzing attendance trends for ${studentLrn}`);
    const { data, error } = await supabase.rpc(
      'calculate_student_trend',
      { p_student_lrn: studentLrn }
    );

    if (error) {
      console.error(`[ML ERROR] Trend analysis failed for ${studentLrn}:`, error);
      return null;
    }

    if (data && data.length > 0) {
      const trend = data[0];
      console.log(
        `[ML TREND] ${studentLrn}: ${trend.trend_direction} ` +
        `(${trend.current_attendance_rate}% from ${trend.previous_attendance_rate}%)`
      );
      return trend;
    }

    return null;
  } catch (error) {
    console.error(`[ML ERROR] Exception in getTrendAnalysis:`, error);
    return null;
  }
}

export interface RiskForecast {
  current_risk_score: number;
  forecasted_risk_score: number;
  risk_trajectory: 'improving' | 'stable' | 'worsening';
  forecast_confidence: number;
  recommended_action: string;
  urgency_level: string;
}

/**
 * Forecasts future risk based on current trends
 * Projects risk score 7 days ahead by default
 * Provides actionable recommendations based on trajectory
 */
export async function getForecastedRisk(
  studentLrn: string,
  daysAhead: number = 7
): Promise<RiskForecast | null> {
  try {
    console.log(`[ML FORECAST] Predicting ${daysAhead}-day risk for ${studentLrn}`);
    const { data, error } = await supabase.rpc(
      'forecast_student_risk',
      { p_student_lrn: studentLrn, p_days_ahead: daysAhead }
    );

    if (error) {
      console.error(`[ML ERROR] Risk forecast failed for ${studentLrn}:`, error);
      return null;
    }

    if (data && data.length > 0) {
      const forecast = data[0];
      console.log(
        `[ML FORECAST] ${studentLrn}: Risk forecast ${forecast.current_risk_score} → ` +
        `${forecast.forecasted_risk_score} (${forecast.risk_trajectory})`
      );
      return forecast;
    }

    return null;
  } catch (error) {
    console.error(`[ML ERROR] Exception in getForecastedRisk:`, error);
    return null;
  }
}

export interface InterventionLearning {
  intervention_type: string;
  effectiveness_rating: number;
  success_rate: number;
  average_risk_reduction: number;
  recommendation: string;
}

/**
 * Learns from past interventions
 * Analyzes which interventions work best for this student
 * Returns effectiveness metrics and recommendations
 */
export async function getInterventionLearning(
  studentLrn: string
): Promise<InterventionLearning[]> {
  try {
    console.log(`[ML ADAPTIVE] Learning from interventions for ${studentLrn}`);
    const { data, error } = await supabase.rpc(
      'learn_from_interventions',
      { p_student_lrn: studentLrn }
    );

    if (error) {
      console.error(`[ML ERROR] Intervention learning failed for ${studentLrn}:`, error);
      return [];
    }

    if (data && data.length > 0) {
      console.log(
        `[ML ADAPTIVE] Found ${data.length} intervention types for ${studentLrn}`
      );
      data.forEach((intervention: InterventionLearning) => {
        console.log(
          `[ML ADAPTIVE] ${intervention.intervention_type}: ` +
          `${intervention.effectiveness_rating}/5 effectiveness, ` +
          `${intervention.success_rate}% success rate`
        );
      });
      return data;
    }

    return [];
  } catch (error) {
    console.error(`[ML ERROR] Exception in getInterventionLearning:`, error);
    return [];
  }
}

export interface AdaptiveThreshold {
  metric_name: string;
  current_threshold: number;
  adaptive_threshold: number;
  rationale: string;
}

/**
 * Calculates adaptive thresholds based on student/context
 * Thresholds adjust by grade level and historical patterns
 * Makes scoring more personalized and accurate
 */
export async function getAdaptiveThresholds(
  studentLrn: string,
  gradeLevel?: string
): Promise<AdaptiveThreshold[]> {
  try {
    console.log(`[ML ADAPTIVE] Calculating adaptive thresholds for ${studentLrn}`);
    const { data, error } = await supabase.rpc(
      'get_adaptive_thresholds',
      { p_student_lrn: studentLrn, p_grade_level: gradeLevel || null }
    );

    if (error) {
      console.error(`[ML ERROR] Adaptive thresholds failed for ${studentLrn}:`, error);
      return [];
    }

    if (data && data.length > 0) {
      console.log(`[ML ADAPTIVE] Adjusted ${data.length} thresholds for ${studentLrn}`);
      return data;
    }

    return [];
  } catch (error) {
    console.error(`[ML ERROR] Exception in getAdaptiveThresholds:`, error);
    return [];
  }
}

/**
 * Comprehensive predictive ML profile combining all new features
 */
export async function getPredictiveMLProfile(studentLrn: string) {
  try {
    console.log(`[ML PREDICT] Building comprehensive ML profile for ${studentLrn}`);

    const [trend, forecast, interventions, thresholds] = await Promise.all([
      getTrendAnalysis(studentLrn),
      getForecastedRisk(studentLrn),
      getInterventionLearning(studentLrn),
      getAdaptiveThresholds(studentLrn),
    ]);

    return {
      trend,
      forecast,
      interventions,
      thresholds,
      generated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`[ML ERROR] Exception in getPredictiveMLProfile:`, error);
    return null;
  }
}

export interface AbsenceForecast {
  predicted_absent_dates: string;
  absence_pattern: string;
  confidence: number;
  high_risk_days: string;
  behavioral_event_forecast: string;
  recommendation: string;
}

/**
 * Forecasts when a student will be absent
 * Analyzes patterns (Monday absences, Friday absences, chronic absences)
 * Predicts future absence days based on historical behavior
 * Shows impact on behavioral event tracking
 */
export async function forecastStudentAbsences(
  studentLrn: string,
  daysAhead: number = 14
): Promise<AbsenceForecast | null> {
  try {
    console.log(`[ML FORECAST] Predicting absences for ${studentLrn} (${daysAhead} days)`);
    const { data, error } = await supabase.rpc(
      'forecast_student_absences',
      { p_student_lrn: studentLrn, p_days_ahead: daysAhead }
    );

    if (error) {
      console.error(`[ML ERROR] Absence forecast failed for ${studentLrn}:`, error);
      return null;
    }

    if (data && data.length > 0) {
      const forecast = data[0];
      console.log(
        `[ML FORECAST] ${studentLrn}: Pattern "${forecast.absence_pattern}" ` +
        `(${forecast.confidence}% confidence). High risk days: ${forecast.high_risk_days}`
      );
      return forecast;
    }

    return null;
  } catch (error) {
    console.error(`[ML ERROR] Exception in forecastStudentAbsences:`, error);
    return null;
  }
}

export interface AttendanceBehavioralCorrelation {
  attendance_presence_days: number;
  attendance_absent_days: number;
  behavioral_events_on_present_days: number;
  behavioral_events_on_absent_days: number;
  events_per_present_day: number;
  correlation_strength: string;
  insight: string;
}

/**
 * Analyzes correlation between attendance and behavioral events
 * Shows how many behavioral events occur on present vs absent days
 * Identifies data quality issues (events recorded on absence days)
 * Helps understand: behavioral events only happen when student is present
 */
export async function getAttendanceBehavioralCorrelation(
  studentLrn: string
): Promise<AttendanceBehavioralCorrelation | null> {
  try {
    console.log(`[ML ADAPTIVE] Analyzing attendance-behavioral correlation for ${studentLrn}`);
    const { data, error } = await supabase.rpc(
      'get_attendance_behavioral_correlation',
      { p_student_lrn: studentLrn }
    );

    if (error) {
      console.error(`[ML ERROR] Correlation analysis failed for ${studentLrn}:`, error);
      return null;
    }

    if (data && data.length > 0) {
      const corr = data[0];
      console.log(
        `[ML ADAPTIVE] ${studentLrn}: ${corr.attendance_presence_days} present days, ` +
        `${corr.behavioral_events_on_present_days} behavioral events. ` +
        `Correlation: ${corr.correlation_strength}`
      );
      return corr;
    }

    return null;
  } catch (error) {
    console.error(`[ML ERROR] Exception in getAttendanceBehavioralCorrelation:`, error);
    return null;
  }
}

/**
 * Complete absence and behavioral forecast profile
 * Combines absence predictions with attendance-behavioral correlation
 */
export async function getCompleteBehavioralForecast(studentLrn: string) {
  try {
    console.log(`[ML PREDICT] Building complete behavioral forecast for ${studentLrn}`);

    const [absenceForecast, correlation] = await Promise.all([
      forecastStudentAbsences(studentLrn),
      getAttendanceBehavioralCorrelation(studentLrn),
    ]);

    return {
      absenceForecast,
      correlation,
      generated_at: new Date().toISOString(),
      interpretation: `
        Absence Pattern: ${absenceForecast?.absence_pattern || 'Unknown'}
        Expected Impact on Behavioral Events: ${absenceForecast?.behavioral_event_forecast || 'Unknown'}
        Data Quality: ${correlation?.correlation_strength || 'Unknown'}
        ${correlation?.insight || ''}
      `,
    };
  } catch (error) {
    console.error(`[ML ERROR] Exception in getCompleteBehavioralForecast:`, error);
    return null;
  }
}
