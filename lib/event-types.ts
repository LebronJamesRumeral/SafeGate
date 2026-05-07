export function humanizeEventType(type?: string) {
  if (!type) return '';
  if (type === 'parent_report') return 'Parent weekly check-in';
  const spaced = String(type).replaceAll('_', ' ');
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatReporterLabel(event: { event_type?: string; reported_by?: string | null }) {
  if ((event.event_type || '').toLowerCase() === 'parent_report') {
    return 'Parent';
  }

  const reporter = (event.reported_by || '').trim();
  if (!reporter) return '';

  const readable = reporter.includes('@') ? reporter.split('@')[0] : reporter;
  const cleaned = readable.replace(/[._-]+/g, ' ').trim();
  if (!cleaned) return 'Reporter';

  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}
