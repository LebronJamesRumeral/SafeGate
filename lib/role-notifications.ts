import { supabase } from '@/lib/supabase';

export type SupportedRole = 'teacher' | 'admin' | 'guidance' | 'parent';

export type RoleNotification = {
  id: number;
  title: string;
  message: string;
  target_roles: string[];
  read_by_roles: string[];
  created_by: string | null;
  related_event_id: number | null;
  meta: Record<string, any> | null;
  created_at: string;
};

export function resolveRoleNotificationHref(notification: RoleNotification, role?: string): string {
  const buildHref = (basePath: string, params?: Record<string, string | number | null | undefined>): string => {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      const normalized = String(value).trim();
      if (!normalized) return;
      query.set(key, normalized);
    });

    const queryString = query.toString();
    return queryString ? `${basePath}?${queryString}` : basePath;
  };

  const normalizedRole = (role || '').toLowerCase();
  const notificationMeta = notification.meta || {};
  const notificationKind =
    typeof notificationMeta.notification_kind === 'string'
      ? notificationMeta.notification_kind.toLowerCase()
      : '';
  const normalizedTitle = notification.title.toLowerCase();
  const explicitHref = typeof notificationMeta.href === 'string' ? notificationMeta.href.trim() : '';
  const eventId =
    typeof notificationMeta.event_id === 'number'
      ? notificationMeta.event_id
      : typeof notification.related_event_id === 'number'
      ? notification.related_event_id
      : undefined;
  const studentLrn =
    typeof notificationMeta.student_lrn === 'string' ? notificationMeta.student_lrn : undefined;
  const excuseDate =
    typeof notificationMeta.excuse_date === 'string' ? notificationMeta.excuse_date : undefined;

  if (explicitHref) {
    const hasQuery = explicitHref.includes('?');
    if (hasQuery) return explicitHref;
  }

  if (notificationKind === 'weekly_check_in_reminder') return '/parent-behavior';
  if (notificationKind === 'school_event_posted' || notificationKind === 'school_event_reminder') return '/parent-events';
  if (notificationKind === 'class_cancellation') return '/parent-attendance';
  if (notificationKind === 'parent_excuse_letter') {
    return buildHref('/students', {
      notification: 'parent_excuse_letter',
      studentLrn,
      excuseDate,
    });
  }
  if (notificationKind === 'school_event_join_intent') {
    return buildHref('/events', {
      notification: 'school_event_join_intent',
      eventId,
    });
  }

  if (normalizedTitle.includes('new log for guidance review')) {
    return buildHref('/guidance-review', {
      notification: 'new_guidance_log',
      eventId,
      studentLrn,
    });
  }
  if (normalizedTitle.includes('log reviewed by guidance')) {
    return normalizedRole === 'parent'
      ? '/parent-behavior'
      : buildHref('/behavioral-events', {
          notification: 'guidance_reviewed_log',
          eventId,
          studentLrn,
        });
  }
  if (normalizedTitle.includes('parent event attendance confirmation')) {
    return buildHref('/events', {
      notification: 'school_event_join_intent',
      eventId,
    });
  }
  if (normalizedTitle.includes('parent excuse letter')) {
    return buildHref('/students', {
      notification: 'parent_excuse_letter',
      studentLrn,
      excuseDate,
    });
  }

  if (explicitHref) return explicitHref;
  if (normalizedRole === 'parent') return '/parent';
  if (normalizedRole === 'guidance') return '/guidance-review';
  return '/';
}

export type CreateRoleNotificationInput = {
  title: string;
  message: string;
  targetRoles: string[];
  createdBy?: string | null;
  relatedEventId?: number | null;
  meta?: Record<string, any> | null;
};


type FetchNotificationViewer = {
  id?: string | null;
  username?: string | null;
  fullName?: string | null;
  email?: string | null;
};

