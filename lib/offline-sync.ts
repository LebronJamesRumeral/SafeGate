import {
  type AttendanceScanPayload,
  type BehaviorEventPayload,
  flushOfflineQueue,
  queueOfflineItem,
  requestBackgroundSync,
} from '@/lib/offline-secure-queue';

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
  const scanDate = payload.scanned_at.split('T')[0];

  const { data: existing, error: existingError } = await supabase
    .from('attendance_logs')
    .select('id, check_in_time, check_out_time')
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
          date: scanDate,
        },
      ]);

    if (error) {
      throw new Error(error.message || 'Failed inserting attendance check-in.');
    }
    return;
  }

  const latest = existing[0];
  if (latest.check_out_time) {
    return;
  }

  const { error: updateError } = await supabase
    .from('attendance_logs')
    .update({ check_out_time: payload.scanned_at })
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
