import {
  type AttendanceScanPayload,
  type BehaviorEventPayload,
  flushOfflineQueue,
  queueOfflineItem,
  requestBackgroundSync,
} from '@/lib/offline-secure-queue';
import { formatLocalDateKey } from '@/lib/utils';
import { isSyntheticCancellationRecord } from '@/lib/attendance-status';

type SupabaseClientLike = {
  from: (table: string) => any;
};

export async function queueAttendanceScan(payload: AttendanceScanPayload): Promise<number> {
  const id = await queueOfflineItem('attendance_scan', payload);
  await requestBackgroundSync();
  return id;
}

export async function queueBehaviorEvent(payload: BehaviorEventPayload): Promise<number> {
  const id = await queueOfflineItem('behavior_event', payload);
  await requestBackgroundSync();
  return id;
}

async function applyAttendanceScan(supabase: SupabaseClientLike, payload: AttendanceScanPayload): Promise<void> {
  const scanDate = formatLocalDateKey(new Date(payload.scanned_at));
  const normalizedEarlyOutReason = payload.early_out_reason?.trim();

  const { data: existing, error: existingError } = await supabase
    .from('attendance_logs')
    .select('id, check_in_time, check_in_temperature, check_out_time, attendance_status, cancellation_status, is_present')
    .eq('student_lrn', payload.student_lrn)
    .eq('date', scanDate)
    .order('check_in_time', { ascending: false })
    .limit(1);

  if (existingError) {
    throw new Error(existingError.message || 'Failed reading existing attendance logs.');
  }

  if (!existing || existing.length === 0) {
    const { error } = await supabase
      .from('attendance_logs')
      .insert([
        {
          student_lrn: payload.student_lrn,
          check_in_time: payload.scanned_at,
          check_in_temperature: payload.temperature ?? null,
          date: scanDate,
        },
      ]);

    if (error) {
      throw new Error(error.message || 'Failed inserting attendance check-in.');
    }
    return;
  }

  const latest = existing[0];
  if (isSyntheticCancellationRecord(latest)) {
    const { error: checkInError } = await supabase
      .from('attendance_logs')
      .update({
        check_in_time: payload.scanned_at,
        check_in_temperature: payload.temperature ?? null,
        check_out_time: null,
        is_present: true,
        attendance_status: 'present',
      })
      .eq('id', latest.id);

    if (checkInError) {
      throw new Error(checkInError.message || 'Failed updating half-day check-in.');
    }
    return;
  }

  if (latest.check_out_time) {
    return;
  }

  const { error: updateError } = await supabase
    .from('attendance_logs')
    .update({
      check_out_time: payload.scanned_at,
      check_out_temperature: payload.temperature ?? null,
      is_early_out: Boolean(normalizedEarlyOutReason),
      early_out_reason: normalizedEarlyOutReason || null,
    })
    .eq('id', latest.id);

  if (updateError) {
    throw new Error(updateError.message || 'Failed updating attendance check-out.');
  }
}

async function applyBehaviorEvent(
  supabase: SupabaseClientLike,
  payload: BehaviorEventPayload
): Promise<{ id: number; student_lrn: string } | null> {
  const { error, data } = await supabase
    .from('behavioral_events')
    .insert([payload])
    .select('id, student_lrn')
    .single();

  if (error) {
    throw new Error(error.message || 'Failed inserting behavioral event.');
  }

  return data || null;
}

export async function syncOfflineQueue(
  supabase: SupabaseClientLike,
  options?: {
    onBehaviorEventInserted?: (record: { id: number; student_lrn: string }) => Promise<void>;
  }
): Promise<{ synced: number; failed: number; remaining: number }> {
  return flushOfflineQueue({
    attendance_scan: async (payload) => {
      await applyAttendanceScan(supabase, payload);
    },
    behavior_event: async (payload) => {
      const inserted = await applyBehaviorEvent(supabase, payload);
      if (inserted && options?.onBehaviorEventInserted) {
        await options.onBehaviorEventInserted(inserted);
      }
    },
  });
}
