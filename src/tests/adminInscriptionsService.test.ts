import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseMock } from './helpers/supabaseMock';

vi.mock('../lib/supabase', async () => {
  const { getSharedSupabaseMock } = await import('./helpers/supabaseMock');
  const mock = getSharedSupabaseMock();
  return { supabase: mock.client, __supabaseMock: mock };
});

import { getSharedSupabaseMock } from './helpers/supabaseMock';

const mock: SupabaseMock = getSharedSupabaseMock();

type Service = typeof import('../services/admin/AdminInscriptionsService').AdminInscriptionsService;
let AdminInscriptionsService: Service;

// El servicio memoriza en una variable de módulo qué tabla existe
// (`inscripcions` o `inscriptions`). Se reimporta en cada test para que esa
// caché no filtre de un caso al siguiente.
beforeEach(async () => {
  vi.resetModules();
  mock.reset();
  ({ AdminInscriptionsService } = await import('../services/admin/AdminInscriptionsService'));
});

const family = (over: Record<string, unknown> = {}) => ({
  id: 'i1',
  created_at: '2026-05-01T10:00:00Z',
  parent_name: 'Maria Puig',
  status: 'alta',
  afa_member: true,
  students: [{ name: 'Joan', surname: 'Puig', course: '1PRI', activities: ['Anglès'] }],
  ...over,
});

describe('AdminInscriptionsService.getInscriptions — camino servidor', () => {
  it('pagina en Postgres y devuelve el total exacto', async () => {
    mock.queue('inscripcions', { data: [family()], error: null, count: 42 });

    const result = await AdminInscriptionsService.getInscriptions({ page: 2, pageSize: 25 });

    expect(result.total).toBe(42);
    expect(result.clientFiltered).toBe(false);
    expect(result.rows).toHaveLength(1);

    const [query] = mock.on('inscripcions');
    expect(query.first('range')).toEqual([25, 49]);
    expect(query.first('order')).toEqual(['created_at', { ascending: false }]);
    expect(query.first('select')?.[1]).toEqual({ count: 'exact' });
  });

  it('empuja curso escolar y estado como filtros de columna', async () => {
    mock.queue('inscripcions', { data: [], error: null, count: 0 });

    await AdminInscriptionsService.getInscriptions({ academicYear: '2026-27', status: 'baja' });

    const [query] = mock.on('inscripcions');
    expect(query.arg('eq', 'academic_year')).toBe('2026-27');
    expect(query.arg('eq', 'status')).toBe('baja');
  });

  it('el estado "all" no se filtra', async () => {
    mock.queue('inscripcions', { data: [], error: null, count: 0 });
    await AdminInscriptionsService.getInscriptions({ status: 'all' });
    expect(mock.on('inscripcions')[0].arg('eq', 'status')).toBeUndefined();
  });

  it('normaliza página y tamaño fuera de rango', async () => {
    mock.queue('inscripcions', { data: [], error: null, count: 0 });
    await AdminInscriptionsService.getInscriptions({ page: -3, pageSize: 0 });
    expect(mock.on('inscripcions')[0].first('range')).toEqual([0, 0]);
  });
});

