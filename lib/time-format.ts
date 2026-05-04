function formatTimeParts(hour: number, minute: number): string {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function parseTimeString(raw: string): { hour: number; minute: number } | null {
  const normalized = raw.replace(/\./g, ':').trim();
  const parts = normalized.split(':');

  if (parts.length < 2) {
    return null;
  }

  const hour = Number(parts[0]);
  const minute = Number(parts[1]);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }

  return { hour, minute };
}

export function formatTime12h(value: string | Date | null | undefined, fallback = '--'): string {
  if (!value) {
    return fallback;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return fallback;
    }

    return formatTimeParts(value.getHours(), value.getMinutes());
  }

  if (value.includes('T') || /\d{4}-\d{2}-\d{2}/.test(value)) {
    const dateValue = new Date(value);
    if (!Number.isNaN(dateValue.getTime())) {
      return formatTimeParts(dateValue.getHours(), dateValue.getMinutes());
    }
  }

  const parsed = parseTimeString(value);
  if (!parsed) {
    return fallback;
  }

  return formatTimeParts(parsed.hour, parsed.minute);
}