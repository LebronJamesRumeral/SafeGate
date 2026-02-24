// ============================================================================
// TypeScript Types for ML System
// ============================================================================

export namespace ML {
  // ============================================================================
  // Core Data Types
  // ============================================================================

  export interface Student {
    id: number;
    lrn: string;
    name: string;
    gender: 'Male' | 'Female';
    birthday: string; // ISO date
    address: string;
    level: string;
    parent_name: string;
    parent_contact: string;
    status: 'active' | 'inactive' | 'graduated';
    created_at: string; // ISO timestamp
    updated_at: string; // ISO timestamp
  }

  export interface AttendanceLog {
    id: number;
    student_lrn: string;
    check_in_time: string; // ISO timestamp
    check_out_time?: string; // ISO timestamp
    date: string; // ISO date
    is_present: boolean;
    created_at: string; // ISO timestamp
  }

  // ============================================================================
  // ML Analytics Types
  // ============================================================================

  export interface AttendancePattern {
    id: number;
    student_lrn: string;
    pattern_type:
      | 'High Consistency'
      | 'Monday Absent'
      | 'Friday Absent'
      | 'Late Arrival Trend'
      | 'Chronic Absent'
      | 'Sporadic Absent'
      | 'Average Attendance';
    pattern_confidence: number; // 0-100
    attendance_rate: number; // 0-100
    days_present: number;
    days_absent: number;
    total_school_days: number;
    avg_check_in_minute: number; // 0-1439
    late_arrivals_count: number;
    late_arrival_frequency: number; // 0-100
    monday_absent_rate: number; // 0-100
    friday_absent_rate: number; // 0-100
    weekend_correlation: boolean;
    absence_trend: 'improving' | 'declining' | 'stable';
    critical_threshold_days: number;
    created_at: string;
    last_updated: string;
  }

  export interface AbsencePrediction {
    id: number;
    student_lrn: string;
    predicted_absent_date: string; // ISO date
    prediction_type:
      | 'Monday Pattern'
      | 'Friday Pattern'
      | 'Chronic'
      | 'Anomaly'
      | 'Late Arrival Escalation';
    confidence_score: number; // 0-100
    risk_factors: Record<string, any>;
    model_version: string;
    training_data_size: number;
    prediction_made_at: string;
    actual_present?: boolean; // null until date passes
    verified_at?: string;
    model_accuracy_impact?: number;
  }

  export interface StudentAttendanceSummary {
    id: number;
    student_lrn: string;
    current_attendance_rate: number; // 0-100
    attendance_trend: 'improving' | 'stable' | 'declining' | 'critical';
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    total_days_present: number;
    total_days_absent: number;
    total_days_late: number;
    recent_attendance_rate: number; // 0-100
    recent_absent_count: number;
    next_likely_absent_date?: string; // ISO date
    next_absent_confidence: number; // 0-100
    days_until_critical_threshold: number;
    last_calculated: string;
    created_at: string;
    updated_at: string;
  }

  // ============================================================================
  // Function Return Types
  // ============================================================================

  export interface AttendanceMetrics {
    attendance_rate: number;
    days_present: number;
    school_days: number;
    late_arrivals: number;
    on_time_count: number;
    consistency_score: number;
  }

  export interface PredictionResult {
    pattern_type: string;
    pattern_confidence: number;
    predicted_absent_date?: string;
    prediction_confidence: number;
    risk_factors: string;
    recommendation: string;
  }

  export interface StudentRiskProfile {
    attendanceRate: number;
    trend: 'improving' | 'stable' | 'declining';
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    nextLikelyAbsentDate?: string;
    predictionConfidence: number;
    daysUntilCritical?: number;
  }

  export interface HighRiskStudent {
    lrn: string;
    name: string;
    parentContact: string;
    attendanceRate: number;
    riskLevel: 'high' | 'critical';
    nextAbsentDate?: string;
    predictionConfidence: number;
  }

  export interface MLInsights {
    metrics?: AttendanceMetrics;
    prediction?: PredictionResult;
    pattern?: AttendancePattern;
  }

  // ============================================================================
  // API Response Types
  // ============================================================================

