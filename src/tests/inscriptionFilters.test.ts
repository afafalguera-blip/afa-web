/**
 * @fileoverview Tests for the inscription domain logic: legacy normalisation,
 * flattening and the two filtering granularities (per-child and per-family).
 */

import { describe, it, expect } from 'vitest';
import {
  collectActivityOptions,
  filterInscriptionList,
  filterInscriptions,
  flattenInscriptions,
  normalizeInscription,
  toFlat,
} from '../logic/inscriptionFilters';
import type {
  Inscription,
  InscriptionRaw,
  InscriptionFlat,
  InscriptionFilters,
} from '../types/inscription';
import { STATUS_FILTER, INSCRIPTION_STATUS } from '../constants/status';

// ========================================
// Fixtures
// ========================================

const createMockInscriptionRaw = (overrides: Partial<InscriptionRaw> = {}): InscriptionRaw => ({
  id: 1,
  created_at: '2026-01-15T10:00:00Z',
  parent_name: 'Anna García',
  parent_dni: '12345678Z',
  parent_phone: '612345678',
  parent_email: 'parent@test.com',
  afa_member: true,
  students: [
    { name: 'Joan', surname: 'García', course: '3PRI', activities: ['Futbol', 'Anglès'] },
  ],
  ...overrides,
});

const createMockInscription = (overrides: Partial<Inscription> = {}): Inscription => ({
  id: '1',
  created_at: '2026-01-15T10:00:00Z',
  parent_name: 'Anna García',
  parent_dni: '12345678Z',
  parent_phone_1: '612345678',
  parent_email_1: 'parent@test.com',
  status: 'active',
  students: [
    { name: 'Joan', surname: 'García', course: '3PRI', activities: ['Futbol', 'Anglès'] },
  ],
  afa_member: true,
  ...overrides,
});

const createMockInscriptionFlat = (overrides: Partial<InscriptionFlat> = {}): InscriptionFlat => ({
  inscription_id: '1',
  student_index: 0,
  created_at: '2026-01-15T10:00:00Z',
  parent_name: 'Anna García',
  parent_dni: '12345678Z',
  parent_phone: '612345678',
  parent_email: 'parent@test.com',
  afa_member: true,
  name: 'Joan',
  surname: 'García',
  course: '3PRI',
  activities: ['Futbol', 'Anglès'],
  status: 'active',
  suspended: false,
  ...overrides,
});

const defaultFilters: InscriptionFilters = {
  course: '',
  activity: '',
  status: STATUS_FILTER.ALL,
  search: '',
};

// ========================================
// normalizeInscription
// ========================================

describe('normalizeInscription', () => {
  it('coerces the id to string so every consumer uses one type', () => {
    expect(normalizeInscription(createMockInscriptionRaw({ id: 42 })).id).toBe('42');
    expect(normalizeInscription(createMockInscriptionRaw({ id: 'abc-1' })).id).toBe('abc-1');
  });

  it('maps legacy parent columns without the _1 suffix', () => {
    const result = normalizeInscription(
      createMockInscriptionRaw({
        parent_phone: '600111222',
        parent_email: 'legacy@test.com',
        parent_phone_1: undefined,
        parent_email_1: undefined,
      })
    );

    expect(result.parent_phone_1).toBe('600111222');
    expect(result.parent_email_1).toBe('legacy@test.com');
  });

  it('prefers the new _1 columns when both exist', () => {
    const result = normalizeInscription(
      createMockInscriptionRaw({ parent_email: 'old@test.com', parent_email_1: 'new@test.com' })
    );
    expect(result.parent_email_1).toBe('new@test.com');
  });

  it('builds a students array from legacy flat student columns', () => {
    const result = normalizeInscription({
      id: 2,
      created_at: '2026-01-15T10:00:00Z',
      parent_phone: '612345678',
      parent_email: 'legacy@test.com',
      afa_member: false,
      student_name: 'Pere',
      student_surname: 'López',
      student_course: '5PRI',
      selected_activities: ['Bàsquet'],
      status: 'active',
      suspended: true,
    });

    expect(result.students).toHaveLength(1);
    expect(result.students[0]).toMatchObject({
      name: 'Pere',
      surname: 'López',
      course: '5PRI',
      activities: ['Bàsquet'],
      suspended: true,
    });
  });

  it('falls back to inscription-level per-child info for legacy rows', () => {
    const result = normalizeInscription(
      createMockInscriptionRaw({
        health_info: 'Al·lèrgia als fruits secs',
        can_leave_alone: true,
        students: [{ name: 'Joan', surname: 'García', course: '3PRI', activities: [] }],
      })
    );

    expect(result.students[0].health_info).toBe('Al·lèrgia als fruits secs');
    expect(result.students[0].can_leave_alone).toBe(true);
  });

  it('defaults status to active and students to an empty array', () => {
    const result = normalizeInscription({ id: 9, created_at: '2026-01-15T10:00:00Z' });
    expect(result.status).toBe(INSCRIPTION_STATUS.ACTIVE);
    expect(result.students).toEqual([]);
    expect(result.afa_member).toBe(false);
  });
});