describe('AdminInscriptionsService.getInscriptions — camino en memoria', () => {
  it('busca por nombre de criatura, que Postgres no puede filtrar', async () => {
    // El nombre vive dentro del JSONB `students`: si esto se empujara al
    // servidor, buscar por criatura dejaría de encontrar nada.
    mock.queue('inscripcions', {
      data: [
        family({ id: 'i1', students: [{ name: 'Joan', surname: 'Puig', course: '1PRI' }] }),
        family({ id: 'i2', students: [{ name: 'Ona', surname: 'Sole', course: 'I4' }] }),
      ],
      error: null,
    });

    const result = await AdminInscriptionsService.getInscriptions({ search: 'Ona' });

    expect(result.clientFiltered).toBe(true);
    expect(result.rows.map((r) => r.id)).toEqual(['i2']);
    expect(result.total).toBe(1);
  });

  it('el total refleja el filtro en memoria, no las filas descargadas', async () => {
    mock.queue('inscripcions', {
      data: [
        family({ id: 'i1', students: [{ name: 'Joan', course: '1PRI', activities: ['Anglès'] }] }),
        family({ id: 'i2', students: [{ name: 'Ona', course: 'I4', activities: ['Patinatge'] }] }),
        family({ id: 'i3', students: [{ name: 'Pau', course: '1PRI', activities: ['Anglès'] }] }),
      ],
      error: null,
      count: 3,
    });

    const result = await AdminInscriptionsService.getInscriptions({ activity: 'Anglès' });

    // Si el total viniera del count del servidor diría 3 y el paginador
    // ofrecería páginas vacías.
    expect(result.total).toBe(2);
    expect(result.rows.map((r) => r.id)).toEqual(['i1', 'i3']);
  });

  it('corta la página en memoria', async () => {
    mock.queue('inscripcions', {
      data: [1, 2, 3, 4, 5].map((n) =>
        family({ id: `i${n}`, students: [{ name: `Nen${n}`, course: '1PRI' }] }),
      ),
      error: null,
    });

    const result = await AdminInscriptionsService.getInscriptions({
      course: '1PRI',
      page: 2,
      pageSize: 2,
    });

    expect(result.rows.map((r) => r.id)).toEqual(['i3', 'i4']);
    expect(result.total).toBe(5);
  });

  it('combina el filtro de servidor con el de memoria', async () => {
    mock.queue('inscripcions', {
      data: [family({ id: 'i1', students: [{ name: 'Joan', course: '1PRI' }] })],
      error: null,
    });

    await AdminInscriptionsService.getInscriptions({
      academicYear: '2026-27',
      status: 'baja',
      search: 'Joan',
    });

    const [query] = mock.on('inscripcions');
    expect(query.arg('eq', 'academic_year')).toBe('2026-27');
    expect(query.arg('eq', 'status')).toBe('baja');
    // Ya filtrado en servidor: no debe volver a aplicarse en memoria.
    expect(query.has('range')).toBe(false);
  });

  it('una búsqueda de solo espacios no activa el camino lento', async () => {
    mock.queue('inscripcions', { data: [], error: null, count: 0 });
    const result = await AdminInscriptionsService.getInscriptions({ search: '   ' });
    expect(result.clientFiltered).toBe(false);
  });
});

describe('tolerancia al nombre de la tabla', () => {
  it('cae a "inscriptions" si "inscripcions" no existe', async () => {
    mock.queue('inscripcions', {
      data: null,
      error: { code: '42P01', message: 'relation "inscripcions" does not exist' },
    });
    mock.queue('inscriptions', { data: [family()], error: null, count: 1 });

    const result = await AdminInscriptionsService.getInscriptions();

    expect(result.total).toBe(1);
    expect(mock.queries.map((q) => q.name)).toEqual(['inscripcions', 'inscriptions']);
  });

  it('recuerda la tabla que funcionó y no vuelve a probar la otra', async () => {
    mock.queue('inscripcions', { data: null, error: { code: '42P01', message: 'does not exist' } });
    mock.queue('inscriptions', { data: [], error: null, count: 0 });
    await AdminInscriptionsService.getInscriptions();

    mock.reset();
    mock.queue('inscriptions', { data: [], error: null, count: 0 });
    await AdminInscriptionsService.getInscriptions();

    expect(mock.queries.map((q) => q.name)).toEqual(['inscriptions']);
  });

  it('un error que no sea "tabla inexistente" sale enseguida, sin reintentar', async () => {
    mock.queue('inscripcions', { data: null, error: { code: '42501', message: 'permiso denegado' } });

    await expect(AdminInscriptionsService.getInscriptions()).rejects.toEqual({
      code: '42501',
      message: 'permiso denegado',
    });
    expect(mock.queries).toHaveLength(1);
  });
});

