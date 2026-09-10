// Turns whatever the treasurer downloaded from BS Online into movements.
//
// BS Online offers the statement three ways and the AFA has used all of them:
// the Norma 43 file (fixed-width text), the "Consulta de movimientos" listing
// saved as .xls, and the same listing as .csv. Asking which one it is only
// invites picking wrong, so the format is sniffed from the bytes.

import { parseN43 } from './n43';
import { parseStatementCsv, parseStatementRows, type BankMovement } from './bankStatement';

export type StatementFormat = 'n43' | 'csv' | 'sheet';

export interface ParsedStatement {
  format: StatementFormat;
  movements: BankMovement[];
  /** Raw bytes, kept so the caller can hash the file for dedup. */
  buffer: ArrayBuffer;
}

const startsWith = (bytes: Uint8Array, sig: number[]) => sig.every((b, i) => bytes[i] === b);

const OLE2 = [0xd0, 0xcf, 0x11, 0xe0]; // legacy .xls
const ZIP = [0x50, 0x4b, 0x03, 0x04]; // .xlsx

/**
 * Mojibake repair: a Latin-1 file re-saved as UTF-8 turns every accent into a
 * two-char sequence starting with Ã or Â. Reading those chars back as
 * bytes and decoding again undoes it. Matching ignores accents, but the payer
 * name is also shown to a human, who has to recognise the family.
 */
function repairMojibake(text: string): string {
  if (!text.includes('Ã') && !text.includes('Â')) return text;
  if ([...text].some(c => c.charCodeAt(0) > 0xff)) return text;

  const bytes = Uint8Array.from([...text], c => c.charCodeAt(0));
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return text;
  }
}

/** UTF-8 when the bytes are valid UTF-8, Windows-1252 otherwise. */
export function decodeStatement(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  try {
    return repairMojibake(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

/** Norma 43 is fixed 80-column records whose first two digits are the type. */
function looksLikeN43(text: string): boolean {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0).slice(0, 5);
  if (lines.length === 0) return false;
  return lines.every(l => /^(11|22|23|33|88)\d/.test(l)) && lines.some(l => l.length >= 70);
}

/** xlsx is ~400 kB: only loaded when the file really is a spreadsheet. */
async function sheetRows(input: ArrayBuffer | string): Promise<string[][]> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(input, { type: typeof input === 'string' ? 'string' : 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: '' });
}

export async function parseStatementFile(file: File): Promise<ParsedStatement> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (startsWith(bytes, OLE2) || startsWith(bytes, ZIP)) {
    return { format: 'sheet', movements: parseStatementRows(await sheetRows(buffer)), buffer };
  }

  // N43 is pure ASCII bar the accents, which the spec puts in Latin-1.
  const isN43Name = /\.(n43|q43|c43)$/i.test(file.name);
  const latin1 = new TextDecoder('iso-8859-1').decode(bytes);
  if (isN43Name || looksLikeN43(latin1)) {
    return { format: 'n43', movements: parseN43(latin1), buffer };
  }

  const text = decodeStatement(buffer);

  // BS Online also serves an HTML table under an .xls name.
  if (/<\s*table/i.test(text.slice(0, 4096))) {
    return { format: 'sheet', movements: parseStatementRows(await sheetRows(text)), buffer };
  }

  return { format: 'csv', movements: parseStatementCsv(text), buffer };
}
