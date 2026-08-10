#!/usr/bin/env node
/**
 * Auditoría de paridad i18n (ca/es/en).
 *
 * Comprueba, tomando `ca` como fuente:
 *   1. Claves que faltan en es/en          -> la web cae al catalán sin avisar
 *   2. Claves sobrantes en es/en           -> restos de refactors, ruido
 *   3. Marcas desincronizadas              -> {{nombre}} perdido = texto roto en pantalla
 *   4. Valores vacíos                      -> i18next muestra la clave cruda
 *   5. Claves usadas en src/ pero sin definir -> la clave cruda sale en la UI
 *   6. Valores idénticos al catalán        -> sospecha de "sin traducir" (aviso)
 *
 * Los cinco primeros son errores (exit 1). El sexto es solo aviso: hay claves
 * que coinciden a propósito ("AFA", "WhatsApp", "Email"); si es tu caso, añade
 * la clave a scripts/i18n/ignore.json.
 *
 * Además deja en tmp/i18n-batch.json el lote pendiente de traducir, que es la
 * entrada del paso de IA (ver .claude/skills/i18n-parity).
 *
 * Uso: npm run i18n:audit
 */

import { readFileSync, readdirSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  SRC_DIR, TMP_DIR, SOURCE_LNG, TARGET_LNGS,
  readLocale, flatten, extractMarkers, sameMarkers, readIgnoreList,
} from './lib.mjs';

const BATCH_PATH = join(TMP_DIR, 'i18n-batch.json');
const SUSPECTS_PATH = join(TMP_DIR, 'i18n-suspects.json');
const CODE_EXT = /\.(tsx?|jsx?)$/;

/** Recorre src/ devolviendo rutas de ficheros de código. */
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (CODE_EXT.test(entry)) out.push(full);
  }
  return out;
}

/**
 * Claves referenciadas de forma literal: t('a.b'), t("a.b"), i18nKey="a.b".
 * También captura el defaultValue de t('a.b', 'texto'): una clave sin definir
 * con defaultValue no muestra la clave cruda, muestra ese texto —en el idioma
 * en que se escribió— a los tres idiomas. Falla en silencio, así que interesa
 * distinguirla en el informe.
 *
 * Las dinámicas (t(variable), t(`a.${x}`)) no se pueden resolver estáticamente;
 * se cuentan aparte porque invalidan la detección de claves huérfanas.
 */
