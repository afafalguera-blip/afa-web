import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseMock } from './helpers/supabaseMock';

vi.mock('../lib/supabase', async () => {
  const { createSupabaseMock } = await import('./helpers/supabaseMock');
  const mock = createSupabaseMock();
  return { supabase: mock.client, __supabaseMock: mock };
});

import * as supabaseModule from '../lib/supabase';
import { AdminPaymentsService } from '../services/admin/AdminPaymentsService';

const mock = (supabaseModule as unknown as { __supabaseMock: SupabaseMock }).__supabaseMock;

const today = () => new Date().toISOString().slice(0, 10);

beforeEach(() => {
  mock.reset();
});

/**
 * Estos tests no comprueban que Supabase funcione: comprueban qué consulta se
 * le manda. Un filtro de más o de menos aquí significa cobrar a quien no toca.
 */
describe('AdminPaymentsService.listPayments', () => {
  it('pide la página correcta y ordena por vencimiento descendente', async () => {
    mock.queue('payments', { data: [{ id: 'p1' }], error: null, count: 87 });

    const result = await AdminPaymentsService.listPayments({ page: 3, pageSize: 20 });

    expect(result).toEqual({ rows: [{ id: 'p1' }], total: 87 });

    const [query] = mock.on('payments');
    expect(query.first('range')).toEqual([40, 59]);
    expect(query.first('order')).toEqual(['due_date', { ascending: false }]);
  });

  it('nunca pide un rango negativo aunque la página sea 0', async () => {
    await AdminPaymentsService.listPayments({ page: 0, pageSize: 20 });
    expect(mock.on('payments')[0].first('range')).toEqual([0, 19]);
  });

  it('devuelve total 0 cuando PostgREST no manda count', async () => {
    mock.queue('payments', { data: null, error: null, count: null });
    expect(await AdminPaymentsService.listPayments({ page: 1, pageSize: 10 })).toEqual({
      rows: [],
      total: 0,
    });
  });

  it('propaga el error en vez de devolver una lista vacía', async () => {
    mock.queue('payments', { data: null, error: { message: 'boom' } });
    await expect(AdminPaymentsService.listPayments({ page: 1, pageSize: 10 })).rejects.toEqual({
      message: 'boom',
    });
  });
});

describe('filtros que se empujan al servidor', () => {
  it('filtra por curso, concepto y mes', async () => {
    await AdminPaymentsService.listPayments({
      page: 1,
      pageSize: 10,
      academicYear: '2026-27',
      concept: 'llibres',
      month: 3,
    });

    const [query] = mock.on('payments');
    expect(query.arg('eq', 'academic_year')).toBe('2026-27');
    expect(query.arg('eq', 'concept')).toBe('llibres');
    expect(query.arg('eq', 'payment_month')).toBe(3);
  });

  it('ignora el concepto "all" en vez de filtrar por esa cadena', async () => {
    await AdminPaymentsService.listPayments({ page: 1, pageSize: 10, concept: 'all' });
    expect(mock.on('payments')[0].arg('eq', 'concept')).toBeUndefined();
  });

  it('"paid" filtra por el estado tal cual', async () => {
    await AdminPaymentsService.listPayments({ page: 1, pageSize: 10, status: 'paid' });

    const [query] = mock.on('payments');
    expect(query.arg('eq', 'status')).toBe('paid');
    expect(query.has('or')).toBe(false);
  });

  it('"overdue" es no pagado Y vencido: nunca marca como moroso a quien pagó', async () => {
    await AdminPaymentsService.listPayments({ page: 1, pageSize: 10, status: 'overdue' });

    const [query] = mock.on('payments');
    expect(query.arg('neq', 'status')).toBe('paid');
    expect(query.arg('lt', 'due_date')).toBe(today());
  });

  it('"pending" incluye los recibos sin fecha de vencimiento', async () => {
    await AdminPaymentsService.listPayments({ page: 1, pageSize: 10, status: 'pending' });

    const [query] = mock.on('payments');
    expect(query.arg('neq', 'status')).toBe('paid');
    // Sin `due_date.is.null` los recibos sin fecha desaparecían de la pestaña.
    expect(query.first('or')?.[0]).toBe(`due_date.gte.${today()},due_date.is.null`);
  });

  it('busca por nombre y apellido a la vez', async () => {
    await AdminPaymentsService.listPayments({ page: 1, pageSize: 10, search: 'Puig' });

    expect(mock.on('payments')[0].first('or')?.[0]).toBe(
      'student_name.ilike.%Puig%,student_surname.ilike.%Puig%',
    );
  });

  it('limpia los caracteres que PostgREST usa como sintaxis', async () => {
    // Sin sanear, un punto o un paréntesis rompen el filtro o cambian su sentido.
    await AdminPaymentsService.listPayments({ page: 1, pageSize: 10, search: 'Puig, S.A. (2)' });

    const or = String(mock.on('payments')[0].first('or')?.[0]);

    // El término, ya dentro de los comodines, no puede llevar sintaxis PostgREST.
    const term = or.match(/student_name\.ilike\.%(.*?)%,/)?.[1];
    expect(term).toBeDefined();
    expect(term).not.toMatch(/[,.():*%\\]/);

    expect(or).toBe(
      'student_name.ilike.%Puig  S A   2%,student_surname.ilike.%Puig  S A   2%',
    );
  });

  it('anida los dos grupos OR en uno solo cuando coinciden estado y búsqueda', async () => {
    // PostgREST solo admite un `or` de primer nivel: dos parámetros `or` sueltos
    // no garantizan que se combinen con AND.
    await AdminPaymentsService.listPayments({
      page: 1,
      pageSize: 10,
      status: 'pending',
      search: 'Puig',
    });

    const [query] = mock.on('payments');
    const orCalls = query.ops.filter((o) => o.op === 'or');
    expect(orCalls).toHaveLength(1);
    expect(String(orCalls[0].args[0])).toBe(
      `and(or(due_date.gte.${today()},due_date.is.null),or(student_name.ilike.%Puig%,student_surname.ilike.%Puig%))`,
    );
  });

  it('la exportación aplica los mismos filtros y va topada', async () => {
    await AdminPaymentsService.listPaymentsForExport({ status: 'overdue', academicYear: '2026-27' });

    const [query] = mock.on('payments');
    expect(query.arg('neq', 'status')).toBe('paid');
    expect(query.arg('eq', 'academic_year')).toBe('2026-27');
    expect(query.first('range')).toEqual([0, 4999]);
  });
});

