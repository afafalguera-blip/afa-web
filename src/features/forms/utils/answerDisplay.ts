/**
 * Turning a stored answer back into text the reader understands.
 *
 * Since 2026-09-05 a choice is STORED in the source language (es) whatever
 * language the visitor filled the form in, and translated only when shown. That
 * is what makes a listing countable: before, the same answer arrived as "Tot el
 * període" or "Todo el periodo " depending on the family, and no filter could
 * put the two together.
 *
 * Answers saved before that date are still in the visitor's language, so the
 * lookup searches the source options AND every translation. A legacy Catalan
 * answer therefore lands on the right option too, and the admin sees one single
 * label for all of them.
 */

import type { FormField, FormTemplate } from '../types/formTypes';
import { resolveField } from './resolveTranslations';

const norm = (value: string): string => value.trim().toLowerCase();

/**
 * Position of the option a stored `value` refers to, or -1 when it matches
 * none (free text, or an option the admin has since renamed).
 */
export function canonicalOptionIndex(template: FormTemplate, field: FormField, value: string): number {
  const options = field.options;
  if (!options || options.length === 0 || value === '') return -1;

  const target = norm(value);

  const inSource = options.findIndex((opt) => norm(opt) === target);
  if (inSource !== -1) return inSource;

  for (const translation of Object.values(template.translations ?? {})) {
    const translated = translation?.fields?.[field.id]?.options;
    if (!translated) continue;
    const hit = translated.findIndex((opt) => typeof opt === 'string' && norm(opt) === target);
    if (hit !== -1 && hit < options.length) return hit;
  }

  return -1;
}

/** The label for one stored value in `lang`. Unknown values are shown as they are. */
export function optionLabel(template: FormTemplate, field: FormField, value: string, lang: string | undefined): string {
  const index = canonicalOptionIndex(template, field, value);
  if (index === -1) return value;
  return resolveField(template, field, lang).options?.[index] ?? value;
}

/**
 * One answer as a single string, ready for a table cell, a CSV or a PDF.
 * Multi-choice answers keep the order the visitor sent them in.
 */
export function displayAnswer(
  template: FormTemplate,
  field: FormField,
  value: unknown,
  lang: string | undefined,
): string {
  if (value == null || value === '') return '';
  if (field.type === 'file') return String(value);

  if (Array.isArray(value)) {
    return value.map((item) => optionLabel(template, field, String(item), lang)).join(', ');
  }

  return optionLabel(template, field, String(value), lang);
}
