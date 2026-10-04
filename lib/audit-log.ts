import { supabase } from '@/lib/supabase';

export type AuditActor = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  role: string;
};

export type AuditTarget = Record<string, unknown> | string | number | null;

export async function logAudit(input: {
  actor: AuditActor | null | undefined;
  actionType: string;
  target?: AuditTarget;
}): Promise<void> {
  try {
    if (!supabase || !input.actor?.id || !input.actor.role) return;

    const { error } = await supabase.rpc('log_audit_event', {
      p_actor_id: input.actor.id,
      p_actor_name:
        input.actor.full_name || input.actor.name || input.actor.username || input.actor.email || 'User',
      p_actor_role: input.actor.role,
      p_action_type: input.actionType,
      p_target: input.target ?? {},
    });

    if (error) {
      console.error('Audit logging failed:', error);
    }
  } catch (error) {
    console.error('Audit logging failed:', error);
  }
}