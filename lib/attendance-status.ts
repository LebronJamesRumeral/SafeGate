export const HALF_DAY_CANCELLATION_STATUSES = new Set(['cancelled_morning', 'cancelled_afternoon']);

export function isHolidayStatus(status?: string | null) {
  return String(status || '').trim().toLowerCase() === 'holiday';
}

export function isCancellationStatus(status?: string | null) {
  const normalizedStatus = String(status || '').trim().toLowerCase();
  return normalizedStatus === 'cancelled_class' || HALF_DAY_CANCELLATION_STATUSES.has(normalizedStatus);
}

export function isNoClassStatus(status?: string | null) {
  return isHolidayStatus(status) || isCancellationStatus(status);
}

export function getAttendanceStatusLabel(status?: string | null) {
  const normalizedStatus = String(status || '').trim().toLowerCase();
  if (normalizedStatus === 'cancelled_morning') return 'Cancelled Morning';
  if (normalizedStatus === 'cancelled_afternoon') return 'Cancelled Afternoon';
  if (normalizedStatus === 'holiday') return 'Holiday';
  if (normalizedStatus === 'cancelled_class') return 'Cancelled';
  return normalizedStatus ? normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1) : 'Unknown';
}

export function isSyntheticCancellationRecord(record: {
  attendance_status?: string | null;
  cancellation_status?: string | null;
  is_present?: boolean | null;
  check_in_temperature?: number | null;
  check_in_time?: string | null;
}) {
  const cancellationStatus = String(record.cancellation_status || record.attendance_status || '').trim().toLowerCase();
  const checkInTime = String(record.check_in_time || '');
  const timePart = checkInTime.includes('T') ? checkInTime.split('T')[1] : checkInTime.split(' ')[1];
  return record.is_present === false
    && HALF_DAY_CANCELLATION_STATUSES.has(cancellationStatus)
    && record.check_in_temperature == null
    && String(timePart || '').startsWith('00:00:00');
}