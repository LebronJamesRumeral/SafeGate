// Only these levels are considered current students and imported
const YEAR_LEVEL_OPTIONS = [
  'Toddler & Nursery',
  'Pre-K',
  'Kinder 1',
  'Kinder 2',
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
];
export type ImportableStudentRow = {
  lrn: string;
  name: string;
  gender: string;
  birthday: string;
  address: string | null;
  level: string;
  parent_name: string;
  parent_contact: string;
  parent_email: string;
  status: string;
  substatus?: string;
  updated_at: string;
};

export type StudentImportParseResult = {
  rows: ImportableStudentRow[];
  skippedEmpty: number;
  skippedMissingRequired: number;
};

const REQUIRED_FIELDS = ['student name', 'parent name', 'parent contact', 'parent email'];

const FIELD_ALIASES: Record<string, string[]> = {
  lrn: ['lrn', 'learner reference number', 'student id', 'studentid', 'id number', 'id no'],
  name: ['name', 'student name', 'full name', 'learner name'],
  gender: ['gender', 'sex'],
  birthday: ['birthday', 'birth date', 'date of birth', 'dob'],
  level: ['level', 'grade', 'year level', 'class', 'grade level'],
  address: ['address', 'home address', 'residence'],
  parent_name: ['parent name', 'guardian name', 'parent/guardian', 'parent guardian', 'guardian'],
  parent_contact: ['parent contact', 'parent phone', 'guardian contact', 'contact', 'contact number', 'mobile', 'phone'],
  parent_email: ['parent email', 'guardian email', 'email', 'e-mail'],
  status: ['status', 'enrollment status'],
};

function normalizeHeader(input: string): string {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function asString(value: unknown): string {
  return value == null ? '' : String(value).trim();
}

function normalizeStatus(value: string): string {
  const normalized = value.toLowerCase();
  if (normalized === 'inactive' || normalized === 'graduated') return normalized;
  return 'active';
}

function excelSerialToDate(value: number): string {
  const excelEpoch = Date.UTC(1899, 11, 30);
  const date = new Date(excelEpoch + value * 86400000);
  return date.toISOString().split('T')[0];
}

function normalizeBirthday(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().split('T')[0];
  }

  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return excelSerialToDate(value);
  }

  const raw = asString(value);
  if (!raw) return '2015-01-01';

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return '2015-01-01';
}

function buildNormalizedRowMap(row: Record<string, unknown>): Record<string, unknown> {
  const normalizedMap: Record<string, unknown> = {};
  Object.entries(row).forEach(([key, value]) => {
    const normalizedKey = normalizeHeader(key);
    if (normalizedKey && normalizedMap[normalizedKey] === undefined) {
      normalizedMap[normalizedKey] = value;
    }
  });
  return normalizedMap;
}

function pickValue(rowMap: Record<string, unknown>, aliases: string[]): string {
  for (const alias of aliases) {
    const key = normalizeHeader(alias);
    const value = rowMap[key];
    const text = asString(value);
    if (text) return text;
  }
  return '';
}

function isRowEmpty(rowMap: Record<string, unknown>): boolean {
  return Object.values(rowMap).every((value) => asString(value) === '');
}

function generateImportedLrn(name: string, rowIndex: number): string {
  const compactName = name.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase() || 'STUDENT';
  const timestamp = Date.now().toString().slice(-6);
  return `IMP-${compactName}-${timestamp}-${String(rowIndex + 1).padStart(3, '0')}`;
}

export function getStudentImportRequiredFieldsHint(): string {
  return REQUIRED_FIELDS.join(', ');
}

export function parseStudentImportRows(rawRows: Record<string, unknown>[]): StudentImportParseResult {
  const rows: ImportableStudentRow[] = [];
  let skippedEmpty = 0;
  let skippedMissingRequired = 0;

  rawRows.forEach((row, index) => {
    const rowMap = buildNormalizedRowMap(row);

    if (isRowEmpty(rowMap)) {
      skippedEmpty += 1;
      return;
    }

    const name = pickValue(rowMap, FIELD_ALIASES.name);
    const parentName = pickValue(rowMap, FIELD_ALIASES.parent_name);
    const parentContact = pickValue(rowMap, FIELD_ALIASES.parent_contact);
    const parentEmail = pickValue(rowMap, FIELD_ALIASES.parent_email);

    if (!name || !parentName || !parentContact || !parentEmail) {
      skippedMissingRequired += 1;
      return;
    }

    const gender = pickValue(rowMap, FIELD_ALIASES.gender) || 'Unspecified';
    const level = pickValue(rowMap, FIELD_ALIASES.level) || 'Grade 1';
    const address = pickValue(rowMap, FIELD_ALIASES.address) || null;
    const status = normalizeStatus(pickValue(rowMap, FIELD_ALIASES.status) || 'active');
    const lrn = pickValue(rowMap, FIELD_ALIASES.lrn) || generateImportedLrn(name, index);
    const birthdaySource = rowMap[normalizeHeader(FIELD_ALIASES.birthday[0])] ?? pickValue(rowMap, FIELD_ALIASES.birthday);
    const birthday = normalizeBirthday(birthdaySource);

    // Save all students, but if their level is not in YEAR_LEVEL_OPTIONS, set status/substatus accordingly
    if (YEAR_LEVEL_OPTIONS.includes(level)) {
      rows.push({
        lrn,
        name,
        gender,
        birthday,
        address,
        level,
        parent_name: parentName,
        parent_contact: parentContact,
        parent_email: parentEmail,
        status,
        updated_at: new Date().toISOString(),
      });
    } else {
      rows.push({
        lrn,
        name,
        gender,
        birthday,
        address,
        level,
        parent_name: parentName,
        parent_contact: parentContact,
        parent_email: parentEmail,
        status: 'inactive',
        substatus: 'undergrad',
        updated_at: new Date().toISOString(),
      });
    }
  });

  return {
    rows,
    skippedEmpty,
    skippedMissingRequired,
  };
}