// ========================================
// toFlat / flattenInscriptions
// ========================================

describe('toFlat', () => {
  it('produces one row per student with a stable index', () => {
    const result = toFlat([
      createMockInscription({
        students: [
          { name: 'Joan', surname: 'García', course: '3PRI', activities: ['Futbol'] },
          { name: 'Maria', surname: 'García', course: '1PRI', activities: ['Dansa'] },
        ],
      }),
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ name: 'Joan', student_index: 0, inscription_id: '1' });
    expect(result[1]).toMatchObject({ name: 'Maria', student_index: 1, inscription_id: '1' });
  });

  it('carries the family status down to every child row', () => {
    const result = toFlat([createMockInscription({ status: 'baja' })]);
    expect(result[0].status).toBe('baja');
  });

  it('returns an empty array for an inscription without students', () => {
    expect(toFlat([createMockInscription({ students: [] })])).toEqual([]);
    expect(toFlat([])).toEqual([]);
  });
});

describe('flattenInscriptions', () => {
  it('flattens raw rows with a students array', () => {
    const result = flattenInscriptions([
      createMockInscriptionRaw({
        students: [
          { name: 'Joan', surname: 'García', course: '3PRI', activities: ['Futbol'] },
          { name: 'Maria', surname: 'García', course: '1PRI', activities: ['Dansa'] },
        ],
      }),
    ]);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Joan');
    expect(result[1].name).toBe('Maria');
  });

  it('handles the legacy single-student format', () => {
    const result = flattenInscriptions([
      {
        id: 2,
        created_at: '2026-01-15T10:00:00Z',
        parent_phone: '612345678',
        parent_email: 'legacy@test.com',
        afa_member: false,
        student_name: 'Pere',
        student_surname: 'López',
        student_course: '5PRI',
        selected_activities: ['Bàsquet'],
        status: 'active',
        suspended: false,
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: 'Pere',
      surname: 'López',
      course: '5PRI',
      parent_phone: '612345678',
      parent_email: 'legacy@test.com',
    });
  });

  it('returns an empty array for empty input', () => {
    expect(flattenInscriptions([])).toEqual([]);
  });

  it('defaults status to active and suspended to false', () => {
    const result = flattenInscriptions([createMockInscriptionRaw()]);
    expect(result[0].status).toBe(INSCRIPTION_STATUS.ACTIVE);
    expect(result[0].suspended).toBe(false);
  });
});

// ========================================
// filterInscriptions (per child)
// ========================================

describe('filterInscriptions', () => {
  const testData: InscriptionFlat[] = [
    createMockInscriptionFlat({ name: 'Joan', course: '3PRI', activities: ['Futbol', 'Anglès'] }),
    createMockInscriptionFlat({ name: 'Maria', course: '1PRI', activities: ['Dansa'], status: 'baja' }),
    createMockInscriptionFlat({
      name: 'Pere',
      course: '5PRI',
      activities: ['Bàsquet'],
      parent_email: 'pere@school.com',
    }),
  ];

  describe('course filter', () => {
    it('filters by course', () => {
      const result = filterInscriptions(testData, { ...defaultFilters, course: '3PRI' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Joan');
    });

    it('returns all when the course filter is empty', () => {
      expect(filterInscriptions(testData, defaultFilters)).toHaveLength(3);
    });
  });

  describe('activity filter', () => {
    it('filters by activity', () => {
      const result = filterInscriptions(testData, { ...defaultFilters, activity: 'Futbol' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Joan');
    });

    it('finds a secondary activity inside the array', () => {
      const result = filterInscriptions(testData, { ...defaultFilters, activity: 'Anglès' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Joan');
    });
  });

  describe('status filter', () => {
    it('shows every status when the filter is ALL', () => {
      expect(filterInscriptions(testData, { ...defaultFilters, status: STATUS_FILTER.ALL })).toHaveLength(3);
    });

    it('filters baja', () => {
      const result = filterInscriptions(testData, { ...defaultFilters, status: STATUS_FILTER.BAJA });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Maria');
    });

    it('filters active (non-baja)', () => {
      const result = filterInscriptions(testData, { ...defaultFilters, status: STATUS_FILTER.ACTIVE });
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.name)).toEqual(['Joan', 'Pere']);
    });

    it('matches an exact status that is not one of the shortcuts', () => {
      const data = [createMockInscriptionFlat({ name: 'Nil', status: 'pending' })];
      expect(filterInscriptions(data, { ...defaultFilters, status: 'pending' })).toHaveLength(1);
      expect(filterInscriptions(data, { ...defaultFilters, status: 'alta' })).toHaveLength(0);
    });
  });

  describe('search filter', () => {
    it('searches by name, case insensitive', () => {
      const result = filterInscriptions(testData, { ...defaultFilters, search: 'joan' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Joan');
    });

    it('searches by surname', () => {
      expect(filterInscriptions(testData, { ...defaultFilters, search: 'García' })).toHaveLength(3);
    });

    it('searches by email', () => {
      const result = filterInscriptions(testData, { ...defaultFilters, search: 'pere@school' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Pere');
    });

    it('searches by parent name and DNI', () => {
      expect(filterInscriptions(testData, { ...defaultFilters, search: 'anna' })).toHaveLength(3);
      expect(filterInscriptions(testData, { ...defaultFilters, search: '12345678z' })).toHaveLength(3);
    });
  });

  describe('combined filters', () => {
    it('applies every filter at once', () => {
      const result = filterInscriptions(testData, {
        course: '3PRI',
        activity: 'Futbol',
        status: STATUS_FILTER.ALL,
        search: 'joan',
      });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Joan');
    });

    it('returns empty when nothing matches', () => {
      const result = filterInscriptions(testData, {
        course: '6PRI',
        activity: 'Natació',
        status: STATUS_FILTER.ALL,
        search: 'xyz',
      });
      expect(result).toHaveLength(0);
    });
  });
});

// ========================================
// filterInscriptionList (per family)
// ========================================

describe('filterInscriptionList', () => {
  const family = createMockInscription({
    id: '10',
    parent_name: 'Marta Puig',
    parent_dni: '99887766A',
    parent_email_1: 'marta@test.com',
    students: [
      { name: 'Nil', surname: 'Puig', course: '1PRI', activities: ['Dansa'] },
      { name: 'Ona', surname: 'Puig', course: '4PRI', activities: ['Judo', 'Escacs'] },
    ],
  });
  const other = createMockInscription({
    id: '11',
    parent_name: 'Pau Roca',
    parent_dni: '11223344B',
    parent_email_1: 'pau@test.com',
    status: 'baja',
    students: [{ name: 'Bru', surname: 'Roca', course: '6PRI', activities: ['Futbol'] }],
  });
  const list = [family, other];

  it('keeps a family when ANY child matches the course', () => {
    expect(filterInscriptionList(list, { ...defaultFilters, course: '4PRI' })).toEqual([family]);
  });

  it('keeps a family when ANY child matches the activity', () => {
    expect(filterInscriptionList(list, { ...defaultFilters, activity: 'Escacs' })).toEqual([family]);
  });

  it('drops the family when no child matches', () => {
    expect(filterInscriptionList(list, { ...defaultFilters, course: 'I3' })).toEqual([]);
  });

  it('matches the search against the parent', () => {
    expect(filterInscriptionList(list, { ...defaultFilters, search: 'marta' })).toEqual([family]);
    expect(filterInscriptionList(list, { ...defaultFilters, search: '11223344' })).toEqual([other]);
  });

  it('matches the search against a child inside the students JSONB', () => {
    expect(filterInscriptionList(list, { ...defaultFilters, search: 'ona' })).toEqual([family]);
    expect(filterInscriptionList(list, { ...defaultFilters, search: 'bru' })).toEqual([other]);
  });

  it('matches the search against an activity name', () => {
    expect(filterInscriptionList(list, { ...defaultFilters, search: 'judo' })).toEqual([family]);
  });

  it('filters by status', () => {
    expect(filterInscriptionList(list, { ...defaultFilters, status: STATUS_FILTER.BAJA })).toEqual([other]);
    expect(filterInscriptionList(list, { ...defaultFilters, status: STATUS_FILTER.ACTIVE })).toEqual([family]);
  });

  it('combines status and activity', () => {
    const result = filterInscriptionList(list, {
      ...defaultFilters,
      status: STATUS_FILTER.ACTIVE,
      activity: 'Futbol',
    });
    expect(result).toEqual([]);
  });

  it('keeps the count consistent with what toFlat would show', () => {
    const filtered = filterInscriptionList(list, { ...defaultFilters, search: 'puig' });
    expect(filtered).toHaveLength(1);
    expect(toFlat(filtered)).toHaveLength(2);
  });
});

// ========================================
// collectActivityOptions
// ========================================

describe('collectActivityOptions', () => {
  it('returns the distinct activities sorted', () => {
    const result = collectActivityOptions([
      createMockInscription({
        students: [
          { name: 'A', surname: 'A', course: '1PRI', activities: ['Judo', 'Dansa'] },
          { name: 'B', surname: 'B', course: '2PRI', activities: ['Dansa'] },
        ],
      }),
      createMockInscription({
        id: '2',
        students: [{ name: 'C', surname: 'C', course: '3PRI', activities: ['Anglès', ''] }],
      }),
    ]);

    expect(result).toEqual(['Anglès', 'Dansa', 'Judo']);
  });

  it('returns an empty array when there is nothing to collect', () => {
    expect(collectActivityOptions([])).toEqual([]);
  });
});
