import { supabase } from '@/lib/supabase';
import { createRoleNotification } from '@/lib/role-notifications';

export type SchoolEvent = {
  id: number;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  created_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export async function fetchActiveSchoolEvents(): Promise<SchoolEvent[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('school_events')
    .select('*')
    .eq('is_active', true)
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Failed to fetch school events:', error);
    return [];
  }

  return (data || []) as SchoolEvent[];
}

export async function createSchoolEvent(input: {
  title: string;
  description?: string | null;
  event_date: string;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  created_by?: string | null;
}): Promise<SchoolEvent | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('school_events')
    .insert({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      event_date: input.event_date,
      start_time: input.start_time || null,
      end_time: input.end_time || null,
      location: input.location?.trim() || null,
      created_by: input.created_by || null,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    console.error('Failed to create school event:', error);
    return null;
  }

  const event = data as SchoolEvent;
  await createRoleNotification({
    title: 'New School Event Posted',
    message: `${event.title} is scheduled on ${event.event_date}.`,
    targetRoles: ['parent'],
    createdBy: input.created_by || 'system',
    meta: {
      notification_kind: 'school_event_posted',
      event_id: event.id,
      event_title: event.title,
      event_date: event.event_date,
      href: '/parent-events',
    },
  });

  return event;
}

export async function ensureUpcomingSchoolEventReminders(events?: SchoolEvent[]): Promise<void> {
  if (!supabase) return;

  const sourceEvents = events || (await fetchActiveSchoolEvents());
  if (sourceEvents.length === 0) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const oneWeekFromNow = new Date(today);
  oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

  for (const event of sourceEvents) {
    const eventDate = new Date(`${event.event_date}T00:00:00`);
    if (Number.isNaN(eventDate.getTime())) continue;
    if (eventDate < today || eventDate > oneWeekFromNow) continue;

    const reminderKey = `${event.id}:${event.event_date}`;
    const { data: existing, error: existingError } = await supabase
      .from('role_notifications')
      .select('id')
      .contains('meta', {
        notification_kind: 'school_event_reminder',
        reminder_key: reminderKey,
      })
      .limit(1);

    if (existingError) {
      console.error('Failed to check school event reminder:', existingError);
      continue;
    }

    if ((existing || []).length > 0) continue;

    await createRoleNotification({
      title: 'Upcoming School Event Reminder',
      message: `${event.title} is happening on ${event.event_date} (within 7 days).`,
      targetRoles: ['parent'],
      createdBy: 'system',
      meta: {
        notification_kind: 'school_event_reminder',
        reminder_key: reminderKey,
        event_id: event.id,
        event_title: event.title,
        event_date: event.event_date,
        href: '/parent-events',
      },
    });
  }
}
