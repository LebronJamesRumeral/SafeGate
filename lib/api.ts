/**
 * API Client for FastAPI Backend Integration
 * 
 * This module provides type-safe API communication between the Next.js frontend
 * and the FastAPI backend service through Next.js API routes.
 * 
 * Request Flow:
 * React Component → Next.js API Route (/api/[...path]) → FastAPI Backend
 * 
 * Handles:
 * - Student management
 * - Attendance tracking
 * - Behavior event logging
 * - Risk assessment
 */

// Use Next.js local API routes as proxy to FastAPI backend
const API_BASE_URL = "/api";

/**
 * API Error response interface
 */
interface ApiError {
  detail: string;
  status_code?: number;
  timestamp?: string;
}

/**
 * Generic API response wrapper
 */
interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  status: number;
}

/**
 * Fetch wrapper with error handling
 */
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: `HTTP ${response.status}`,
      }));
      return {
        error: error as ApiError,
        status: response.status,
      };
    }

    const data = await response.json();
    return {
      data: data as T,
      status: response.status,
    };
  } catch (error) {
    console.error(`API Error: ${endpoint}`, error);
    return {
      error: {
        detail:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      status: 0,
    };
  }
}

// ==================== Student API ====================

export interface Student {
  id: number;
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  class_level: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentCreatePayload {
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  class_level: string;
}

export interface StudentUpdatePayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  class_level?: string;
  is_active?: boolean;
}

