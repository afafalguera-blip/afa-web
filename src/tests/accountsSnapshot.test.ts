import { describe, expect, it } from 'vitest';
import {
  buildSnapshot,
  type OrderRow,
  type PaymentRow,
} from '../services/admin/AdminAccountsService';

/**
 * El estado de cuentas es la lista con la que se reclama dinero a las familias.
 * Si suma mal, se reclama a quien ya pagó o se deja de reclamar a quien no. Aquí
 * se fija la aritmética: qué cuenta como deuda, qué está vencido y cómo se
 * agrupan hermanos y pedidos de tienda bajo la misma familia.
 */

const TODAY = '2026-09-10';

let seq = 0;
function receipt(over: Partial<PaymentRow> = {}): PaymentRow {
  seq += 1;
  return {
    student_name: 'Nen',
    student_surname: `Cognom${seq}`,
    course: '1PRI',
    concept: 'extraescolar',
    activities: null,
    amount: 54,
    due_date: '2026-09-05',
    status: 'pending',
    parent_name: 'Eva Luque Rodriguez',
    parent_email: 'eva@example.com',
    parent_phone: '600000000',
    afa_member: true,
    payment_month: 9,
    payment_year: 2026,
    ...over,
  };
}

function order(over: Partial<OrderRow> = {}): OrderRow {
  seq += 1;
  return {
    id: `o${seq}`,
    customer_name: 'Eva Luque Rodriguez',
    customer_email: null,
    total_amount: 28,
    created_at: '2026-09-01T10:00:00Z',
    payment_status: 'pending',
    ...over,
  };
}

