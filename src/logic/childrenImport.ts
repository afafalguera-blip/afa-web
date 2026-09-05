/**
 * Reading the school's list of children out of a CSV.
 *
 * The file comes from whoever keeps it — the centre, a spreadsheet, an export
 * from another system — so the parser is forgiving on purpose: it accepts comma
 * or semicolon (Excel in Catalan writes semicolons), it finds the columns by
 * their heading in any of the three languages, and it reports the lines it
 * could not read instead of dropping them silently. A roll with names missing
 * is worse than an import that says what went wrong.
 */

import { COURSE_BY_CODE, isCourseCode } from '../constants/courses';

export interface ParsedChild {
  name: string;
  surname: string;
  course: string;
  family_email: string | null;
  family_phone: string | null;
}

export interface ImportReport {
  rows: ParsedChild[];
  /** 1-based line numbers that could not be read, with the reason. */
  problems: { line: number; reason: string }[];
}

const HEADERS: Record<keyof Omit<ParsedChild, 'family_email' | 'family_phone'> | 'email' | 'phone', string[]> = {
  name: ['nom', 'nombre', 'name', 'first name'],
  surname: ['cognoms', 'cognom', 'apellidos', 'apellido', 'surname', 'last name'],
  course: ['curs', 'curso', 'course', 'grade', 'nivell', 'nivel'],
  email: ['correu', 'email', 'e-mail', 'correo'],
  phone: ['telefon', 'telèfon', 'telefono', 'teléfono', 'phone', 'mobil', 'mòbil'],
};

const normalise = (value: string): string =>
  value.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, ' ');

/**
 * Splits one CSV line, respecting quotes: a name written «"García, hijo"» is
 * one cell and not two, and a plain split would silently shift every column
 * after it — the kind of import bug that only shows up as a child in the wrong
 * course months later. Doubled quotes inside a quoted cell are one quote.
 */
const splitLine = (line: string, separator: string): string[] => {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (quoted) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === separator) {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += char;
    }
  }

  cells.push(cell.trim());
  return cells;
};

/** Course codes are stored, not labels: "3r Primària" has to become 3PRI. */
const toCourseCode = (raw: string): string | null => {
  const value = normalise(raw);
  if (!value) return null;

  const direct = raw.trim().toUpperCase();
  if (isCourseCode(direct)) return direct;

  for (const [code, course] of Object.entries(COURSE_BY_CODE)) {
    if (normalise(course.label) === value) return code;
  }

  // "3", "3r", "3è", "3 primaria" → 3PRI; "i3"/"p3" → I3.
  const infant = value.match(/^[ip]\s*([345])$/);
  if (infant) return `I${infant[1]}`;

  const primary = value.match(/^([1-6])\s*(r|n|t|è|e|º|ª)?\s*(pri|primaria|primària)?$/);
  if (primary) return `${primary[1]}PRI`;

  return null;
};

export function parseChildrenCsv(text: string): ImportReport {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  const problems: { line: number; reason: string }[] = [];
  const rows: ParsedChild[] = [];

  if (lines.length === 0) return { rows, problems: [{ line: 0, reason: 'El fitxer és buit' }] };

  const outsideQuotes = lines[0].replace(/"[^"]*"/g, '');
  const separator =
    (outsideQuotes.match(/;/g) || []).length > (outsideQuotes.match(/,/g) || []).length ? ';' : ',';
  const header = splitLine(lines[0], separator).map(normalise);

  const columnOf = (candidates: string[]): number =>
    header.findIndex((cell) => candidates.some((candidate) => cell === normalise(candidate)));

  const nameCol = columnOf(HEADERS.name);
  const surnameCol = columnOf(HEADERS.surname);
  const courseCol = columnOf(HEADERS.course);
  const emailCol = columnOf(HEADERS.email);
  const phoneCol = columnOf(HEADERS.phone);

  if (nameCol === -1 || surnameCol === -1 || courseCol === -1) {
    return {
      rows,
      problems: [{ line: 1, reason: 'Falta alguna columna: cal nom, cognoms i curs' }],
    };
  }

  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitLine(lines[i], separator);
    const name = (cells[nameCol] || '').trim();
    const surname = (cells[surnameCol] || '').trim();
    const course = toCourseCode(cells[courseCol] || '');

    if (!name || !surname) {
      problems.push({ line: i + 1, reason: 'Falta el nom o els cognoms' });
      continue;
    }
    if (!course) {
      problems.push({ line: i + 1, reason: `Curs no reconegut: «${(cells[courseCol] || '').trim()}»` });
      continue;
    }

    const email = emailCol === -1 ? '' : (cells[emailCol] || '').trim();
    const phone = phoneCol === -1 ? '' : (cells[phoneCol] || '').trim();

    rows.push({
      name,
      surname,
      course,
      family_email: email.includes('@') ? email : null,
      family_phone: phone || null,
    });
  }

  return { rows, problems };
}

/**
 * The same child written twice.
 *
 * The roll is keyed by name AND course, so a child enrolled one year in 3PRI
 * and the next in 4PRI legitimately arrives as two rows — that is what let the
 * roll fill itself from years of enrolments, and it is also how the same child
 * ends up on two lists. Nobody can spot that scrolling 81 names, so it gets
 * surfaced and a person decides which row stays.
 */
export function findDuplicates<T extends { name: string; surname: string; course: string }>(
  children: T[],
): T[][] {
  const groups = new Map<string, T[]>();

  for (const child of children) {
    const key = normalise(`${child.name} ${child.surname}`);
    const group = groups.get(key);
    if (group) group.push(child);
    else groups.set(key, [child]);
  }

  return [...groups.values()].filter((group) => group.length > 1);
}
