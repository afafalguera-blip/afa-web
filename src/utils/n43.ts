// Norma 43 (Cuaderno 43 / C43) parser, tailored to Banco Sabadell exports.
//
// Only what reconciliation needs: date, amount, debit/credit flag and the
// ordering-party (payer) name from the complementary-concept records (type 23).
// Sabadell does NOT export the payer IBAN nor any pupil/free-text concept for
// incoming transfers, so the payer name is the only stable key available.
//
// Record layout (1-based columns -> 0-based slice):
//   Type 22 (movement):
//     11-16 fecha operación (YYMMDD) | 17-22 fecha valor (YYMMDD)
//     28    debe(1)/haber(2)          | 29-42 importe (14 digits, 2 implied decimals)
//   Type 23 (complementary concept, up to 5 per movement):
//     05-80 free text (two 38-char fields; payer name lives here)

export interface N43Movement {
  /** Operation date, ISO YYYY-MM-DD. */
  date: string;
  /** Value date, ISO YYYY-MM-DD. */
  valueDate: string;
  /** Signed euro amount (positive = credit/abono, negative = debit/cargo). */
  amount: number;
  /** True for incoming money (haber / abono) — the family payments we match. */
  isIncome: boolean;
  /** Full complementary concept, whitespace-collapsed. */
  rawConcept: string;
  /** Payer name with the bank's generic prefix stripped. */
  payerName: string;
  /** Normalized payer name (uppercase, no accents/punctuation) — the match key. */
  payerNorm: string;
  /** Tokens of payerNorm sorted — order-insensitive key (name/surname swaps). */
  payerTokenKey: string;
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
];

function stripPrefix(normalized: string): string {
  for (const p of PREFIXES) {
    if (normalized === p) return '';
    if (normalized.startsWith(p + ' ')) return normalized.slice(p.length + 1).trim();
  }
  return normalized;
}

function parseDate(yymmdd: string): string {
  const yy = yymmdd.slice(0, 2);
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  return `20${yy}-${mm}-${dd}`;
}

// Split into 80-col records. Handles both newline-delimited files and the
// single-line variant some banks emit (no separators, records back-to-back).
function toRecords(raw: string): string[] {
  const byLine = raw.split(/\r?\n/).map(l => l.replace(/\s+$/, '')).filter(l => l.length > 0);
  const looksLineDelimited = byLine.some(l => l.length <= 82) || byLine.length > 1;
  if (looksLineDelimited && byLine.length > 1) return byLine;
  // Fallback: one long string -> chunk every 80 chars.
  const flat = raw.replace(/\r?\n/g, '');
  const out: string[] = [];
  for (let i = 0; i < flat.length; i += 80) out.push(flat.slice(i, i + 80));
  return out;
}

export function parseN43(raw: string): N43Movement[] {
  const records = toRecords(raw);
  const movements: N43Movement[] = [];
  let current: { date: string; valueDate: string; amount: number; isIncome: boolean } | null = null;
  let concepts: string[] = [];

  const flush = () => {
    if (!current) return;
    const rawConcept = concepts.join(' ').replace(/\s+/g, ' ').trim();
    const payerName = stripPrefix(normalizeName(rawConcept));
    const payerNorm = normalizeName(payerName);
    movements.push({
      ...current,
      rawConcept,
      payerName,
      payerNorm,
      payerTokenKey: tokenKey(payerNorm),
    });
    current = null;
    concepts = [];
  };

  for (const rec of records) {
    const type = rec.slice(0, 2);
    if (type === '22') {
      flush();
      const line = rec.padEnd(80, ' ');
      const dh = line.slice(27, 28); // 1 = debe (cargo), 2 = haber (abono)
      const cents = parseInt(line.slice(28, 42), 10) || 0;
      const magnitude = cents / 100;
      current = {
        date: parseDate(line.slice(10, 16)),
        valueDate: parseDate(line.slice(16, 22)),
        amount: dh === '2' ? magnitude : -magnitude,
        isIncome: dh === '2',
      };
    } else if (type === '23') {
      concepts.push(rec.slice(4)); // skip "23" + código dato
    } else if (type === '33' || type === '88' || type === '11') {
      // account footer / file footer / next account header -> close open movement
      flush();
    }
  }
  flush();
  return movements;
}
