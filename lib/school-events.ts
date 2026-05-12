import { supabase } from '@/lib/supabase';
import { createRoleNotification } from '@/lib/role-notifications';

export type SchoolEvent = {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  event_date: string;
  end_date: string | null;
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
  image_url?: string | null;
  event_date: string;
  end_date?: string | null;
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
      image_url: input.image_url || null,
      event_date: input.event_date,
      end_date: input.end_date || null,
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
    message: `${event.title} is scheduled from ${event.event_date}${event.end_date && event.end_date !== event.event_date ? ` to ${event.end_date}` : ''}.`,
    targetRoles: ['parent'],
    createdBy: input.created_by || 'system',
    meta: {
      notification_kind: 'school_event_posted',
      event_id: event.id,
      event_title: event.title,
      event_date: event.event_date,
      end_date: event.end_date,
        href: '/parent-announcement',
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
          href: '/parent-announcement',
      },
    });
  }

      await ensurePastSchoolEventDefaultNonResponses(sourceEvents);
}

    async function ensurePastSchoolEventDefaultNonResponses(events?: SchoolEvent[]): Promise<void> {
      if (!supabase) return;

      const sourceEvents = events || (await fetchActiveSchoolEvents());
      if (sourceEvents.length === 0) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const pastEvents = sourceEvents.filter((event) => {
        const eventDate = new Date(`${event.event_date}T00:00:00`);
        return !Number.isNaN(eventDate.getTime()) && eventDate < today;
      });

      if (pastEvents.length === 0) return;

      const { data: studentRows, error: studentError } = await supabase
        .from('students')
        .select('parent_email, parent_name, name');

      if (studentError) {
        console.error('Failed to fetch student parent roster:', studentError);
        return;
      }

      type ParentRoster = {
        parent_name: string;
        child_names: string[];
      };

      const rosterByEmail = new Map<string, ParentRoster>();

      (studentRows || []).forEach((row: any) => {
        const parentEmail = typeof row?.parent_email === 'string' ? row.parent_email.trim().toLowerCase() : '';
        if (!parentEmail) return;

        const parentName = typeof row?.parent_name === 'string' && row.parent_name.trim() ? row.parent_name.trim() : 'Parent';
        const childName = typeof row?.name === 'string' ? row.name.trim() : '';

        const existing = rosterByEmail.get(parentEmail) || { parent_name: parentName, child_names: [] };
        if (parentName && existing.parent_name === 'Parent') {
          existing.parent_name = parentName;
        }
        if (childName && !existing.child_names.includes(childName)) {
          existing.child_names.push(childName);
        }
        rosterByEmail.set(parentEmail, existing);
      });

      if (rosterByEmail.size === 0) return;

      for (const event of pastEvents) {
        const eventDate = new Date(`${event.event_date}T00:00:00`);
        if (Number.isNaN(eventDate.getTime())) continue;

        const [joinResult, notJoinResult] = await Promise.all([
          supabase
            .from('role_notifications')
            .select('id, meta')
            .contains('meta', {
              notification_kind: 'school_event_join_intent',
              event_id: event.id,
            })
            .limit(1000),
          supabase
            .from('role_notifications')
            .select('id, meta')
            .contains('meta', {
              notification_kind: 'school_event_will_not_join_intent',
              event_id: event.id,
            })
            .limit(1000),
        ]);

        if (joinResult.error) {
          console.error('Failed to load existing join intents:', joinResult.error);
          continue;
        }

        if (notJoinResult.error) {
          console.error('Failed to load existing not-join intents:', notJoinResult.error);
          continue;
        }

        const respondedEmails = new Set<string>();
        [...(joinResult.data || []), ...(notJoinResult.data || [])].forEach((row: any) => {
          const parentEmail = typeof row?.meta?.parent_email === 'string' ? row.meta.parent_email.trim().toLowerCase() : '';
          if (parentEmail) respondedEmails.add(parentEmail);
        });

        for (const [parentEmail, roster] of rosterByEmail.entries()) {
          if (respondedEmails.has(parentEmail)) {
            continue;
          }

          const childNames = roster.child_names;
          const childSummary =
            childNames.length === 0
              ? 'their child'
              : childNames.length === 1
                ? childNames[0]
                : `${childNames.length} children`;

          const success = await createRoleNotification({
            title: 'Parent Event Non-Attendance Notice',
            message: `${roster.parent_name} notified ${childSummary} will not join "${event.title}" on ${event.event_date}.`,
            targetRoles: ['parent', `parent:${parentEmail}`],
            createdBy: 'system',
            meta: {
              notification_kind: 'school_event_will_not_join_intent',
              event_id: event.id,
              event_title: event.title,
              event_date: event.event_date,
              parent_name: roster.parent_name,
              parent_email: parentEmail,
              selected_children: childNames,
              selected_children_names: childNames.join(', '),
              href: '/events',
            },
          });

          if (!success) {
            console.error('Failed to create default will-not-join notification for', parentEmail, event.id);
          }
        }
      }
    }
