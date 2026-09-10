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
  /** Number on the school's own list, when the file carries it. */
  list_number: number | null;
}

export interface ImportReport {
  rows: ParsedChild[];
  /** 1-based line numbers that could not be read, with the reason. */
  problems: { line: number; reason: string }[];
}

const HEADERS: Record<'name' | 'surname' | 'course' | 'email' | 'phone' | 'number', string[]> = {
  name: ['nom', 'nombre', 'name', 'first name'],
  surname: ['cognoms', 'cognom', 'apellidos', 'apellido', 'surname', 'last name'],
  course: ['curs', 'curso', 'course', 'grade', 'nivell', 'nivel'],
  email: ['correu', 'email', 'e-mail', 'correo'],
  phone: ['telefon', 'telèfon', 'telefono', 'teléfono', 'phone', 'mobil', 'mòbil'],
  number: ['numero', 'número', 'num', 'núm', 'number', 'n', 'no', 'ordre', 'orden', 'llista', 'lista'],
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
  // Excel guarda el CSV amb un BOM (U+FEFF) al davant. Sense treure'l, la
  // primera capçalera deixa de ser «curs» i el fitxer sencer es rebutja per
  // columna que falta, sense que a la pantalla es vegi res estrany.
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim() !== '');
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
  const numberCol = columnOf(HEADERS.number);

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
    const listNumber = numberCol === -1 ? NaN : Number.parseInt((cells[numberCol] || '').trim(), 10);

    rows.push({
      name,
      surname,
      course,
      family_email: email.includes('@') ? email : null,
      family_phone: phone || null,
      list_number: Number.isInteger(listNumber) && listNumber > 0 ? listNumber : null,
    });
  }

  return { rows, problems };
}

/**
 * The same name written twice.
 *
 * Since the roll became one row per child (the course lives in
 * `child_enrollments`), promotion no longer duplicates anybody. What is left is
 * two real children who happen to be called the same: they collapse into one
 * row on import, silently, and nobody spots that scrolling 186 names. So it
 * gets surfaced and a person decides.
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
