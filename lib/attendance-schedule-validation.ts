/**
 * Attendance Schedule Validation Utility
 * 
 * Handles:
 * - Checking if a date is a school day
 * - Validating attendance status based on schedule
 * - Marking attendance as present, late, or invalid timeout
 */

import { supabase } from './supabase';

export interface StudentSchedule {
  id: number;
  student_lrn: string;
  year_level: string;
  entry_time: string;  // HH:MM:SS
  exit_time: string;   // HH:MM:SS
  school_days: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  grace_period_minutes: number;
  is_active: boolean;
}

type StudentScheduleRow = {
  day_of_week: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

export interface AttendanceValidation {
  attendance_status: 'present' | 'late' | 'absent' | 'invalid_timeout';
  is_late: boolean;
  is_invalid_timeout: boolean;
  minutes_early: number;
  minutes_overtime: number;
  status_reason: string;
}

function normalizeTimeString(timeStr: string): string {
  if (!timeStr) return '00:00:00';
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    return `${parts[0]}:${parts[1]}:00`;
  }
  return timeStr;
}

function emptySchoolDays() {
  return {
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
  };
}

function dayKeyFromLabel(day: string): keyof ReturnType<typeof emptySchoolDays> | null {
  const normalized = day.trim().toLowerCase();
  const map: Record<string, keyof ReturnType<typeof emptySchoolDays>> = {
    monday: 'monday',
    tuesday: 'tuesday',
    wednesday: 'wednesday',
    thursday: 'thursday',
    friday: 'friday',
    saturday: 'saturday',
    sunday: 'sunday',
  };
  return map[normalized] ?? null;
}

async function getScheduleFromStudentSchedules(studentLrn: string): Promise<StudentSchedule | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('student_schedules')
    .select('day_of_week, start_time, end_time, is_active')
    .eq('student_lrn', studentLrn)
    .eq('is_active', true);

  if (error || !data || data.length === 0) {
    return null;
  }

  const rows = data as StudentScheduleRow[];
  const schoolDays = emptySchoolDays();
  const dayWindows: Record<string, { start: number; end: number; startRaw: string; endRaw: string }> = {};

  for (const row of rows) {
    const dayKey = dayKeyFromLabel(row.day_of_week);
    if (!dayKey) continue;

    schoolDays[dayKey] = true;
    const start = timeToMinutes(normalizeTimeString(row.start_time));
    const end = timeToMinutes(normalizeTimeString(row.end_time));

    if (!dayWindows[dayKey]) {
      dayWindows[dayKey] = {
        start,
        end,
        startRaw: normalizeTimeString(row.start_time),
        endRaw: normalizeTimeString(row.end_time),
      };
      continue;
    }

    if (start < dayWindows[dayKey].start) {
      dayWindows[dayKey].start = start;
      dayWindows[dayKey].startRaw = normalizeTimeString(row.start_time);
    }

    if (end > dayWindows[dayKey].end) {
      dayWindows[dayKey].end = end;
      dayWindows[dayKey].endRaw = normalizeTimeString(row.end_time);
    }
  }

  const todayKey = getDayName(new Date());
  const todayWindow = dayWindows[todayKey];
  const fallbackWindow = Object.values(dayWindows)[0];
  const selectedWindow = todayWindow ?? fallbackWindow;

  if (!selectedWindow) return null;

  return {
    id: 0,
    student_lrn: studentLrn,
    year_level: '',
    entry_time: selectedWindow.startRaw,
    exit_time: selectedWindow.endRaw,
    school_days: schoolDays,
    grace_period_minutes: 10,
    is_active: true,
  };
}

/**
 * Get student's current attendance schedule
 */
export async function getStudentSchedule(studentLrn: string): Promise<StudentSchedule | null> {
  try {
    if (!supabase) return null;

    // Keep scan logic aligned with what the Student Schedule tab shows.
    const scheduleFromClasses = await getScheduleFromStudentSchedules(studentLrn);
    if (scheduleFromClasses) {
      return scheduleFromClasses;
    }

    const { data, error } = await supabase
      .from('student_attendance_schedules')
      .select('*')
      .eq('student_lrn', studentLrn)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching student schedule:', error);
      return null;
    }

    return data as StudentSchedule;
  } catch (error) {
    console.error('Error in getStudentSchedule:', error);
    return null;
  }
}

/**
 * Check if a date is a school day for the student
 */
export function isSchoolDay(
  schedule: StudentSchedule,
  date: Date
): boolean {
  if (!schedule) return false;

  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const dayMap: { [key: string]: keyof typeof schedule.school_days } = {
    'sunday': 'sunday',
    'monday': 'monday',
    'tuesday': 'tuesday',
    'wednesday': 'wednesday',
    'thursday': 'thursday',
    'friday': 'friday',
    'saturday': 'saturday',
  };

  const key = dayMap[dayName];
  return key ? schedule.school_days[key] : false;
}

