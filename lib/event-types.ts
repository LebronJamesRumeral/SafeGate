export function humanizeEventType(type?: string) {
  if (!type) return '';
  if (type === 'parent_report') return 'Parent weekly check-in';
  const spaced = String(type).replaceAll('_', ' ');
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
}
