import { calculateAgeWithDecimal } from '@/lib/age-calculator';

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
  age?: string;
  address: string | null;
  level: string;
  parent_name: string;
  parent_contact: string;
  parent2_name?: string;
  parent2_contact?: string;
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

export type StudentImportDedupResult = {
  rows: ImportableStudentRow[];
  skippedDuplicate: number;
};

const REQUIRED_FIELDS = ['student name'];

const FIELD_ALIASES: Record<string, string[]> = {
  lrn: ['lrn', 'learner reference number', 'student id', 'studentid', 'id number', 'id no'],
  name: ['name', 'student name', 'full name', 'learner name'],
  first_middle_name: ['first middle name', 'first and middle name', 'first name', 'given name', 'firstname'],
  last_name: ['last name', 'family name', 'surname', 'lastname'],
  gender: ['gender', 'sex'],
  birthday: ['birthday', 'birth date', 'date of birth', 'dob'],
  level: ['level', 'grade', 'year level', 'class', 'grade level'],
  address: ['address', 'home address', 'residence'],
  parent_name: ['parent name', 'guardian name', 'parent/guardian', 'parent guardian', 'guardian'],
  parent_contact: ['parent contact', 'parent phone', 'guardian contact', 'contact', 'contact number', 'mobile', 'phone'],
  parent2_name: ['parent2 name', 'parent 2 name', 'second parent', 'second guardian', 'additional parent', 'additional parent name'],
  parent2_contact: ['parent2 contact', 'parent 2 contact', 'second parent contact', 'second guardian contact', 'additional parent contact'],
  parent_email: ['parent email', 'guardian email', 'email', 'e-mail'],
  status: ['status', 'enrollment status'],
  age: ['age', 'student age'],
};

function normalizeHeader(input: string): string {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeHeaderForDisplay(input: unknown): string {
  return asString(input);
}

function asString(value: unknown): string {
  return value == null ? '' : String(value).trim();
}

const HEADER_HINTS = [
  'lrn',
  'name',
  'student name',
  'full name',
  'learner name',
  'gender',
  'birthday',
  'birth date',
  'date of birth',
  'dob',
  'level',
  'grade',
  'year level',
  'class',
  'grade level',
  'address',
  'parent name',
  'guardian name',
  'parent contact',
  'parent email',
  'status',
  'age',
  'first name',
  'first middle name',
  'last name',
];

function rowLooksLikeHeader(row: unknown[]): boolean {
  const normalizedValues = row.map((value) => normalizeHeaderForDisplay(value)).filter(Boolean).map(normalizeHeader);
  const matches = normalizedValues.filter((value) => HEADER_HINTS.some((hint) => value === normalizeHeader(hint) || value.includes(normalizeHeader(hint)))).length;
  return matches >= 2;
}

export function extractStudentImportRows(sheet: unknown, XLSX: any): Record<string, unknown>[] {
  const matrix = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '', blankrows: false });
  if (!Array.isArray(matrix) || matrix.length === 0) return [];

  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(matrix.length, 10); i += 1) {
    const row = Array.isArray(matrix[i]) ? matrix[i] : [];
    if (rowLooksLikeHeader(row)) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    headerRowIndex = 0;
  }

  const headers = (matrix[headerRowIndex] || []).map((value: unknown, index: number) => {
    const normalized = normalizeHeaderForDisplay(value).trim();
    return normalized || `column_${index + 1}`;
  });

  const rows: Record<string, unknown>[] = [];
  for (let rowIndex = headerRowIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
    const row = Array.isArray(matrix[rowIndex]) ? matrix[rowIndex] : [];
    const record: Record<string, unknown> = {};
    let hasAnyValue = false;

    headers.forEach((header, index) => {
      const value = row[index];
      record[header] = value;
      if (asString(value)) hasAnyValue = true;
    });

    if (hasAnyValue) {
      rows.push(record);
    }
  }

  return rows;
}

