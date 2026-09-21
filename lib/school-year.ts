import { formatLocalDateKey } from '@/lib/utils';

export type SchoolYear = {
  id?: number;
  label: string;
  start_date: string;
  end_date: string;
  is_current?: boolean;
};

export function schoolYearLabel(year: Pick<SchoolYear, 'label' | 'start_date' | 'end_date'>) {
  if (year.label) return year.label;
  return `${year.start_date.slice(0, 4)}-${year.end_date.slice(0, 4)}`;
}

export function getSchoolYearForDate(years: SchoolYear[], date = formatLocalDateKey(new Date())) {
  return years.find((year) => year.start_date <= date && date <= year.end_date)
    || years.find((year) => year.is_current)
    || [...years].sort((a, b) => b.start_date.localeCompare(a.start_date))[0]
    || null;
}

export function clampDateRange(start: string, end: string, year: SchoolYear) {
  const normalizedStart = start > end ? end : start;
  const normalizedEnd = start > end ? start : end;
  return {
    start: normalizedStart < year.start_date ? year.start_date : normalizedStart > year.end_date ? year.end_date : normalizedStart,
    end: normalizedEnd > year.end_date ? year.end_date : normalizedEnd < year.start_date ? year.start_date : normalizedEnd,
  };
}