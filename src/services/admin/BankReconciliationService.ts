import { supabase } from '../../lib/supabase';
import { normalizeName, tokenKey, type N43Movement } from '../../utils/n43';

export interface PendingPayment {
  id: string;
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
  movement: N43Movement;
  confidence: Confidence;
  /** Canonical parent_name this payer resolved to (null when unmatched). */
  parentName: string | null;
  /** Payment ids pre-checked to be marked paid. */
  suggestedPaymentIds: string[];
  /** All still-available pending receipts for the matched parent (manual pick). */
  candidatePayments: PendingPayment[];
  /** Short human hint shown in the review table. */
  note: string;
}

const EPS = 0.005;

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
    const [{ data: payments, error: pErr }, { data: aliases, error: aErr }] = await Promise.all([
      supabase
        .from('payments')
        .select('id, student_name, student_surname, course, concept, amount, due_date, parent_name, payment_month, payment_year')
        .neq('status', 'paid'),
      supabase.from('payer_aliases').select('alias_normalized, parent_name'),
    ]);
    if (pErr) throw pErr;
    if (aErr) throw aErr;
    return { payments: (payments || []) as PendingPayment[], aliases: (aliases || []) as PayerAlias[] };
  },

  /**
   * Match incoming N43 movements against pending payments.
   * High-confidence rows are pre-checked; everything else needs a human.
   */
  reconcile(movements: N43Movement[], payments: PendingPayment[], aliases: PayerAlias[]): ReconRow[] {
    // Index pending payments by their canonical parent name.
    const byParentNorm = new Map<string, PendingPayment[]>();
    const byParentTok = new Map<string, PendingPayment[]>();
    for (const p of payments) {
      const norm = normalizeName(p.parent_name || '');
      if (!norm) continue;
      (byParentNorm.get(norm) ?? byParentNorm.set(norm, []).get(norm)!).push(p);
      const tok = tokenKey(norm);
      (byParentTok.get(tok) ?? byParentTok.set(tok, []).get(tok)!).push(p);
    }
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
      }

      const available = pool.filter(p => !consumed.has(p.id));

      if (!parentName) {
        rows.push({ movement, confidence: 'unmatched', parentName: null, suggestedPaymentIds: [], candidatePayments: [], note: 'Ordenant no identificat' });
        continue;
      }
      if (available.length === 0) {
        rows.push({ movement, confidence: 'unmatched', parentName, suggestedPaymentIds: [], candidatePayments: [], note: 'Sense rebuts pendents' });
        continue;
      }

      // 2) Match by amount within the parent's pending receipts.
      const exact = available.filter(p => Math.abs(Number(p.amount) - movement.amount) < EPS);
      if (exact.length === 1) {
        consumed.add(exact[0].id);
        rows.push({ movement, confidence: 'high', parentName, suggestedPaymentIds: [exact[0].id], candidatePayments: available, note: 'Import i família coincideixen' });
      } else if (exact.length > 1) {
        rows.push({ movement, confidence: 'medium', parentName, suggestedPaymentIds: [], candidatePayments: available, note: 'Diversos rebuts del mateix import' });
      } else {
        const subset = findSubset(available, movement.amount);
        if (subset) {
          rows.push({ movement, confidence: 'medium', parentName, suggestedPaymentIds: subset.map(p => p.id), candidatePayments: available, note: 'Possible pagament combinat' });
        } else {
          rows.push({ movement, confidence: 'medium', parentName, suggestedPaymentIds: [], candidatePayments: available, note: "L'import no quadra amb cap rebut" });
        }
      }
    }

    return rows;
  },

  /**
   * Mark the selected payments paid, learn the payer alias and record the import.
   * `selections` carries the admin's final choice per movement.
   */
  async apply(
    selections: Array<{ movement: N43Movement; paymentIds: string[]; parentName: string | null }>,
    summary: { fileHash: string; filename: string; movementsTotal: number; movementsIncome: number; matchedCount: number },
  ): Promise<number> {
    let applied = 0;

    for (const sel of selections) {
      if (sel.paymentIds.length === 0) continue;
      const ref = `N43 ${sel.movement.date} ${sel.movement.amount.toFixed(2)}€ · ${sel.movement.payerName}`.slice(0, 160);
      const { error } = await supabase
        .from('payments')
        .update({ status: 'paid', payment_date: sel.movement.date, bank_reference: ref })
        .in('id', sel.paymentIds);
      if (error) throw error;
      applied += sel.paymentIds.length;

      // Learn the alias so this payer auto-resolves next time.
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
