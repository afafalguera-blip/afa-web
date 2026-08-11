#!/usr/bin/env node
/**
 * Aplica las traducciones generadas por IA a public/locales/{es,en}.
 *
 * Es la mitad verificadora del harness: la IA propone, este script decide. Nada
 * se escribe si algo no cuadra, porque un fichero de traducciones corrupto no
 * rompe el build (i18next carga en runtime) y llegaría a producción sin ruido.
 *
 * Entrada: tmp/i18n-translated.json
 *   { "es": { "clave.a": "texto" }, "en": { "clave.a": "text" } }
 *
 * Rechaza el lote completo si alguna entrada:
 *   - no estaba pedida en tmp/i18n-batch.json (clave inventada)
 *   - no existe en el catalán
 *   - pierde o altera una marca {{x}} / $t(x) / <0>
 *   - viene vacía o no es texto
 *
 * Uso:
 *   npm run i18n:apply -- --dry-run   # verifica y enseña el diff, no escribe
 *   npm run i18n:apply                # verifica y escribe
 *   npm run i18n:apply -- --partial   # permite lotes incompletos (tandas)
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  TMP_DIR, SOURCE_LNG, TARGET_LNGS, LNG_NAMES,
  readLocale, writeLocale, flatten, setPath, extractMarkers, sameMarkers,
} from './lib.mjs';

const BATCH_PATH = join(TMP_DIR, 'i18n-batch.json');
const INPUT_PATH = join(TMP_DIR, 'i18n-translated.json');
const DRY_RUN = process.argv.includes('--dry-run');
const PARTIAL = process.argv.includes('--partial');

for (const path of [BATCH_PATH, INPUT_PATH]) {
  if (!existsSync(path)) {
    console.error(`Falta ${path}.\nEjecuta primero: npm run i18n:audit`);
    process.exit(1);
  }
}

const batch = JSON.parse(readFileSync(BATCH_PATH, 'utf8'));
const input = JSON.parse(readFileSync(INPUT_PATH, 'utf8'));
const source = flatten(readLocale(SOURCE_LNG));

/** clave -> idiomas que el audit pidió traducir. */
const requested = new Map(batch.items.map((item) => [item.key, new Set(item.needs)]));

const rejected = [];
const accepted = [];
const pending = [];

for (const lng of TARGET_LNGS) {
  const entries = input[lng] ?? {};

  for (const [key, value] of Object.entries(entries)) {
    const reject = (reason) => rejected.push(`[${lng}] ${key}\n        ${reason}`);

    if (!requested.get(key)?.has(lng)) {
      reject(`no estaba en el lote pedido para ${lng}`);
      continue;
    }
    if (typeof value !== 'string' || value.trim() === '') {
      reject('valor vacío o no textual');
      continue;
    }
    if (!(key in source)) {
      reject(`no existe en ${SOURCE_LNG}`);
      continue;
    }
    if (!sameMarkers(source[key], value)) {
      reject(
        `marcas alteradas\n` +
        `        ${SOURCE_LNG}: ${extractMarkers(source[key]).join(' ') || '(ninguna)'}\n` +
        `        ${lng}: ${extractMarkers(value).join(' ') || '(ninguna)'}`
      );
      continue;
    }
    accepted.push({ lng, key, value });
  }

  for (const [key, needs] of requested) {
    if (needs.has(lng) && !(key in entries)) pending.push(`[${lng}] ${key}`);
  }
}

if (rejected.length) {
  console.error(`✗ ${rejected.length} traducción(es) rechazada(s). No se escribe nada:\n`);
  for (const reason of rejected) console.error(`  ${reason}`);
  console.error('\nCorrige tmp/i18n-translated.json y vuelve a ejecutar.');
  process.exit(1);
}

if (pending.length && !PARTIAL) {
  console.error(`✗ Faltan ${pending.length} clave(s) del lote. No se escribe nada:\n`);
  for (const item of pending.slice(0, 30)) console.error(`  ${item}`);
  if (pending.length > 30) console.error(`  … y ${pending.length - 30} más`);
  console.error('\nCompleta el lote, o usa --partial si vas por tandas.');
  process.exit(1);
}

if (!accepted.length) {
  console.log('Nada que aplicar.');
  process.exit(0);
}

for (const lng of TARGET_LNGS) {
  const changes = accepted.filter((item) => item.lng === lng);
  if (!changes.length) continue;

  const locale = readLocale(lng);
  for (const { key, value } of changes) setPath(locale, key, value);
  if (!DRY_RUN) writeLocale(lng, locale);

  console.log(`\n${DRY_RUN ? '(dry-run) ' : ''}${LNG_NAMES[lng]} · ${changes.length} clave(s):`);
  for (const { key, value } of changes.slice(0, 20)) {
    console.log(`  ${key}\n    ${SOURCE_LNG}: ${source[key]}\n    ${lng}: ${value}`);
  }
  if (changes.length > 20) console.log(`  … y ${changes.length - 20} más`);
}

if (pending.length) console.log(`\n! Quedan ${pending.length} clave(s) del lote sin traducir (--partial).`);
console.log(`\n${DRY_RUN ? 'Nada escrito (--dry-run).' : '✓ Escrito. Ejecuta npm run i18n:audit para confirmar.'}`);
