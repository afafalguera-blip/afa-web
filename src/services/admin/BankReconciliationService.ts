import { supabase } from '../../lib/supabase';
import { normalizeName, tokenKey, type BankMovement } from '../../utils/bankStatement';

/** Where an unpaid amount lives. Shop orders bill the same families. */
export type DebtKind = 'payment' | 'shop_order';

/**
 * One thing a family still owes. `payments` rows (extraescolars, acollida,
 * quota de soci, llibres) and pending `shop_orders` are reconciled against the
 * same statement, so they share a shape; `kind` says which table to write back.
 */
export interface PendingPayment {
  id: string;
  /** Defaults to 'payment' so existing callers and fixtures keep working. */
  kind?: DebtKind;
  student_name: string;
  student_surname: string;
  course: string;
  concept: string;
  amount: number;
  due_date: string;
  parent_name: string | null;
  payment_month: number;
  payment_year: number;
}

export interface PayerAlias {
  alias_normalized: string;
  parent_name: string;
}

export type Confidence = 'high' | 'medium' | 'unmatched';

export interface ReconRow {
  movement: BankMovement;
  confidence: Confidence;
  /** Canonical parent_name this payer resolved to (null when unmatched). */
  parentName: string | null;
  /** Debt ids pre-checked to be marked paid. */
  suggestedPaymentIds: string[];
  /** All still-available pending debts for the matched parent (manual pick). */
  candidatePayments: PendingPayment[];
  /** Short human hint shown in the review table. */
  note: string;
}

const EPS = 0.005;

/** Below this a cut name is too short to identify anybody on its own. */
const MIN_PREFIX_LEN = 18;

export const debtKind = (d: PendingPayment): DebtKind => d.kind ?? 'payment';

/** SHA-256 hex of a file's bytes (dedup key for bank_imports). */
export async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** First subset (size 2..4) of `items` whose amount sums to `target`. */
function findSubset(items: PendingPayment[], target: number): PendingPayment[] | null {
  const n = items.length;
  for (let size = 2; size <= 4 && size <= n; size++) {
    const idx = Array.from({ length: size }, (_, i) => i);
    while (true) {
      const sum = idx.reduce((a, i) => a + Number(items[i].amount), 0);
      if (Math.abs(sum - target) < EPS) return idx.map(i => items[i]);
      // advance combination
      let k = size - 1;
      while (k >= 0 && idx[k] === n - size + k) k--;
      if (k < 0) break;
      idx[k]++;
      for (let j = k + 1; j < size; j++) idx[j] = idx[j - 1] + 1;
    }
  }
  return null;
}

/**
 * Families whose name the payer could be the cut-off start of. The listing
 * export truncates the concept column, so "MARIA DE LOS ANGELES ALASTRE HERNAND"
 * has to still find "Maria de los Angeles Alastre Hernandez" — and find it with
 * the words in any order, because the bank and the inscription form disagree on
 * whether the surname goes first.
 *
 * Only the last word may be partial: everything before it must match a whole
 * word of the family name. That, plus requiring a unique winner, is what keeps
 * this from marking the wrong family's receipts as paid.
 */
export function prefixCandidates(payerNorm: string, parentNorms: string[]): string[] {
  if (payerNorm.length < MIN_PREFIX_LEN) return [];

  const tokens = payerNorm.split(' ').filter(Boolean);
  if (tokens.length < 2) return [];
  const head = tokens.slice(0, -1);
  const tail = tokens[tokens.length - 1];

  return parentNorms.filter(parent => {
    if (parent.startsWith(payerNorm)) return true;

    const rest = parent.split(' ').filter(Boolean);
    for (const t of head) {
      const i = rest.indexOf(t);
      if (i === -1) return false;
      rest.splice(i, 1);
    }
    return rest.some(t => t.startsWith(tail));
  });
}

/** Pending shop orders, shaped as debts. Their payer is the customer name. */
function orderToDebt(o: {
  id: string;
  customer_name: string | null;
  total_amount: number | string;
  created_at: string | null;
}): PendingPayment {
  const created = o.created_at ? new Date(o.created_at) : new Date();
  const name = (o.customer_name || '').trim();
  return {
    id: o.id,
    kind: 'shop_order',
    student_name: name || '—',
    student_surname: '',
    course: '',
    concept: 'botiga',
    amount: Number(o.total_amount),
    due_date: created.toISOString().slice(0, 10),
    parent_name: name || null,
    payment_month: created.getMonth() + 1,
    payment_year: created.getFullYear(),
  };
}