describe('AdminPaymentsService.getPaymentsSummary', () => {
  it('suma cobrado y pendiente sobre todo el conjunto filtrado', async () => {
    mock.queue('payments', {
      data: [
        { amount: 30, status: 'paid' },
        { amount: 45.5, status: 'pending' },
        { amount: 24.5, status: 'paid' },
      ],
      error: null,
    });

    expect(await AdminPaymentsService.getPaymentsSummary({})).toEqual({
      total: 100,
      paid: 54.5,
      pending: 45.5,
    });
  });

  it('acepta importes que llegan como texto desde numeric', async () => {
    mock.queue('payments', {
      data: [
        { amount: '30.50', status: 'paid' },
        { amount: '10', status: 'pending' },
      ],
      error: null,
    });

    expect(await AdminPaymentsService.getPaymentsSummary({})).toEqual({
      total: 40.5,
      paid: 30.5,
      pending: 10,
    });
  });

  it('trata como 0 los importes ilegibles en vez de propagar NaN', async () => {
    mock.queue('payments', {
      data: [
        { amount: null, status: 'pending' },
        { amount: 20, status: 'paid' },
      ],
      error: null,
    });

    expect(await AdminPaymentsService.getPaymentsSummary({})).toEqual({
      total: 20,
      paid: 20,
      pending: 0,
    });
  });

  it('devuelve ceros sin datos', async () => {
    expect(await AdminPaymentsService.getPaymentsSummary({})).toEqual({
      total: 0,
      paid: 0,
      pending: 0,
    });
  });
});

describe('AdminPaymentsService.countByConcept', () => {
  it('cuenta los cuatro conceptos y acota al curso', async () => {
    mock.always('payments', { data: null, error: null, count: 7 });

    const counts = await AdminPaymentsService.countByConcept('2026-27');

    expect(counts).toEqual({ extraescolar: 7, acollida: 7, soci: 7, llibres: 7 });
    expect(mock.on('payments')).toHaveLength(4);
    for (const query of mock.on('payments')) {
      expect(query.arg('eq', 'academic_year')).toBe('2026-27');
      expect(query.first('select')?.[1]).toEqual({ count: 'exact', head: true });
    }
  });

  it('sin curso no filtra por cohorte', async () => {
    mock.always('payments', { data: null, error: null, count: 0 });
    await AdminPaymentsService.countByConcept();
    for (const query of mock.on('payments')) {
      expect(query.arg('eq', 'academic_year')).toBeUndefined();
    }
  });
});

describe('AdminPaymentsService.listAcademicYears', () => {
  it('devuelve cursos únicos, del más nuevo al más viejo, sin nulos', async () => {
    mock.queue('payments', {
      data: [
        { academic_year: '2025-26' },
        { academic_year: '2026-27' },
        { academic_year: '2025-26' },
        { academic_year: null },
      ],
      error: null,
    });

    expect(await AdminPaymentsService.listAcademicYears()).toEqual(['2026-27', '2025-26']);
  });
});

