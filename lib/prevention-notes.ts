type PreventionContext = {
  eventType?: string | null;
  severity?: string | null;
  guidanceStatus?: 'approved_for_ml' | 'denied_by_guidance' | 'pending_guidance' | null;
};

export function buildEarlyPreventionNote(context: PreventionContext): string {
  const eventType = String(context.eventType || '').toLowerCase();
  const severity = String(context.severity || '').toLowerCase();
  const guidanceStatus = context.guidanceStatus || null;

  if (guidanceStatus === 'approved_for_ml') {
    return 'Set a student support check-in within 48 hours, document interventions, and monitor progress for the next 2 weeks.';
  }

  if (guidanceStatus === 'denied_by_guidance') {
    return 'Continue classroom observation, reinforce positive behavior routines, and re-log immediately if the pattern repeats.';
  }

  if (eventType.includes('bully') || eventType.includes('fight') || severity.includes('critical')) {
    return 'Prioritize immediate counselor and teacher coordination, separate triggers, and schedule a guardian readiness call.';
  }

  if (eventType.includes('absent') || eventType.includes('late') || eventType.includes('attendance')) {
    return 'Start a 1-week attendance watchlist, identify daily barriers early, and perform same-day teacher follow-up when needed.';
  }

  if (severity.includes('major') || severity.includes('high') || severity.includes('severe')) {
    return 'Run a teacher-guidance check-in within 24 hours and agree on one preventive strategy for the next school day.';
  }

  if (severity.includes('minor') || severity.includes('medium') || severity.includes('moderate')) {
    return 'Record likely triggers now, align teacher feedback, and apply a short daily reinforcement plan for this week.';
  }

  if (severity.includes('positive')) {
    return 'Reinforce this positive behavior consistently and share the same support strategy across teachers to sustain momentum.';
  }

  return 'Coordinate an early teacher-guidance check-in and keep close observation notes for proactive intervention.';
}