function normalizeComparable(value: unknown): string {
  return asString(value).toLowerCase().replace(/\s+/g, ' ');
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

function looksLikeAddress(value: string): boolean {
  const lower = value.toLowerCase();
  return [
    'street',
    'st.',
    'road',
    'rd.',
    'avenue',
    'ave.',
    'barangay',
    'brgy',
    'city',
    'province',
    'subdivision',
    'subd.',
    'block',
    'lot',
    'phase',
    'village',
    'zone',
    'no.',
    'house',
    'blk',
    'unit',
    'apt',
    'apartment',
    'bldg',
    'building',
  ].some((fragment) => lower.includes(fragment));
}

function looksLikePersonName(value: string): boolean {
  const text = value.trim().replace(/\s+/g, ' ');
  if (!text) return false;
  if (/\d/.test(text)) return false;
  if (looksLikeAddress(text)) return false;

  const tokenized = text.split(/\s+/);
  if (tokenized.length < 2 || tokenized.length > 5) return false;

  return tokenized.every((token) => /^[a-z][a-z.'-]*$/i.test(token.replace(/,$/, '')));
}

function resolveStudentName(rowMap: Record<string, unknown>): string {
  const directName = pickValue(rowMap, FIELD_ALIASES.name);
  if (directName) return directName;

  const firstMiddleName = pickValue(rowMap, FIELD_ALIASES.first_middle_name);
  const lastName = pickValue(rowMap, FIELD_ALIASES.last_name);

  if (firstMiddleName && lastName) {
    return `${lastName}, ${firstMiddleName}`;
  }

  const excludedKeys = new Set([
    'lrn',
    'learner reference number',
    'student id',
    'studentid',
    'id number',
    'id no',
    'birthday',
    'birth date',
    'date of birth',
    'dob',
    'age',
    'student age',
    'level',
    'grade',
    'year level',
    'class',
    'grade level',
    'gender',
    'sex',
    'address',
    'home address',
    'residence',
    'parent name',
    'guardian name',
    'parent guardian',
    'parent/guardian',
    'guardian',
    'parent contact',
    'parent phone',
    'guardian contact',
    'contact',
    'contact number',
    'mobile',
    'phone',
    'parent email',
    'guardian email',
    'email',
    'e-mail',
    'status',
    'enrollment status',
  ]);

  const fallbackValue = Object.entries(rowMap)
    .map(([key, value]) => ({
      key,
      normalizedKey: normalizeHeader(key),
      value: asString(value),
    }))
    .filter(({ normalizedKey, value }) => {
      if (!value) return false;
      if (!normalizedKey) return false;
      if (excludedKeys.has(normalizedKey)) return false;
      return looksLikePersonName(value) || /name|student|learner|full/.test(normalizedKey);
    })
    .sort((left, right) => {
      const leftLooksLikeName = /name|student|learner|full/.test(left.normalizedKey);
      const rightLooksLikeName = /name|student|learner|full/.test(right.normalizedKey);

      if (leftLooksLikeName !== rightLooksLikeName) {
        return leftLooksLikeName ? -1 : 1;
      }

      const leftIsFullName = looksLikePersonName(left.value);
      const rightIsFullName = looksLikePersonName(right.value);
      if (leftIsFullName !== rightIsFullName) {
        return leftIsFullName ? -1 : 1;
      }

      if (left.value.length !== right.value.length) {
        return right.value.length - left.value.length;
      }

      return 0;
    })[0]?.value;

  return firstMiddleName || lastName || fallbackValue || '';
}

function isRowEmpty(rowMap: Record<string, unknown>): boolean {
  return Object.values(rowMap).every((value) => asString(value) === '');
}

function generateTemporaryLrn(): string {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `TEMP-${ymd}-${rand}`;
}

function buildStudentImportSignature(row: {
  name?: unknown;
  gender?: unknown;
  birthday?: unknown;
  address?: unknown;
  level?: unknown;
  parent_name?: unknown;
  parent_contact?: unknown;
  parent2_name?: unknown;
  parent2_contact?: unknown;
  parent_email?: unknown;
  status?: unknown;
  substatus?: unknown;
}): string {
  return [
    normalizeComparable(row.name),
    normalizeComparable(row.gender),
    normalizeComparable(row.birthday),
    normalizeComparable(row.address),
    normalizeComparable(row.level),
    normalizeComparable(row.parent_name),
    normalizeComparable(row.parent_contact),
    normalizeComparable(row.parent2_name),
    normalizeComparable(row.parent2_contact),
    normalizeComparable(row.parent_email),
    normalizeComparable(row.status),
    normalizeComparable(row.substatus),
  ].join('|');
}

export function dedupeStudentImportRows(
  rows: ImportableStudentRow[],
  existingRows: Array<Record<string, unknown>> = [],
): StudentImportDedupResult {
  const seen = new Set(existingRows.map((row) => buildStudentImportSignature(row)));
  const uniqueRows: ImportableStudentRow[] = [];
  let skippedDuplicate = 0;

  rows.forEach((row) => {
    const signature = buildStudentImportSignature(row);
    if (seen.has(signature)) {
      skippedDuplicate += 1;
      return;
    }

    seen.add(signature);
    uniqueRows.push(row);
  });

  return { rows: uniqueRows, skippedDuplicate };
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

    const name = resolveStudentName(rowMap);
    const parentName = pickValue(rowMap, FIELD_ALIASES.parent_name);
    const parentContact = pickValue(rowMap, FIELD_ALIASES.parent_contact);
    const parent2Name = pickValue(rowMap, FIELD_ALIASES.parent2_name || []);
    const parent2Contact = pickValue(rowMap, FIELD_ALIASES.parent2_contact || []);
    const parentEmail = pickValue(rowMap, FIELD_ALIASES.parent_email);

    if (!name) {
      skippedMissingRequired += 1;
      return;
    }

    const gender = pickValue(rowMap, FIELD_ALIASES.gender) || 'Unspecified';
    const level = pickValue(rowMap, FIELD_ALIASES.level) || 'Grade 1';
    const address = pickValue(rowMap, FIELD_ALIASES.address) || null;
    const status = normalizeStatus(pickValue(rowMap, FIELD_ALIASES.status) || 'active');
    const lrn = pickValue(rowMap, FIELD_ALIASES.lrn) || generateTemporaryLrn();
    const age = pickValue(rowMap, FIELD_ALIASES.age);
    const birthdaySource = rowMap[normalizeHeader(FIELD_ALIASES.birthday[0])] ?? pickValue(rowMap, FIELD_ALIASES.birthday);
    const birthday = normalizeBirthday(birthdaySource);
    const derivedAge = age || (birthdaySource ? String(calculateAgeWithDecimal(birthday)) : '');

    // Save all students, but if their level is not in YEAR_LEVEL_OPTIONS, set status/substatus accordingly
    if (YEAR_LEVEL_OPTIONS.includes(level)) {
      rows.push({
        lrn,
        name,
        gender,
        birthday,
        age: derivedAge || undefined,
        address,
        level,
        parent_name: parentName,
        parent_contact: parentContact,
        parent2_name: parent2Name || undefined,
        parent2_contact: parent2Contact || undefined,
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
        age: derivedAge || undefined,
        address,
        level,
        parent_name: parentName,
        parent_contact: parentContact,
        parent2_name: parent2Name || undefined,
        parent2_contact: parent2Contact || undefined,
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
