/**
 * @fileoverview Tests for inscription filtering logic
 * Pure functions are easy to test - Midudev recommended pattern
 */

import { describe, it, expect } from 'vitest';
import { flattenInscriptions, filterInscriptions } from '../logic/inscriptionFilters';
import type { InscriptionRaw, InscriptionFlat, InscriptionFilters } from '../types/inscription';
import { STATUS_FILTER, INSCRIPTION_STATUS } from '../constants/status';

// ========================================
// Test Data Fixtures
// ========================================

const createMockInscriptionRaw = (overrides: Partial<InscriptionRaw> = {}): InscriptionRaw => ({
  id: 1,
  created_at: '2026-01-15T10:00:00Z',
  parent_phone: '612345678',
  parent_email: 'parent@test.com',
  afa_member: true,
  students: [
    { name: 'Joan', surname: 'García', course: '3r', activities: ['Futbol', 'Anglès'] },
  ],
  ...overrides,
});

const createMockInscriptionFlat = (overrides: Partial<InscriptionFlat> = {}): InscriptionFlat => ({
  inscription_id: 1,
  created_at: '2026-01-15T10:00:00Z',
  parent_phone: '612345678',
  parent_email: 'parent@test.com',
  afa_member: true,
  name: 'Joan',
  surname: 'García',
  course: '3r',
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
// flattenInscriptions Tests
// ========================================

describe('flattenInscriptions', () => {
  it('should flatten inscriptions with students array', () => {
    const inscriptions: InscriptionRaw[] = [
      createMockInscriptionRaw({
        id: 1,
        students: [
          { name: 'Joan', surname: 'García', course: '3r', activities: ['Futbol'] },
          { name: 'Maria', surname: 'García', course: '1r', activities: ['Dansa'] },
        ],
      }),
    ];

    const result = flattenInscriptions(inscriptions);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Joan');
    expect(result[1].name).toBe('Maria');
  });

  it('should handle legacy format (single student fields)', () => {
    const inscriptions: InscriptionRaw[] = [
      {
        id: 2,
        created_at: '2026-01-15T10:00:00Z',
        parent_phone: '612345678',
        parent_email: 'legacy@test.com',
        afa_member: false,
        student_name: 'Pere',
        student_surname: 'López',
        student_course: '5è',
        selected_activities: ['Bàsquet'],
        status: 'active',
        suspended: false,
      },
    ];

    const result = flattenInscriptions(inscriptions);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Pere');
    expect(result[0].surname).toBe('López');
    expect(result[0].course).toBe('5è');
  });

  it('should return empty array for empty input', () => {
    const result = flattenInscriptions([]);
    expect(result).toEqual([]);
  });

  it('should set default status to active for new format', () => {
    const inscriptions: InscriptionRaw[] = [createMockInscriptionRaw()];
    const result = flattenInscriptions(inscriptions);

    expect(result[0].status).toBe(INSCRIPTION_STATUS.ACTIVE);
    expect(result[0].suspended).toBe(false);
  });
});

// ========================================
// filterInscriptions Tests
// ========================================

describe('filterInscriptions', () => {
  const testData: InscriptionFlat[] = [
    createMockInscriptionFlat({ name: 'Joan', course: '3r', activities: ['Futbol', 'Anglès'] }),
    createMockInscriptionFlat({ name: 'Maria', course: '1r', activities: ['Dansa'], status: 'baja' }),
    createMockInscriptionFlat({ name: 'Pere', course: '5è', activities: ['Bàsquet'], parent_email: 'pere@school.com' }),
  ];

  describe('course filter', () => {
    it('should filter by course', () => {
      const filters = { ...defaultFilters, course: '3r' };
      const result = filterInscriptions(testData, filters);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Joan');
    });

    it('should return all when course filter is empty', () => {
      const result = filterInscriptions(testData, defaultFilters);
      expect(result).toHaveLength(3);
    });
  });

  describe('activity filter', () => {
    it('should filter by activity (array activities)', () => {
      const filters = { ...defaultFilters, activity: 'Futbol' };
      const result = filterInscriptions(testData, filters);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Joan');
    });

    it('should find activity in array', () => {
      const filters = { ...defaultFilters, activity: 'Anglès' };
      const result = filterInscriptions(testData, filters);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Joan');
    });
  });

  describe('status filter', () => {
    it('should show all statuses when filter is ALL', () => {
      const filters = { ...defaultFilters, status: STATUS_FILTER.ALL as 'all' };
      const result = filterInscriptions(testData, filters);

      expect(result).toHaveLength(3);
    });

    it('should filter baja status', () => {
      const filters = { ...defaultFilters, status: STATUS_FILTER.BAJA as 'baja' };
      const result = filterInscriptions(testData, filters);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Maria');
    });

    it('should filter active status (non-baja)', () => {
      const filters = { ...defaultFilters, status: STATUS_FILTER.ACTIVE as 'active' };
      const result = filterInscriptions(testData, filters);

      expect(result).toHaveLength(2);
      expect(result.map(r => r.name)).toContain('Joan');
      expect(result.map(r => r.name)).toContain('Pere');
    });
  });

  describe('search filter', () => {
    it('should search by name (case insensitive)', () => {
      const filters = { ...defaultFilters, search: 'joan' };
      const result = filterInscriptions(testData, filters);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Joan');
    });

    it('should search by surname', () => {
      const filters = { ...defaultFilters, search: 'García' };
      const result = filterInscriptions(testData, filters);

      // All 3 test records have surname 'García' from createMockInscriptionFlat
      expect(result).toHaveLength(3);
    });

    it('should search by email', () => {
      const filters = { ...defaultFilters, search: 'pere@school' };
      const result = filterInscriptions(testData, filters);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Pere');
    });
  });

  describe('combined filters', () => {
    it('should apply multiple filters simultaneously', () => {
      const filters: InscriptionFilters = {
        course: '3r',
        activity: 'Futbol',
        status: STATUS_FILTER.ALL,
        search: 'joan',
      };
      const result = filterInscriptions(testData, filters);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Joan');
    });

    it('should return empty when no match', () => {
      const filters: InscriptionFilters = {
        course: '6è',
        activity: 'Natació',
        status: STATUS_FILTER.ALL,
        search: 'xyz',
      };
      const result = filterInscriptions(testData, filters);

      expect(result).toHaveLength(0);
    });
  });
});
