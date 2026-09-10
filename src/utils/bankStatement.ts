// Bank statement primitives shared by the two formats the AFA can export from
// BS Online: Norma 43 (see ./n43.ts) and the "Consulta de movimientos" listing
// saved as .xls/.csv, parsed here.
//
// Neither format carries the pupil name nor the payer IBAN, so the only stable
// key is the ordering party name — and the listing export TRUNCATES it (36
// chars), cutting long names mid-surname ("...ALASTRE HERNAND"). Reconciliation
// has to tolerate that.

/** One movement, whatever the source format. */
export interface BankMovement {
  /** Operation date, ISO YYYY-MM-DD. */
  date: string;
  /** Value date, ISO YYYY-MM-DD. */
  valueDate: string;
  /** Signed euro amount (positive = credit/abono, negative = debit/cargo). */
  amount: number;
  /** True for incoming money (haber / abono) — the family payments we match. */
  isIncome: boolean;
  /** Full concept text, whitespace-collapsed. */
  rawConcept: string;
  /** Payer name with the bank's generic prefix stripped. */
  payerName: string;
  /** Normalized payer name (uppercase, no accents/punctuation) — the match key. */
  payerNorm: string;
  /** Tokens of payerNorm sorted — order-insensitive key (name/surname swaps). */
  payerTokenKey: string;
  /** The export cut the name at its column width: it may be partial. */
  truncated?: boolean;
}

/** Uppercase, strip accents and punctuation, collapse whitespace. */
export function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Order-insensitive key so "RODRIGUEZ YANEZ MARIA BELEN" == "Maria Belen Rodriguez Yanez". */
export function tokenKey(normalized: string): string {
  return normalized.split(' ').filter(Boolean).sort().join(' ');
}

// Generic literals Sabadell puts before the actual payer name. Longest first so
// "ABONO TRF DE" is stripped before "ABONO". Compared against normalized text.
const PREFIXES = [
  'ABONO TRANSFERENCIA DE',
  'ABONO TRF DE',
  'ABONO TRF',
  'ABONO',
  'TRANSFERENCIA DE',
  'TRANSFERENC DE',
  'TRANSFERENCIA',
  'TRANSFERENC',
  'BIZUM DE',
  'BIZUM',
  'TRASPASO DE',
  'TRASPASO',
  'INGRESO EFECTIVO CAJERO AUTOMATICO',
  'INGRESO EFECTIVO',
  'INGRESO',
];

export function stripPayerPrefix(normalized: string): string {
  for (const p of PREFIXES) {
    if (normalized === p) return '';
    if (normalized.startsWith(p + ' ')) return normalized.slice(p.length + 1).trim();
  }
  return normalized;
}

/**
 * Payer name out of a concept string. ATM deposits put the depositor after the
 * terminal number ("INGRESO EFECTIVO CAJERO AUTOMATICO 0081.../ANTONELLA
 * LOZANO"), so the slash wins over prefix stripping when it is there.
 */
export function payerFromConcept(rawConcept: string): string {
  const afterSlash = rawConcept.includes('/') ? rawConcept.slice(rawConcept.lastIndexOf('/') + 1) : '';
  const source = /ingreso\s+efectivo/i.test(rawConcept) && afterSlash.trim() ? afterSlash : rawConcept;
  return stripPayerPrefix(normalizeName(source));
}

/** Build the movement name keys from a concept. */
export function movementNames(rawConcept: string): Pick<BankMovement, 'payerName' | 'payerNorm' | 'payerTokenKey'> {
  const payerName = payerFromConcept(rawConcept);
  const payerNorm = normalizeName(payerName);
  return { payerName, payerNorm, payerTokenKey: tokenKey(payerNorm) };
}

// ---------------------------------------------------------------------------
// "Consulta de movimientos" listing (.csv / .xls / .xlsx)
// ---------------------------------------------------------------------------

/**
 * Spanish-formatted amount to a number. "-4.500,00" -> -4500, "11.395,35" ->
 * 11395.35. The separator nearest the end wins, unless it is followed by
 * exactly three digits and is the only one of its kind (then it groups
 * thousands: "1.500" -> 1500).
 */
export function parseAmount(value: string): number | null {
  const cleaned = String(value).replace(/[^\d.,+-]/g, '').trim();
  if (!cleaned || !/\d/.test(cleaned)) return null;

  const cut = Math.max(cleaned.lastIndexOf(','), cleaned.lastIndexOf('.'));
  if (cut === -1) return Number(cleaned);

  const sep = cleaned[cut];
  const frac = cleaned.slice(cut + 1);
  const isGrouping = frac.length === 3 && cleaned.indexOf(sep) === cut;
  if (isGrouping) return Number(cleaned.replace(/[.,]/g, ''));

  const int = cleaned.slice(0, cut).replace(/[.,]/g, '');
  const n = Number(`${int}.${frac.replace(/\D/g, '')}`);
  return Number.isFinite(n) ? n : null;
}