export const StudentAPI = {
  /**
   * Create a new student
   */
  async create(payload: StudentCreatePayload): Promise<ApiResponse<Student>> {
    return apiFetch<Student>("/students", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Get all students
   */
  async getAll(skip = 0, limit = 100): Promise<ApiResponse<Student[]>> {
    const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
    return apiFetch<Student[]>(`/students?${params}`);
  },

  /**
   * Get a specific student
   */
  async getById(studentId: number): Promise<ApiResponse<Student>> {
    return apiFetch<Student>(`/students/${studentId}`);
  },

  /**
   * Update a student
   */
  async update(
    studentId: number,
    payload: StudentUpdatePayload
  ): Promise<ApiResponse<Student>> {
    return apiFetch<Student>(`/students/${studentId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Delete a student
   */
  async delete(studentId: number): Promise<ApiResponse<void>> {
    return apiFetch<void>(`/students/${studentId}`, {
      method: "DELETE",
    });
  },
};

// ==================== Dashboard API ====================

export interface AttendanceStats {
  student_id: number;
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  attendance_rate: number;
}

export interface BehaviorStats {
  student_id: number;
  positive_events: number;
  negative_events: number;
  total_events: number;
  average_severity: number;
}

export interface RiskScore {
  id: number;
  student_id: number;
  overall_score: number;
  behavioral_score: number;
  attendance_score: number;
  risk_level: string;
  last_updated: string;
  created_at: string;
}

export interface StudentDashboard {
  student: Student;
  attendance_stats: AttendanceStats;
  behavior_stats: BehaviorStats;
  risk_score?: RiskScore;
}

export const DashboardAPI = {
  /**
   * Get comprehensive dashboard data for a student
   */
  async getStudentDashboard(
    studentId: number,
    daysLookback = 30
  ): Promise<ApiResponse<StudentDashboard>> {
    const params = new URLSearchParams({ days_lookback: String(daysLookback) });
    return apiFetch<StudentDashboard>(`/students/view/${studentId}/dashboard?${params}`);
  },

  /**
   * Get attendance statistics
   */
  async getAttendanceStats(
    studentId: number,
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<AttendanceStats>> {
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    return apiFetch<AttendanceStats>(
      `/attendance/stats/student/${studentId}?${params}`
    );
  },

  /**
   * Get behavior statistics
   */
  async getBehaviorStats(
    studentId: number,
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<BehaviorStats>> {
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    return apiFetch<BehaviorStats>(
      `/behavior/stats/student/${studentId}?${params}`
    );
  },
};

// ==================== Attendance API ====================

export interface Attendance {
  id: number;
  student_id: number;
  date: string;
  status: string;
  time_in?: string;
  time_out?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceCreatePayload {
  student_id: number;
  date: string;
  status: string;
  time_in?: string;
  time_out?: string;
  notes?: string;
}

export interface AttendanceUpdatePayload {
  status?: string;
  time_in?: string;
  time_out?: string;
  notes?: string;
}

export const AttendanceAPI = {
  /**
   * Create attendance record
   */
  async create(payload: AttendanceCreatePayload): Promise<ApiResponse<Attendance>> {
    return apiFetch<Attendance>("/attendance", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Get specific attendance record
   */
  async getById(attendanceId: number): Promise<ApiResponse<Attendance>> {
    return apiFetch<Attendance>(`/attendance/${attendanceId}`);
  },

  /**
   * Get all attendance records for a student
   */
  async getStudentRecords(
    studentId: number,
    startDate?: string,
    endDate?: string,
    skip = 0,
    limit = 100
  ): Promise<ApiResponse<Attendance[]>> {
    const params = new URLSearchParams({
      skip: String(skip),
      limit: String(limit),
    });
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    return apiFetch<Attendance[]>(`/attendance/student/${studentId}?${params}`);
  },

  /**
   * Update attendance record
   */
  async update(
    attendanceId: number,
    payload: AttendanceUpdatePayload
  ): Promise<ApiResponse<Attendance>> {
    return apiFetch<Attendance>(`/attendance/${attendanceId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Delete attendance record
   */
  async delete(attendanceId: number): Promise<ApiResponse<void>> {
    return apiFetch<void>(`/attendance/${attendanceId}`, {
      method: "DELETE",
    });
  },
};

// ==================== Behavior API ====================

export type BehaviorEventType = "positive" | "negative" | "neutral";

export interface BehaviorEvent {
  id: number;
  student_id: number;
  event_type: BehaviorEventType;
  description: string;
  severity: number;
  reported_by?: string;
  timestamp: string;
  created_at: string;
  updated_at: string;
}

export interface BehaviorEventCreatePayload {
  student_id: number;
  event_type: BehaviorEventType;
  description: string;
  severity: number;
  reported_by?: string;
}

export interface BehaviorEventUpdatePayload {
  event_type?: BehaviorEventType;
  description?: string;
  severity?: number;
}

export const BehaviorAPI = {
  /**
   * Create behavior event
   */
  async create(payload: BehaviorEventCreatePayload): Promise<ApiResponse<BehaviorEvent>> {
    return apiFetch<BehaviorEvent>("/behavior", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Get specific behavior event
   */
  async getById(eventId: number): Promise<ApiResponse<BehaviorEvent>> {
    return apiFetch<BehaviorEvent>(`/behavior/${eventId}`);
  },

  /**
   * Get all behavior events for a student
   */
  async getStudentEvents(
    studentId: number,
    startDate?: string,
    endDate?: string,
    skip = 0,
    limit = 100
  ): Promise<ApiResponse<BehaviorEvent[]>> {
    const params = new URLSearchParams({
      skip: String(skip),
      limit: String(limit),
    });
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    return apiFetch<BehaviorEvent[]>(`/behavior/student/${studentId}?${params}`);
  },

  /**
   * Update behavior event
   */
  async update(
    eventId: number,
    payload: BehaviorEventUpdatePayload
  ): Promise<ApiResponse<BehaviorEvent>> {
    return apiFetch<BehaviorEvent>(`/behavior/${eventId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Delete behavior event
   */
  async delete(eventId: number): Promise<ApiResponse<void>> {
    return apiFetch<void>(`/behavior/${eventId}`, {
      method: "DELETE",
    });
  },
};

// ==================== Risk Assessment API ====================

export const RiskAPI = {
  /**
   * Calculate risk score for a student
   */
  async calculateRisk(
    studentId: number,
    daysLookback = 30
  ): Promise<ApiResponse<RiskScore>> {
    const params = new URLSearchParams({ days_lookback: String(daysLookback) });
    return apiFetch<RiskScore>(`/risk/calculate/${studentId}?${params}`);
  },

  /**
   * Get all high-risk students
   */
  async getHighRiskStudents(
    threshold: "high" | "critical" = "high"
  ): Promise<ApiResponse<RiskScore[]>> {
    const params = new URLSearchParams({ threshold });
    return apiFetch<RiskScore[]>(`/risk/high-risk?${params}`);
  },
};

// ==================== Health Check API ====================

export interface HealthStatus {
  status: string;
  timestamp: string;
  version: string;
}

export const HealthAPI = {
  /**
   * Check if backend is healthy
   */
  async checkHealth(): Promise<ApiResponse<HealthStatus>> {
    return apiFetch<HealthStatus>("/health");
  },

  /**
   * Check if backend is ready
   */
  async checkReady(): Promise<ApiResponse<any>> {
    return apiFetch("/health/ready");
  },

  /**
   * Check if backend is alive
   */
  async checkLive(): Promise<ApiResponse<any>> {
    return apiFetch("/health/live");
  },
};

// ==================== Batch Operations ====================

export const BatchAPI = {
  /**
   * Sync attendance records for multiple students
   */
  async syncAttendance(records: AttendanceCreatePayload[]): Promise<ApiResponse<void>> {
    // This would require a batch endpoint on the backend
    // For now, we'll create individual records
    const results = await Promise.all(
      records.map((record) => AttendanceAPI.create(record))
    );
    const hasErrors = results.some((r) => r.error);
    if (hasErrors) {
      return {
        error: { detail: "Some records failed to sync" },
        status: 400,
      };
    }
    return { status: 200 };
  },

  /**
   * Sync behavior events for multiple students
   */
  async syncBehaviors(events: BehaviorEventCreatePayload[]): Promise<ApiResponse<void>> {
    const results = await Promise.all(
      events.map((event) => BehaviorAPI.create(event))
    );
    const hasErrors = results.some((r) => r.error);
    if (hasErrors) {
      return {
        error: { detail: "Some events failed to sync" },
        status: 400,
      };
    }
    return { status: 200 };
  },
};

// ==================== Default Export ====================

export default {
  Student: StudentAPI,
  Dashboard: DashboardAPI,
  Attendance: AttendanceAPI,
  Behavior: BehaviorAPI,
  Risk: RiskAPI,
  Health: HealthAPI,
  Batch: BatchAPI,
};