function normalizeIdentity(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function buildViewerIdentities(viewer?: FetchNotificationViewer): Set<string> {
  const values = [viewer?.id, viewer?.username, viewer?.fullName, viewer?.email]
    .map(normalizeIdentity)
    .filter(Boolean);

  return new Set(values);
}

function extractNotificationOwnerIdentities(meta: Record<string, any> | null): Set<string> {
  if (!meta || typeof meta !== 'object') {
    return new Set();
  }

  const values = [
    meta.report_owner_id,
    meta.report_owner_username,
    meta.report_owner_email,
    meta.report_owner_name,
    meta.reported_by,
  ]
    .map(normalizeIdentity)
    .filter(Boolean);

  return new Set(values);
}

export async function createRoleNotification(input: CreateRoleNotificationInput): Promise<boolean> {
  const db = supabase as NonNullable<typeof supabase>;
  if (!db) {
    return false;
  }

  const { error } = await db.from('role_notifications').insert([
    {
      title: input.title,
      message: input.message,
      target_roles: input.targetRoles,
      created_by: input.createdBy || null,
      related_event_id: input.relatedEventId ?? null,
      meta: input.meta || {},
    },
  ]);

  if (error) {
    console.error('Failed to create role notification:', error);
    return false;
  }

  return true;
}

function getFridayReminderKey(date = new Date()): string | null {
  if (date.getDay() !== 5) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

export async function ensureFridayParentWeeklyCheckInNotification(viewer?: FetchNotificationViewer): Promise<boolean> {
  const db = supabase as NonNullable<typeof supabase>;
  if (!db || !viewer?.email) {
    return false;
  }

  const reminderKey = getFridayReminderKey();
  if (!reminderKey) {
    return false;
  }

  const normalizedEmail = viewer.email.trim().toLowerCase();
  const parentIdentity = `parent:${normalizedEmail}`;

  const { data: existing, error: existingError } = await db
    .from('role_notifications')
    .select('id')
    .or(`target_roles.cs.{parent},target_roles.cs.{${parentIdentity}}`)
    .contains('meta', {
      notification_kind: 'weekly_check_in_reminder',
      reminder_key: reminderKey,
      parent_email: normalizedEmail,
    })
    .limit(1);

  if (existingError) {
    console.error('Failed to check Friday parent reminder:', existingError);
    return false;
  }

  if ((existing || []).length > 0) {
    return false;
  }

  return createRoleNotification({
    title: 'Weekly Check-In Reminder',
    message: 'Please complete this week\'s parent weekly check-in before the school week ends.',
    targetRoles: ['parent', parentIdentity],
    createdBy: 'system',
    meta: {
      notification_kind: 'weekly_check_in_reminder',
      reminder_key: reminderKey,
      parent_email: normalizedEmail,
      href: '/parent-behavior',
    },
  });
}

export async function fetchRoleNotifications(
  role: string,
  limit = 20,
  viewer?: FetchNotificationViewer
): Promise<RoleNotification[]> {
  const db = supabase as NonNullable<typeof supabase>;
  if (!db || !role) {
    return [];
  }

  const normalizedRole = role.toLowerCase();
  let data, error;
  if (normalizedRole === 'parent' && viewer?.email) {
    // Fetch notifications for parent role and specific parent identity
    const parentIdentity = `parent:${viewer.email.trim().toLowerCase()}`;
    ({ data, error } = await db
      .from('role_notifications')
      .select('id, title, message, target_roles, read_by_roles, created_by, related_event_id, meta, created_at')
      .or(`target_roles.cs.{parent},target_roles.cs.{${parentIdentity}}`)
      .order('created_at', { ascending: false })
      .limit(limit));
  } else {
    ({ data, error } = await db
      .from('role_notifications')
      .select('id, title, message, target_roles, read_by_roles, created_by, related_event_id, meta, created_at')
      .contains('target_roles', [normalizedRole])
      .order('created_at', { ascending: false })
      .limit(limit));
  }

  if (error) {
    console.error('Failed to fetch role notifications:', error);
    return [];
  }

  const notifications = (data || []) as RoleNotification[];
  if (normalizedRole === 'guidance') {
    return notifications;
  }

  const viewerIdentities = buildViewerIdentities(viewer);
  if (viewerIdentities.size === 0) {
    return [];
  }

  return notifications.filter((item) => {
    if (item.title !== 'Log Reviewed By Guidance') {
      return true;
    }

    const ownerIdentities = extractNotificationOwnerIdentities(item.meta || null);
    if (ownerIdentities.size === 0) {
      return false;
    }

    for (const identity of ownerIdentities) {
      if (viewerIdentities.has(identity)) {
        return true;
      }
    }

    return false;
  });
}

export async function markRoleNotificationsAsRead(role: string, notifications: RoleNotification[]): Promise<void> {
  const db = supabase as NonNullable<typeof supabase>;
  if (!db || !role || notifications.length === 0) {
    return;
  }

  const normalizedRole = role.toLowerCase();
  const unreadNotifications = notifications.filter((item) => !(item.read_by_roles || []).includes(normalizedRole));

  if (unreadNotifications.length === 0) {
    return;
  }

  await Promise.all(
    unreadNotifications.map(async (item) => {
      const mergedRoles = Array.from(new Set([...(item.read_by_roles || []), normalizedRole]));
      const { error } = await db
        .from('role_notifications')
        .update({ read_by_roles: mergedRoles })
        .eq('id', item.id);

      if (error) {
        console.error(`Failed to mark notification ${item.id} as read:`, error);
      }
    })
  );
}

export function getUnreadCount(role: string, notifications: RoleNotification[]): number {
  if (!role) {
    return 0;
  }

  const normalizedRole = role.toLowerCase();
  return notifications.filter((item) => !(item.read_by_roles || []).includes(normalizedRole)).length;
}