/**
 * Parse time string (HH:MM:SS) into minutes since midnight
 */
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Get day name from date (e.g., 'monday', 'tuesday')
 */
function getDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
}

/**
 * Validate attendance status based on student's schedule
 */
export function validateAttendanceStatus(
  schedule: StudentSchedule,
  checkInTime: Date,
  checkOutTime?: Date
): AttendanceValidation {
  if (!schedule) {
    return {
      attendance_status: 'absent',
      is_late: false,
      is_invalid_timeout: false,
      minutes_early: 0,
      minutes_overtime: 0,
      status_reason: 'No schedule found',
    };
  }

  // Check if it's a school day
  if (!isSchoolDay(schedule, checkInTime)) {
    return {
      attendance_status: 'absent',
      is_late: false,
      is_invalid_timeout: false,
      minutes_early: 0,
      minutes_overtime: 0,
      status_reason: 'Not a school day',
    };
  }

  // Get scheduled times in minutes
  const scheduledEntry = timeToMinutes(schedule.entry_time);
  const scheduledExit = timeToMinutes(schedule.exit_time);
  const graceperiod = (schedule.grace_period_minutes ?? 0) > 0 ? schedule.grace_period_minutes : 10;

  // Get check-in time in minutes
  const checkInMinutes = checkInTime.getHours() * 60 + checkInTime.getMinutes();
  const minutesEarlyOrLate = checkInMinutes - scheduledEntry;

  let attendanceStatus: AttendanceValidation['attendance_status'] = 'present';
  let isLate = false;
  let isInvalidTimeout = false;
  let statusReason = 'On time';

  // Check if late
  if (minutesEarlyOrLate > graceperiod) {
    isLate = true;
    attendanceStatus = 'late';
    statusReason = `Late by ${minutesEarlyOrLate - graceperiod} minutes`;
  }

  // Check invalid timeout if check-out time provided
  let minutesOvertime = 0;

  if (checkOutTime) {
    const checkOutMinutes = checkOutTime.getHours() * 60 + checkOutTime.getMinutes();
    minutesOvertime = checkOutMinutes - scheduledExit;

    if (minutesOvertime > 0) {
      isInvalidTimeout = true;
      attendanceStatus = 'invalid_timeout';
      statusReason = `Invalid timeout: ${minutesOvertime} minutes after ${schedule.exit_time}`;
    }
  }

  return {
    attendance_status: attendanceStatus,
    is_late: isLate,
    is_invalid_timeout: isInvalidTimeout,
    minutes_early: minutesEarlyOrLate,
    minutes_overtime: minutesOvertime,
    status_reason: statusReason,
  };
}

/**
 * Get human-readable attendance status with emoji
 */
export function getAttendanceStatusDisplay(
  validation: AttendanceValidation
): { text: string; icon: string; color: string } {
  const statusMap = {
    present: { text: 'Present', icon: '✓', color: 'green' },
    late: { text: 'Late', icon: '⏰', color: 'yellow' },
    absent: { text: 'Absent', icon: '✗', color: 'red' },
    invalid_timeout: { text: 'Invalid Timeout', icon: '⚠', color: 'orange' },
  };

  return statusMap[validation.attendance_status] || statusMap.absent;
}

/**
 * Get summary of student's attendance by status
 */
export async function getAttendanceSummary(
  studentLrn: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  total_days: number;
  present: number;
  late: number;
  absent: number;
  invalid_timeout: number;
} | null> {
  try {
    if (!supabase) return null;

    let query = supabase
      .from('attendance_logs')
      .select('attendance_status', { count: 'exact' })
      .eq('student_lrn', studentLrn);

    if (startDate) {
      const startStr = startDate.toISOString().split('T')[0];
      query = query.gte('date', startStr);
    }

    if (endDate) {
      const endStr = endDate.toISOString().split('T')[0];
      query = query.lte('date', endStr);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching attendance summary:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return {
        total_days: 0,
        present: 0,
        late: 0,
        absent: 0,
        invalid_timeout: 0,
      };
    }

    // The above query won't work as expected for counts by status
    // We need to get all records and count them
    const { data: allRecords, error: allError } = await supabase
      .from('attendance_logs')
      .select('attendance_status')
      .eq('student_lrn', studentLrn);

    if (allError || !allRecords) {
      return null;
    }

    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let invalidTimeoutCount = 0;

    for (const record of allRecords) {
      const status = record.attendance_status;
      if (status === 'present') presentCount++;
      else if (status === 'late') lateCount++;
      else if (status === 'absent') absentCount++;
      else if (status === 'invalid_timeout') invalidTimeoutCount++;
    }

    return {
      total_days: allRecords.length,
      present: presentCount,
      late: lateCount,
      absent: absentCount,
      invalid_timeout: invalidTimeoutCount,
    };
  } catch (error) {
    console.error('Error in getAttendanceSummary:', error);
    return null;
  }
}