describe('AdminInscriptionsService.getInscriptionStats', () => {
  it('cuenta criaturas, no familias, y separa las bajas', async () => {
    mock.queue('inscripcions', {
      data: [
        family({
          status: 'alta',
          afa_member: true,
          students: [
            { name: 'A', course: '1PRI', activities: ['Anglès'] },
            { name: 'B', course: 'I4', activities: ['Anglès', 'Patinatge'] },
          ],
        }),
        family({
          status: 'alta',
          afa_member: false,
          students: [{ name: 'C', course: '2PRI', activities: ['Patinatge'] }],
        }),
        family({
          status: 'baja',
          afa_member: true,
          students: [{ name: 'D', course: '3PRI', activities: ['Anglès'] }],
        }),
      ],
      error: null,
    });

    const stats = await AdminInscriptionsService.getInscriptionStats('2026-27');

    expect(stats.totalInscriptions).toBe(3);
    expect(stats.activeStudents).toBe(3);
    expect(stats.bajaStudents).toBe(1);
    expect(stats.afaMemberStudents).toBe(2);
    // Las actividades de las bajas no cuentan: Anglès 2, Patinatge 2 → empate,
    // gana la primera encontrada.
    expect(stats.topActivity).toEqual({ name: 'Anglès', count: 2 });
    expect(mock.on('inscripcions')[0].first('select')?.[0]).toBe('students, status, afa_member');
  });

  it('sin inscripciones deja topActivity a null', async () => {
    mock.queue('inscripcions', { data: [], error: null });
    const stats = await AdminInscriptionsService.getInscriptionStats();
    expect(stats).toEqual({
      totalInscriptions: 0,
      activeStudents: 0,
      bajaStudents: 0,
      afaMemberStudents: 0,
      topActivity: null,
    });
  });
});

describe('AdminInscriptionsService.getAcademicYears', () => {
  it('devuelve cursos únicos del más nuevo al más viejo', async () => {
    mock.queue('inscripcions', {
      data: [
        { academic_year: '2025-26' },
        { academic_year: '2026-27' },
        { academic_year: '2025-26' },
        { academic_year: null },
      ],
      error: null,
    });

    expect(await AdminInscriptionsService.getAcademicYears()).toEqual(['2026-27', '2025-26']);
  });
});

describe('AdminInscriptionsService.updateInscription', () => {
  it('escribe solo las columnas de la lista blanca', async () => {
    await AdminInscriptionsService.updateInscription('i1', {
      id: 'otro',
      created_at: '2020-01-01',
      parent_name: 'Nou Nom',
      afa_member: false,
    } as Parameters<typeof AdminInscriptionsService.updateInscription>[1]);

    const payload = mock.on('inscripcions')[0].first('update')?.[0] as Record<string, unknown>;
    expect(payload).toEqual({ parent_name: 'Nou Nom', afa_member: false });
    expect(payload).not.toHaveProperty('id');
    expect(payload).not.toHaveProperty('created_at');
    expect(mock.on('inscripcions')[0].arg('eq', 'id')).toBe('i1');
  });

  it('escribe los valores falsy que sí son válidos', async () => {
    await AdminInscriptionsService.updateInscription('i1', {
      afa_member: false,
      health_info: '',
    } as Parameters<typeof AdminInscriptionsService.updateInscription>[1]);

    expect(mock.on('inscripcions')[0].first('update')?.[0]).toEqual({
      afa_member: false,
      health_info: '',
    });
  });

  it('no lanza ninguna consulta si no hay nada actualizable', async () => {
    const result = await AdminInscriptionsService.updateInscription('i1', {
      id: 'x',
    } as Parameters<typeof AdminInscriptionsService.updateInscription>[1]);

    expect(result).toBe(true);
    expect(mock.queries).toHaveLength(0);
  });
});

describe('mutaciones simples', () => {
  it('cambia el estado de la inscripción', async () => {
    await AdminInscriptionsService.updateStatus('i1', 'baja');
    expect(mock.on('inscripcions')[0].first('update')?.[0]).toEqual({ status: 'baja' });
    expect(mock.on('inscripcions')[0].arg('eq', 'id')).toBe('i1');
  });

  it('el socio AFA se invierte respecto al valor actual', async () => {
    await AdminInscriptionsService.toggleAfaMember('i1', true);
    expect(mock.on('inscripcions')[0].first('update')?.[0]).toEqual({ afa_member: false });

    mock.reset();
    await AdminInscriptionsService.toggleAfaMember('i1', false);
    expect(mock.on('inscripcions')[0].first('update')?.[0]).toEqual({ afa_member: true });
  });

  it('borra por id', async () => {
    await AdminInscriptionsService.deleteInscription('i7');
    expect(mock.on('inscripcions')[0].has('delete')).toBe(true);
    expect(mock.on('inscripcions')[0].arg('eq', 'id')).toBe('i7');
  });
});