  export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
  }

  export interface AttendanceLogResponse {
    success: boolean;
    prediction?: {
      prediction_id: number;
      student_lrn: string;
      predicted_date: string;
      prediction_type: string;
      confidence: number;
    };
    summary?: StudentAttendanceSummary;
    error?: string;
  }

  // ============================================================================
  // Dashboard Component Props
  // ============================================================================

  export interface StudentRiskCardProps {
    studentLrn: string;
    onUpdate?: (summary: StudentAttendanceSummary) => void;
  }

  export interface MLDashboardProps {
    students: string[];
    onStudentClick?: (lrn: string) => void;
    showPredictions?: boolean;
    showTrends?: boolean;
  }

  export interface HighRiskAlertProps {
    students: HighRiskStudent[];
    onContactParent?: (lrn: string) => void;
  }

  export interface PredictionChartProps {
    studentLrn: string;
    days?: number;
  }

  // ============================================================================
  // Configuration Types
  // ============================================================================

  export interface MLConfig {
    chronicThreshold: number; // % attendance
    sporadicThreshold: number;
    excellentThreshold: number;
    dayPatternThreshold: number; // 0-1 (45% = 0.45)
    latePatternThreshold: number;
    criticalAttendance: number;
    predictionConfidenceMin: number; // Minimum to alert
  }

  // Default ML Configuration
  export const DEFAULT_ML_CONFIG: MLConfig = {
    chronicThreshold: 60,
    sporadicThreshold: 75,
    excellentThreshold: 95,
    dayPatternThreshold: 0.45,
    latePatternThreshold: 0.5,
    criticalAttendance: 70,
    predictionConfidenceMin: 65,
  };

  // ============================================================================
  // Utility Types
  // ============================================================================

  export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
  export type AttendanceTrend = 'improving' | 'stable' | 'declining';
  export type PatternType =
    | 'High Consistency'
    | 'Monday Absent'
    | 'Friday Absent'
    | 'Late Arrival Trend'
    | 'Chronic Absent'
    | 'Sporadic Absent'
    | 'Average Attendance';

  // ============================================================================
  // Enum Types
  // ============================================================================

  export enum RiskLevelEnum {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical',
  }

  export enum TrendEnum {
    IMPROVING = 'improving',
    STABLE = 'stable',
    DECLINING = 'declining',
  }

  export enum PatternTypeEnum {
    HIGH_CONSISTENCY = 'High Consistency',
    MONDAY_ABSENT = 'Monday Absent',
    FRIDAY_ABSENT = 'Friday Absent',
    LATE_ARRIVAL = 'Late Arrival Trend',
    CHRONIC = 'Chronic Absent',
    SPORADIC = 'Sporadic Absent',
    AVERAGE = 'Average Attendance',
  }

  // ============================================================================
  // Helper Functions
  // ============================================================================

  export function getRiskColor(risk: RiskLevel): string {
    switch (risk) {
      case 'critical':
        return '#dc2626'; // red-600
      case 'high':
        return '#ea580c'; // orange-600
      case 'medium':
        return '#eab308'; // yellow-500
      case 'low':
      default:
        return '#16a34a'; // green-600
    }
  }

  export function getRiskBgColor(risk: RiskLevel): string {
    switch (risk) {
      case 'critical':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400';
      case 'high':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400';
      case 'low':
      default:
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400';
    }
  }

  export function getTrendIcon(trend: AttendanceTrend): string {
    switch (trend) {
      case 'improving':
        return '📈';
      case 'declining':
        return '📉';
      case 'stable':
      default:
        return '➡️';
    }
  }

  export function formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  export function getDaysUntil(date: string): number {
    const today = new Date();
    const target = new Date(date);
    const diff = target.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  export function isHighRisk(risk: RiskLevel): boolean {
    return risk === 'high' || risk === 'critical';
  }

  export function isDecliniBehaviour(trend: AttendanceTrend): boolean {
    return trend === 'declining';
  }

  // ============================================================================
  // API Constants
  // ============================================================================

  export const API_ENDPOINTS = {
    STUDENT_SUMMARY: '/api/student/[lrn]/summary',
    STUDENT_PREDICTION: '/api/student/[lrn]/prediction',
    STUDENT_METRICS: '/api/student/[lrn]/metrics',
    HIGH_RISK_STUDENTS: '/api/students/high-risk',
    LOG_ATTENDANCE: '/api/attendance/log',
    TODAY_PREDICTIONS: '/api/ml/predictions/today',
  };
}

// ============================================================================
// Export for use in components
// ============================================================================

export type StudentRiskCard = ML.StudentRiskCardProps;
export type MLDashboard = ML.MLDashboardProps;
export type StudentSummary = ML.StudentAttendanceSummary;
export type StudentProfile = ML.StudentRiskProfile;
export type RiskLevel = ML.RiskLevel;
