import { supabase } from '@/lib/supabase';

export type SupportedRole = 'teacher' | 'admin' | 'guidance';

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

type CreateRoleNotificationInput = {
  title: string;
  message: string;
  targetRoles: SupportedRole[];
  createdBy?: string | null;
  relatedEventId?: number | null;
  meta?: Record<string, any>;
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
  if (!supabase) {
    return false;
  }

  const { error } = await supabase.from('role_notifications').insert([
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

export async function fetchRoleNotifications(
  role: string,
  limit = 20,
  viewer?: FetchNotificationViewer
): Promise<RoleNotification[]> {
  if (!supabase || !role) {
    return [];
  }

  const normalizedRole = role.toLowerCase();
  const { data, error } = await supabase
    .from('role_notifications')
    .select('id, title, message, target_roles, read_by_roles, created_by, related_event_id, meta, created_at')
    .contains('target_roles', [normalizedRole])
    .order('created_at', { ascending: false })
    .limit(limit);

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
  if (!supabase || !role || notifications.length === 0) {
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
      const { error } = await supabase
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