/** dd/mm/yyyy (or dd-mm-yy) to ISO. Already-ISO input passes through. */
export function parseStatementDate(value: string): string | null {
  const s = String(value).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const year = y.length === 2 ? `20${y}` : y;
  return `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/** RFC4180-ish tokenizer: quoted fields, "" escapes, CR/LF inside quotes. */
export function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { quoted = false; }
      } else field += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === delimiter) { row.push(field); field = ''; continue; }
    if (c === '\r') continue;
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += c;
  }
  row.push(field);
  if (row.some(f => f !== '')) rows.push(row);
  return rows;
}

const HEADER_PATTERNS = {
  date: /^F\s*OPERATIVA|FECHA\s*(DE\s*)?OPERAC|^FECHA$|^DATA/,
  valueDate: /^F\s*VALOR|FECHA\s*(DE\s*)?VALOR|^DATA\s*VALOR/,
  concept: /CONCEPTO|DESCRIPCI|CONCEPTE/,
  amount: /IMPORTE|^IMPORT$/,
} as const;

interface ColumnMap { date: number; valueDate: number; concept: number; amount: number }

const headerCell = (s: string) => normalizeName(String(s ?? '').replace(/\./g, ' '));

function findHeader(rows: string[][]): { index: number; cols: ColumnMap } | null {
  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i].map(headerCell);
    const find = (re: RegExp) => cells.findIndex(c => c && re.test(c));

    const amount = find(HEADER_PATTERNS.amount);
    const concept = find(HEADER_PATTERNS.concept);
    const date = find(HEADER_PATTERNS.date);
    if (amount === -1 || concept === -1 || date === -1) continue;

    // Split with the wrong delimiter and the whole header lands in one cell,
    // which matches all three patterns at index 0. Real columns are distinct.
    if (new Set([date, concept, amount]).size < 3) continue;

    const valueDate = find(HEADER_PATTERNS.valueDate);
    return { index: i, cols: { date, valueDate: valueDate === -1 ? date : valueDate, concept, amount } };
  }
  return null;
}

/**
 * Sabadell cuts the ordering-party name at a fixed width (36 chars in the
 * exports seen so far), so in a statement of any size several names land on
 * exactly that length while the rest fall short. Two names tied at the longest
 * length is the signal; a lone longest name is just a long name.
 *
 * This is a hint for the reviewer, not a gate: reconciliation always tries
 * prefix matching when the exact one fails.
 */
function truncationWidth(payerNames: string[]): number {
  const max = payerNames.reduce((a, n) => Math.max(a, n.length), 0);
  if (max < 25) return Infinity;
  const atMax = payerNames.filter(n => n.length === max).length;
  return atMax >= 2 ? max : Infinity;
}

/** Movements out of an already-tabulated statement (CSV rows or sheet rows). */
export function parseStatementRows(rows: string[][]): BankMovement[] {
  const header = findHeader(rows);
  if (!header) return [];

  const { cols } = header;
  const body: Array<{ date: string; valueDate: string; amount: number; concept: string }> = [];

  for (const row of rows.slice(header.index + 1)) {
    const date = parseStatementDate(row[cols.date] ?? '');
    const amount = parseAmount(row[cols.amount] ?? '');
    if (!date || amount === null) continue;

    body.push({
      date,
      valueDate: parseStatementDate(row[cols.valueDate] ?? '') ?? date,
      amount,
      concept: String(row[cols.concept] ?? '').replace(/\s+/g, ' ').trim(),
    });
  }

  const movements: BankMovement[] = body.map(b => ({
    date: b.date,
    valueDate: b.valueDate,
    amount: b.amount,
    isIncome: b.amount > 0,
    rawConcept: b.concept,
    truncated: false,
    ...movementNames(b.concept),
  }));

  // Only over incoming transfers: the cap applies to the ordering-party name,
  // while a direct-debit concept ("ADEUDO RECIBO AMAZON EU S.A R.L., MADRID
  // BRANCH AMAZON") is longer and would hide the real width.
  const width = truncationWidth(movements.filter(m => m.isIncome).map(m => m.payerName));
  for (const m of movements) m.truncated = m.isIncome && m.payerName.length >= width;

  return movements;
}

/** Movements out of the raw CSV text. Tries , ; and tab until one yields rows. */
export function parseStatementCsv(text: string): BankMovement[] {
  for (const delimiter of [',', ';', '\t']) {
    const movements = parseStatementRows(parseDelimited(text, delimiter));
    if (movements.length > 0) return movements;
  }
  return [];
}