export const BankReconciliationService = {
  /** Whether this exact file was reconciled before. Returns the prior import or null. */
  async findImport(fileHash: string) {
    const { data } = await supabase
      .from('bank_imports')
      .select('id, filename, imported_at, applied_count')
      .eq('file_hash', fileHash)
      .maybeSingle();
    return data || null;
  },

  async loadContext(): Promise<{ payments: PendingPayment[]; aliases: PayerAlias[] }> {
    const [{ data: payments, error: pErr }, { data: orders, error: oErr }, { data: aliases, error: aErr }] =
      await Promise.all([
        supabase
          .from('payments')
          .select('id, student_name, student_surname, course, concept, amount, due_date, parent_name, payment_month, payment_year')
          .neq('status', 'paid'),
        supabase
          .from('shop_orders')
          .select('id, customer_name, total_amount, created_at')
          .neq('payment_status', 'paid'),
        supabase.from('payer_aliases').select('alias_normalized, parent_name'),
      ]);
    if (pErr) throw pErr;
    if (oErr) throw oErr;
    if (aErr) throw aErr;

    const receipts = ((payments || []) as PendingPayment[]).map(p => ({ ...p, kind: 'payment' as const }));
    const shop = (orders || []).map(orderToDebt);

    return { payments: [...receipts, ...shop], aliases: (aliases || []) as PayerAlias[] };
  },

  /**
   * Match incoming movements against everything still unpaid.
   * High-confidence rows are pre-checked; everything else needs a human.
   */
  reconcile(movements: BankMovement[], payments: PendingPayment[], aliases: PayerAlias[]): ReconRow[] {
    // Index pending debts by their canonical parent name.
    const byParentNorm = new Map<string, PendingPayment[]>();
    const byParentTok = new Map<string, PendingPayment[]>();
    for (const p of payments) {
      const norm = normalizeName(p.parent_name || '');
      if (!norm) continue;
      (byParentNorm.get(norm) ?? byParentNorm.set(norm, []).get(norm)!).push(p);
      const tok = tokenKey(norm);
      (byParentTok.get(tok) ?? byParentTok.set(tok, []).get(tok)!).push(p);
    }
    const parentNorms = [...byParentNorm.keys()];

    // Learned aliases (bank name -> canonical parent name).
    const aliasByNorm = new Map<string, string>();
    const aliasByTok = new Map<string, string>();
    for (const a of aliases) {
      aliasByNorm.set(a.alias_normalized, a.parent_name);
      aliasByTok.set(tokenKey(a.alias_normalized), a.parent_name);
    }

    const consumed = new Set<string>();
    const incomes = movements
      .filter(m => m.isIncome && m.amount > 0)
      .sort((a, b) => a.date.localeCompare(b.date));

    const rows: ReconRow[] = [];

    for (const movement of incomes) {
      // 1) Resolve the parent this payer maps to, and its pending pool.
      let parentName: string | null = null;
      let pool: PendingPayment[] = [];
      let byCutName = false;

      const aliasHit = aliasByNorm.get(movement.payerNorm) ?? aliasByTok.get(movement.payerTokenKey);
      if (aliasHit) {
        parentName = aliasHit;
        pool = byParentNorm.get(normalizeName(aliasHit)) ?? [];
      } else if (byParentNorm.has(movement.payerNorm)) {
        pool = byParentNorm.get(movement.payerNorm)!;
        parentName = pool[0]?.parent_name ?? null;
      } else if (byParentTok.has(movement.payerTokenKey)) {
        pool = byParentTok.get(movement.payerTokenKey)!;
        parentName = pool[0]?.parent_name ?? null;
      } else {
        // Last resort: the export may have cut the name mid-surname.
        const cands = [...new Set(prefixCandidates(movement.payerNorm, parentNorms))];
        if (cands.length === 1) {
          pool = byParentNorm.get(cands[0])!;
          parentName = pool[0]?.parent_name ?? null;
          byCutName = true;
        }
      }

      const available = pool.filter(p => !consumed.has(p.id));

      if (!parentName) {
        const note = movement.truncated
          ? 'Nom retallat per l’extracte i no identificat'
          : 'Ordenant no identificat';
        rows.push({ movement, confidence: 'unmatched', parentName: null, suggestedPaymentIds: [], candidatePayments: [], note });
        continue;
      }
      if (available.length === 0) {
        rows.push({ movement, confidence: 'unmatched', parentName, suggestedPaymentIds: [], candidatePayments: [], note: 'Sense rebuts pendents' });
        continue;
      }

      // 2) Match by amount within the parent's pending debts.
      const exact = available.filter(p => Math.abs(Number(p.amount) - movement.amount) < EPS);
      if (exact.length === 1) {
        // A name the bank cut short is a guess until a human confirms it: it
        // gets the suggestion but never the "no need to look" badge.
        if (byCutName) {
          rows.push({ movement, confidence: 'medium', parentName, suggestedPaymentIds: [exact[0].id], candidatePayments: available, note: 'Nom retallat per l’extracte: confirma la família' });
        } else {
          consumed.add(exact[0].id);
          rows.push({ movement, confidence: 'high', parentName, suggestedPaymentIds: [exact[0].id], candidatePayments: available, note: 'Import i família coincideixen' });
        }
      } else if (exact.length > 1) {
        rows.push({ movement, confidence: 'medium', parentName, suggestedPaymentIds: [], candidatePayments: available, note: 'Diversos rebuts del mateix import' });
      } else {
        const subset = findSubset(available, movement.amount);
        if (subset) {
          rows.push({ movement, confidence: 'medium', parentName, suggestedPaymentIds: subset.map(p => p.id), candidatePayments: available, note: 'Possible pagament combinat' });
        } else {
          rows.push({ movement, confidence: 'medium', parentName, suggestedPaymentIds: [], candidatePayments: available, note: 'L’import no quadra amb cap rebut' });
        }
      }
    }

    return rows;
  },

  /**
   * Mark the selected debts paid, learn the payer alias and record the import.
   * `selections` carries the admin's final choice per movement.
   */
  async apply(
    selections: Array<{ movement: BankMovement; debts: PendingPayment[]; parentName: string | null }>,
    summary: { fileHash: string; filename: string; movementsTotal: number; movementsIncome: number; matchedCount: number },
  ): Promise<number> {
    let applied = 0;

    for (const sel of selections) {
      if (sel.debts.length === 0) continue;
      const ref = `Extracte ${sel.movement.date} ${sel.movement.amount.toFixed(2)}€ · ${sel.movement.payerName}`.slice(0, 160);

      const receiptIds = sel.debts.filter(d => debtKind(d) === 'payment').map(d => d.id);
      const orderIds = sel.debts.filter(d => debtKind(d) === 'shop_order').map(d => d.id);

      if (receiptIds.length > 0) {
        const { error } = await supabase
          .from('payments')
          .update({ status: 'paid', payment_date: sel.movement.date, bank_reference: ref })
          .in('id', receiptIds);
        if (error) throw error;
      }

      if (orderIds.length > 0) {
        const { error } = await supabase
          .from('shop_orders')
          .update({ payment_status: 'paid' })
          .in('id', orderIds);
        if (error) throw error;
      }

      applied += sel.debts.length;

      // Learn the alias so this payer auto-resolves next time. A name the bank
      // cut short is learned too: next month it resolves straight away.
      if (sel.parentName && sel.movement.payerNorm) {
        await supabase
          .from('payer_aliases')
          .upsert(
            { alias_normalized: sel.movement.payerNorm, parent_name: sel.parentName },
            { onConflict: 'alias_normalized' },
          );
      }
    }

    // Upsert so re-importing the same file (hash) updates the summary instead of
    // erroring on the unique file_hash.
    await supabase.from('bank_imports').upsert(
      {
        file_hash: summary.fileHash,
        filename: summary.filename,
        movements_total: summary.movementsTotal,
        movements_income: summary.movementsIncome,
        matched_count: summary.matchedCount,
        applied_count: applied,
      },
      { onConflict: 'file_hash' },
    );

    return applied;
  },
};
