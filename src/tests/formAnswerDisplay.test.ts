import { describe, expect, it } from 'vitest';
import { canonicalOptionIndex, displayAnswer, optionLabel } from '../features/forms/utils/answerDisplay';
import type { FormField, FormTemplate } from '../features/forms/types/formTypes';

/**
 * Modelled on the real end-of-year acollida form, the one that produced both
 * "Tot el període" and "Todo el periodo " as answers to the same question.
 */
const periode: FormField = {
  id: 'periode',
  type: 'checkbox',
  label: 'Periodo',
  required: true,
  options: ['Todo el periodo', 'Sólo algunos días'],
};

const nom: FormField = { id: 'nom', type: 'text', label: 'Nombre', required: true };

const template: FormTemplate = {
  id: 'form-1',
  title: 'Acogida',
  description: '',
  slug: 'acollida-test',
  fields_schema: [periode, nom],
  is_active: true,
  translations: {
    ca: { fields: { periode: { label: 'Període', options: ['Tot el període', 'Només alguns dies'] } } },
    en: { fields: { periode: { label: 'Period', options: ['The whole period', 'Only some days'] } } },
  },
};

describe('canonicalOptionIndex', () => {
  it('finds an answer stored in the source language', () => {
    expect(canonicalOptionIndex(template, periode, 'Todo el periodo')).toBe(0);
  });

  it('finds a legacy answer stored in the language the family used', () => {
    expect(canonicalOptionIndex(template, periode, 'Tot el període')).toBe(0);
    expect(canonicalOptionIndex(template, periode, 'Only some days')).toBe(1);
  });

  it('ignores the stray whitespace and casing of a hand-typed option', () => {
    expect(canonicalOptionIndex(template, periode, 'Todo el periodo ')).toBe(0);
    expect(canonicalOptionIndex(template, periode, 'TOT EL PERÍODE')).toBe(0);
  });

  it('gives up on values that match no option', () => {
    expect(canonicalOptionIndex(template, periode, 'la semana del 8')).toBe(-1);
    expect(canonicalOptionIndex(template, nom, 'Jan Puig')).toBe(-1);
  });
});

describe('optionLabel', () => {
  it('shows every answer to the same question with one single label', () => {
    // Las dos formas en que llegó la MISMA respuesta antes de 2026-09-05.
    expect(optionLabel(template, periode, 'Todo el periodo', 'ca')).toBe('Tot el període');
    expect(optionLabel(template, periode, 'Tot el període', 'ca')).toBe('Tot el període');
  });

  it('follows the language the admin is reading in', () => {
    expect(optionLabel(template, periode, 'Todo el periodo', 'en')).toBe('The whole period');
    expect(optionLabel(template, periode, 'Tot el període', 'es')).toBe('Todo el periodo');
  });

  it('leaves an unknown value untouched instead of blanking it', () => {
    expect(optionLabel(template, periode, 'la semana del 8', 'ca')).toBe('la semana del 8');
  });
});

describe('displayAnswer', () => {
  it('joins a multi-choice answer with every option translated', () => {
    expect(displayAnswer(template, periode, ['Todo el periodo', 'Only some days'], 'ca')).toBe(
      'Tot el període, Només alguns dies',
    );
  });

  it('returns free text as it was written', () => {
    expect(displayAnswer(template, nom, 'Jan Puig', 'ca')).toBe('Jan Puig');
  });

  it('is empty for an unanswered field', () => {
    expect(displayAnswer(template, nom, '', 'ca')).toBe('');
    expect(displayAnswer(template, periode, null, 'ca')).toBe('');
    expect(displayAnswer(template, periode, [], 'ca')).toBe('');
  });

  it('keeps a file answer as its stored path', () => {
    const file: FormField = { id: 'doc', type: 'file', label: 'Document', required: false };
    expect(displayAnswer(template, file, 'acollida/doc.pdf', 'ca')).toBe('acollida/doc.pdf');
  });
});