describe('mutaciones', () => {
  it('deriva mes y año del vencimiento al crear el recibo', async () => {
    await AdminPaymentsService.createPayment({ due_date: '2026-11-05', amount: 30 });

    const inserted = (mock.on('payments')[0].first('insert')?.[0] as Record<string, unknown>[])[0];
    expect(inserted.payment_month).toBe(11);
    expect(inserted.payment_year).toBe(2026);
    expect(inserted.amount).toBe(30);
  });

  it('marcar como pagado sella la fecha de pago', async () => {
    await AdminPaymentsService.setPaymentStatus('p1', 'paid');

    const updates = mock.on('payments')[0].first('update')?.[0] as Record<string, unknown>;
    expect(updates.status).toBe('paid');
    expect(updates.payment_date).toEqual(expect.any(String));
    expect(mock.on('payments')[0].arg('eq', 'id')).toBe('p1');
  });

  it('volver a pendiente borra la fecha de pago', async () => {
    await AdminPaymentsService.setPaymentStatus('p1', 'pending');

    const updates = mock.on('payments')[0].first('update')?.[0] as Record<string, unknown>;
    expect(updates.status).toBe('pending');
    expect(updates.payment_date).toBeNull();
  });

  it('el borrado apunta al id concreto', async () => {
    await AdminPaymentsService.deletePayment('p9');
    expect(mock.on('payments')[0].has('delete')).toBe(true);
    expect(mock.on('payments')[0].arg('eq', 'id')).toBe('p9');
  });
});

describe('AdminPaymentsService.listActiveStudents', () => {
  it('aplana los alumnos de las inscripciones de alta', async () => {
    mock.queue('inscripcions', {
      data: [
        { students: [{ name: 'Joan', surname: 'Puig', course: '1PRI', activities: ['a'] }] },
        { students: [{ name: 'Ona', surname: 'Sole', course: 'I4' }] },
        { students: null },
      ],
      error: null,
    });

    const students = await AdminPaymentsService.listActiveStudents();

    expect(students).toEqual([
      { name: 'Joan', surname: 'Puig', course: '1PRI', activities: ['a'] },
      { name: 'Ona', surname: 'Sole', course: 'I4', activities: [] },
    ]);
    expect(mock.on('inscripcions')[0].arg('eq', 'status')).toBe('alta');
  });
});

describe('generadores de recibos', () => {
  it('extraescolar genera y luego limpia las bajas', async () => {
    mock.queue('generate_monthly_payments_only_active', {
      data: [{ success: true, message: 'ok', payments_generated: 12 }],
      error: null,
    });

    const result = await AdminPaymentsService.generateExtraescolar(11, 2026);

    expect(result).toEqual({ success: true, message: 'ok', payments_generated: 12 });
    expect(mock.queries.map((q) => q.name)).toEqual([
      'generate_monthly_payments_only_active',
      'remove_baja_payments_for_month',
    ]);
    expect(mock.on('generate_monthly_payments_only_active')[0].first('params')?.[0]).toEqual({
      p_month: 11,
      p_year: 2026,
    });
  });

  it('si falla la limpieza de bajas, no se da por bueno el resultado', async () => {
    mock.queue('generate_monthly_payments_only_active', { data: [{ success: true }], error: null });
    mock.queue('remove_baja_payments_for_month', { data: null, error: { message: 'nope' } });

    await expect(AdminPaymentsService.generateExtraescolar(11, 2026)).rejects.toEqual({
      message: 'nope',
    });
  });

  it('normaliza la fila única que devuelven los generadores', async () => {
    mock.queue('generate_soci_payments', {
      data: [{ success: true, message: 'fet', payments_generated: 3 }],
      error: null,
    });
    expect(await AdminPaymentsService.generateSoci(2026)).toEqual({
      success: true,
      message: 'fet',
      payments_generated: 3,
    });
  });

  it('sobrevive a un generador que no devuelve nada', async () => {
    mock.queue('generate_book_payments', { data: null, error: null });
    expect(await AdminPaymentsService.generateBooks(2026)).toEqual({
      success: false,
      message: 'Sense resposta',
      payments_generated: 0,
    });
  });

  it('el traspaso de acollida manda los cuatro parámetros', async () => {
    mock.queue('rollover_acollida_payments', { data: [{ success: true }], error: null });

    await AdminPaymentsService.rolloverAcollida(10, 2026, 11, 2026);

    expect(mock.on('rollover_acollida_payments')[0].first('params')?.[0]).toEqual({
      p_from_month: 10,
      p_from_year: 2026,
      p_to_month: 11,
      p_to_year: 2026,
    });
  });
});

describe('AdminPaymentsService.deleteMonthlyPayments', () => {
  it('borra primero el historial y luego los recibos', async () => {
    mock.queue('payments', { data: [{ id: 'p1' }, { id: 'p2' }], error: null });

    await AdminPaymentsService.deleteMonthlyPayments(11, 2026);

    expect(mock.queries.map((q) => q.name)).toEqual([
      'payments',
      'payment_history',
      'payments',
      'monthly_payment_generation',
    ]);
    expect(mock.on('payment_history')[0].first('in')).toEqual(['payment_id', ['p1', 'p2']]);
  });

  it('no toca el historial si el mes no tiene recibos', async () => {
    mock.queue('payments', { data: [], error: null });

    await AdminPaymentsService.deleteMonthlyPayments(11, 2026);

    expect(mock.on('payment_history')).toHaveLength(0);
  });

  it('aborta sin borrar nada si falla la lectura previa', async () => {
    mock.queue('payments', { data: null, error: { message: 'sin permiso' } });

    await expect(AdminPaymentsService.deleteMonthlyPayments(11, 2026)).rejects.toEqual({
      message: 'sin permiso',
    });
    expect(mock.queries).toHaveLength(1);
  });
});