describe('buildSnapshot', () => {
  it('agrupa a los hermanos bajo la misma familia aunque el nombre venga con otro acento o caja', () => {
    const snap = buildSnapshot(
      [
        receipt({ student_name: 'Eva', student_surname: 'Luque', parent_name: 'Núria Ocaña Ferrando' }),
        receipt({ student_name: 'Marc', student_surname: 'Luque', parent_name: 'NURIA OCANA FERRANDO' }),
      ],
      [],
      TODAY,
    );

    expect(snap.families).toHaveLength(1);
    expect(snap.families[0].children.map(c => c.name)).toEqual(['Eva', 'Marc']);
  });

  it('distingue al mismo nombre en cursos distintos', () => {
    const snap = buildSnapshot(
      [
        receipt({ student_name: 'Joan', student_surname: 'Pons', course: '1PRI' }),
        receipt({ student_name: 'Joan', student_surname: 'Pons', course: '3PRI' }),
      ],
      [],
      TODAY,
    );
    expect(snap.families[0].children).toHaveLength(2);
  });

  it('separa pendiente de pagado por concepto', () => {
    const snap = buildSnapshot(
      [
        receipt({ student_surname: 'Sola', concept: 'extraescolar', amount: 54, status: 'pending' }),
        receipt({ student_surname: 'Sola', concept: 'extraescolar', amount: 54, status: 'paid' }),
        receipt({ student_surname: 'Sola', concept: 'soci', amount: 20, status: 'paid' }),
      ],
      [],
      TODAY,
    );

    const [child] = snap.families[0].children;
    expect(child.concepts.extraescolar).toMatchObject({ pending: 54, pendingCount: 1, paid: 54, paidCount: 1 });
    expect(child.concepts.soci).toMatchObject({ pending: 0, paid: 20 });
    expect(child.concepts.llibres.pendingCount).toBe(0);
    expect(child.pending).toBe(54);
  });

  it('marca vencido solo si el recibo impagado ya pasó de fecha', () => {
    const pasado = buildSnapshot([receipt({ due_date: '2026-09-05' })], [], TODAY);
    const futuro = buildSnapshot([receipt({ due_date: '2026-10-05' })], [], TODAY);

    expect(pasado.families[0].overdue).toBe(true);
    expect(futuro.families[0].overdue).toBe(false);
    expect(futuro.families[0].pending).toBe(54);
  });

  it('guarda el impagado más antiguo, que es lo que dice cuánto se arrastra', () => {
    const snap = buildSnapshot(
      [
        receipt({ student_surname: 'Vell', due_date: '2026-11-05' }),
        receipt({ student_surname: 'Vell', due_date: '2026-09-05', payment_month: 9 }),
      ],
      [],
      TODAY,
    );
    expect(snap.families[0].children[0].concepts.extraescolar.oldestDue).toBe('2026-09-05');
  });

  it('un recibo pagado no deja fecha de impago', () => {
    const snap = buildSnapshot([receipt({ status: 'paid' })], [], TODAY);
    expect(snap.families[0].children[0].concepts.extraescolar.oldestDue).toBeNull();
    expect(snap.families[0].pending).toBe(0);
    expect(snap.familiesInDebt).toBe(0);
  });

  it('las actividades salen del recibo de extraescolars más reciente', () => {
    const snap = buildSnapshot(
      [
        receipt({ student_surname: 'Acti', activities: ['Futbol'], payment_month: 9, payment_year: 2026 }),
        receipt({ student_surname: 'Acti', activities: ['Futbol', 'Patinatge'], payment_month: 10, payment_year: 2026 }),
        receipt({ student_surname: 'Acti', activities: ['Anglès'], payment_month: 6, payment_year: 2026 }),
      ],
      [],
      TODAY,
    );
    expect(snap.families[0].children[0].activities).toEqual(['Futbol', 'Patinatge']);
  });

  it('el pedido de tienda pendiente suma a la familia, no a un hijo', () => {
    const snap = buildSnapshot([receipt({ amount: 54 })], [order({ total_amount: 28 })], TODAY);

    const family = snap.families[0];
    expect(family.shop).toMatchObject({ pending: 28, pendingCount: 1 });
    expect(family.children[0].pending).toBe(54);
    expect(family.pending).toBe(82);
    expect(snap.pendingTotal).toBe(82);
  });

  it('el pedido ya pagado no cuenta', () => {
    const snap = buildSnapshot([receipt()], [order({ payment_status: 'paid' })], TODAY);
    expect(snap.families[0].shop.pending).toBe(0);
    expect(snap.families[0].pending).toBe(54);
  });

  it('un pedido cuyo nombre no es de ninguna familia se aparta en vez de perderse', () => {
    const snap = buildSnapshot(
      [receipt()],
      [order({ customer_name: 'Alguien Que No Tiene Recibos', total_amount: 40 })],
      TODAY,
    );

    expect(snap.families[0].shop.pending).toBe(0);
    expect(snap.orphanOrders).toEqual([
      { id: expect.any(String), customerName: 'Alguien Que No Tiene Recibos', amount: 40, date: '2026-09-01' },
    ]);
  });

  it('ordena por deuda descendente y cuenta las familias que deben', () => {
    const snap = buildSnapshot(
      [
        receipt({ parent_name: 'Poca Deuda', amount: 8 }),
        receipt({ parent_name: 'Molta Deuda', amount: 200 }),
        receipt({ parent_name: 'Al Dia', status: 'paid' }),
      ],
      [],
      TODAY,
    );

    expect(snap.families.map(f => f.parentName)).toEqual(['Molta Deuda', 'Poca Deuda', 'Al Dia']);
    expect(snap.familiesInDebt).toBe(2);
    expect(snap.pendingTotal).toBe(208);
  });

  it('un recibo sin familiar no se cuelga de otra familia', () => {
    const snap = buildSnapshot(
      [receipt({ parent_name: null, student_surname: 'Orfe' }), receipt({ student_surname: 'Amb' })],
      [],
      TODAY,
    );
    expect(snap.families).toHaveLength(2);
    expect(snap.families.some(f => f.children.length === 2)).toBe(false);
  });

  it('acepta importes que PostgREST devuelve como texto', () => {
    const snap = buildSnapshot([receipt({ amount: '54.00' })], [order({ total_amount: '28.50' })], TODAY);
    expect(snap.families[0].pending).toBeCloseTo(82.5, 2);
  });
});