function scanCode() {
  const used = new Map();
  let dynamic = 0;

  for (const file of walk(SRC_DIR)) {
    const code = readFileSync(file, 'utf8');
    const from = relative(SRC_DIR, file);

    for (const [, key, fallback] of code.matchAll(/\bt\(\s*['"]([\w.\-]+)['"]\s*(?:,\s*['"]([^'"]*)['"])?/g)) {
      if (!used.has(key)) used.set(key, { file: from, fallback });
    }
    for (const [, key] of code.matchAll(/\bi18nKey\s*=\s*["']([\w.\-]+)["']/g)) {
      if (!used.has(key)) used.set(key, { file: from });
    }
    dynamic += (code.match(/\bt\(\s*[`a-zA-Z_$]/g) ?? []).length;
  }
  return { used, dynamic };
}

const source = flatten(readLocale(SOURCE_LNG));
const ignore = readIgnoreList();
const errors = [];
const warnings = [];
const suspects = new Map();
const batch = new Map();

// --- 1..4: comparación de cada idioma destino contra el catalán --------------
for (const lng of TARGET_LNGS) {
  const target = flatten(readLocale(lng));

  for (const [key, sourceText] of Object.entries(source)) {
    const value = target[key];

    if (value === undefined) {
      errors.push(`[${lng}] falta la clave  ${key}`);
      if (!batch.has(key)) batch.set(key, { key, [SOURCE_LNG]: sourceText, needs: [] });
      batch.get(key).needs.push(lng);
      continue;
    }

    if (typeof value === 'string' && value.trim() === '') {
      errors.push(`[${lng}] valor vacío     ${key}`);
      if (!batch.has(key)) batch.set(key, { key, [SOURCE_LNG]: sourceText, needs: [] });
      batch.get(key).needs.push(lng);
      continue;
    }

    if (!sameMarkers(sourceText, value)) {
      errors.push(
        `[${lng}] marcas distintas ${key}\n` +
        `        ${SOURCE_LNG}: ${extractMarkers(sourceText).join(' ') || '(ninguna)'}\n` +
        `        ${lng}: ${extractMarkers(value).join(' ') || '(ninguna)'}`
      );
      continue;
    }

    // Aviso, no error: hay coincidencias legítimas.
    if (value === sourceText && !ignore.has(key) && /\p{L}{4}/u.test(String(value))) {
      warnings.push(`[${lng}] idéntico a ${SOURCE_LNG}  ${key}  "${String(value).slice(0, 60)}"`);
      if (!suspects.has(key)) suspects.set(key, { key, [SOURCE_LNG]: sourceText, identical: [] });
      suspects.get(key).identical.push(lng);
    }
  }

  for (const key of Object.keys(target)) {
    if (!(key in source)) errors.push(`[${lng}] clave sobrante  ${key}  (no existe en ${SOURCE_LNG})`);
  }
}

// --- 5: claves que el código usa pero nadie define ---------------------------
const { used, dynamic } = scanCode();
for (const [key, { file, fallback }] of used) {
  if (key in source) continue;
  errors.push(
    fallback
      ? `[código] clave sin definir  ${key}  (${file})\n` +
        `        cae a defaultValue "${fallback}" en los 3 idiomas`
      : `[código] clave sin definir  ${key}  (${file})\n` +
        `        se muestra la clave cruda en pantalla`
  );
}

const orphans = Object.keys(source).filter((key) => !used.has(key));

// --- salida ------------------------------------------------------------------
const bar = '─'.repeat(72);
console.log(`${bar}\nAuditoría i18n · fuente: ${SOURCE_LNG} · destinos: ${TARGET_LNGS.join(', ')}`);
console.log(`${Object.keys(source).length} claves en ${SOURCE_LNG}\n${bar}`);

if (errors.length) {
  console.log(`\n✗ ${errors.length} error(es):\n`);
  for (const error of errors) console.log(`  ${error}`);
}

if (warnings.length) {
  console.log(`\n! ${warnings.length} aviso(s) de posible falta de traducción:\n`);
  for (const warning of warnings.slice(0, 40)) console.log(`  ${warning}`);
  if (warnings.length > 40) console.log(`  … y ${warnings.length - 40} más`);
  console.log(`\n  Si alguna coincide a propósito, añádela a scripts/i18n/ignore.json`);
}

if (orphans.length) {
  const note = dynamic ? ` (poco fiable: ${dynamic} llamadas t() dinámicas en src/)` : '';
  console.log(`\ni ${orphans.length} clave(s) definidas pero sin uso literal en src/${note}`);
  for (const key of orphans.slice(0, 15)) console.log(`  ${key}`);
  if (orphans.length > 15) console.log(`  … y ${orphans.length - 15} más`);
}

if (batch.size || suspects.size) mkdirSync(TMP_DIR, { recursive: true });

if (batch.size) {
  const payload = { source: SOURCE_LNG, items: [...batch.values()] };
  writeFileSync(BATCH_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`\n→ ${batch.size} clave(s) por traducir en tmp/i18n-batch.json`);
}

if (suspects.size) {
  const payload = { source: SOURCE_LNG, items: [...suspects.values()] };
  writeFileSync(SUSPECTS_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`→ ${suspects.size} sospechoso(s) en tmp/i18n-suspects.json`);
}

if (!errors.length && !warnings.length) console.log('\n✓ Paridad completa.');

console.log(`\n${bar}`);
process.exit(errors.length ? 1 : 0);
