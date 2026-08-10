import { describe, expect, it } from 'vitest';
import {
  BankReconciliationService,
  type PendingPayment,
} from '../services/admin/BankReconciliationService';
import { normalizeName, tokenKey, type N43Movement } from '../utils/n43';

/**
 * `reconcile` decide qué recibos se marcan como pagados. Un falso positivo cobra
 * dos veces a una familia o da por pagado a quien no ha pagado, así que fijamos
 * aquí las reglas: alta confianza solo con importe exacto y familia identificada.
 */

function movement(payer: string, amount: number, date = '2026-03-15'): N43Movement {
  const payerNorm = normalizeName(payer);
  return {
    date,
    valueDate: date,
    amount,
    isIncome: amount > 0,
    rawConcept: `TRANSFERENCIA DE ${payer}`,
    payerName: payerNorm,
    payerNorm,
    payerTokenKey: tokenKey(payerNorm),
  };
}

let seq = 0;
function payment(parent: string, amount: number, overrides: Partial<PendingPayment> = {}): PendingPayment {
  seq += 1;
  return {
    id: `p${seq}`,
    student_name: 'Nen',
    student_surname: 'Cognom',
    course: '1PRI',
    concept: 'Quota',
    amount,
    due_date: '2026-03-01',
    parent_name: parent,
    payment_month: 3,
    payment_year: 2026,
    ...overrides,
  };
}

describe('BankReconciliationService.reconcile', () => {
  it('marca alta confianza cuando familia e importe coinciden', () => {
    const p = payment('Maria Belen Rodriguez', 45.5);
    const rows = BankReconciliationService.reconcile(
      [movement('Maria Belen Rodriguez', 45.5)],
      [p],
      [],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].confidence).toBe('high');
    expect(rows[0].parentName).toBe('Maria Belen Rodriguez');
    expect(rows[0].suggestedPaymentIds).toEqual([p.id]);
  });

  it('identifica a la familia aunque el banco invierta nombre y apellidos', () => {
    const p = payment('Maria Belen Rodriguez Yanez', 30);
    const rows = BankReconciliationService.reconcile(
      [movement('RODRIGUEZ YANEZ MARIA BELEN', 30)],
      [p],
      [],
    );

    expect(rows[0].confidence).toBe('high');
    expect(rows[0].suggestedPaymentIds).toEqual([p.id]);
  });

  it('usa los alias aprendidos cuando el ordenante no es el titular', () => {
    const p = payment('Maria Belen Rodriguez', 30);
    const rows = BankReconciliationService.reconcile(
      [movement('AVI PACO GARCIA', 30)],
      [p],
      [{ alias_normalized: 'AVI PACO GARCIA', parent_name: 'Maria Belen Rodriguez' }],
    );

    expect(rows[0].confidence).toBe('high');
    expect(rows[0].parentName).toBe('Maria Belen Rodriguez');
  });

  it('deja sin conciliar los ordenantes desconocidos', () => {
    const rows = BankReconciliationService.reconcile(
      [movement('PERSONA DESCONEGUDA', 30)],
      [payment('Maria Belen Rodriguez', 30)],
      [],
    );

    expect(rows[0].confidence).toBe('unmatched');
    expect(rows[0].parentName).toBeNull();
    expect(rows[0].suggestedPaymentIds).toEqual([]);
  });

  it('no propone nada si el importe no cuadra con ningún recibo', () => {
    const rows = BankReconciliationService.reconcile(
      [movement('Maria Belen Rodriguez', 99)],
      [payment('Maria Belen Rodriguez', 30)],
      [],
    );

    expect(rows[0].confidence).toBe('medium');
    expect(rows[0].suggestedPaymentIds).toEqual([]);
  });

  it('pide revisión humana si hay varios recibos del mismo importe', () => {
    const rows = BankReconciliationService.reconcile(
      [movement('Maria Belen Rodriguez', 30)],
      [payment('Maria Belen Rodriguez', 30), payment('Maria Belen Rodriguez', 30)],
      [],
    );

    expect(rows[0].confidence).toBe('medium');
    expect(rows[0].suggestedPaymentIds).toEqual([]);
    expect(rows[0].candidatePayments).toHaveLength(2);
  });

  it('detecta pagos combinados (suma de varios recibos)', () => {
    const a = payment('Joan Puig', 20);
    const b = payment('Joan Puig', 35);
    const rows = BankReconciliationService.reconcile([movement('Joan Puig', 55)], [a, b], []);

    expect(rows[0].confidence).toBe('medium');
    expect(rows[0].suggestedPaymentIds.sort()).toEqual([a.id, b.id].sort());
  });

  it('no reutiliza un recibo ya consumido por un movimiento anterior', () => {
    const p = payment('Joan Puig', 30);
    const rows = BankReconciliationService.reconcile(
      [movement('Joan Puig', 30, '2026-03-01'), movement('Joan Puig', 30, '2026-03-02')],
      [p],
      [],
    );

    expect(rows[0].confidence).toBe('high');
    expect(rows[1].confidence).toBe('unmatched');
    expect(rows[1].note).toContain('pendents');
  });

  it('ignora los cargos: solo concilia dinero entrante', () => {
    const rows = BankReconciliationService.reconcile(
      [{ ...movement('Joan Puig', 30), amount: -30, isIncome: false }],
      [payment('Joan Puig', 30)],
      [],
    );

    expect(rows).toEqual([]);
  });

  it('procesa los movimientos en orden cronológico', () => {
    const rows = BankReconciliationService.reconcile(
      [movement('B Familia', 10, '2026-05-02'), movement('A Familia', 10, '2026-05-01')],
      [],
      [],
    );

    expect(rows.map(r => r.movement.date)).toEqual(['2026-05-01', '2026-05-02']);
  });

  it('tolera recibos sin titular sin romper el emparejamiento', () => {
    const sinTitular = payment('', 30, { parent_name: null });
    const bueno = payment('Joan Puig', 30);
    const rows = BankReconciliationService.reconcile([movement('Joan Puig', 30)], [sinTitular, bueno], []);

    expect(rows[0].suggestedPaymentIds).toEqual([bueno.id]);
  });
});
