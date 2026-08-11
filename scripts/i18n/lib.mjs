/**
 * Utilidades compartidas por audit.mjs y apply.mjs.
 *
 * `ca` es el idioma fuente: es el `fallbackLng` de i18n.ts y el único que la
 * web sirve cuando el visitante no ha elegido idioma, así que es el que define
 * qué claves deben existir.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const LOCALES_DIR = join(ROOT, 'public', 'locales');
export const SRC_DIR = join(ROOT, 'src');
export const TMP_DIR = join(ROOT, 'tmp');
export const SOURCE_LNG = 'ca';
export const TARGET_LNGS = ['es', 'en'];

export const LNG_NAMES = { ca: 'catalán', es: 'castellano', en: 'inglés' };

export const localePath = (lng) => join(LOCALES_DIR, lng, 'translation.json');

export const readLocale = (lng) => JSON.parse(readFileSync(localePath(lng), 'utf8'));

/**
 * Escribe con salto final y conservando el fin de línea que ya tenía el fichero.
 * `ca` está en CRLF y es/en en LF; normalizarlos aquí convertiría cada cambio de
 * una clave en un diff de 3.000 líneas.
 */
export function writeLocale(lng, data) {
  const path = localePath(lng);
  const eol = readFileSync(path, 'utf8').includes('\r\n') ? '\r\n' : '\n';
  const json = JSON.stringify(data, null, 2).replaceAll('\n', eol);
  writeFileSync(path, `${json}${eol}`, 'utf8');
}

/** { a: { b: 'x' } } -> { 'a.b': 'x' }. Los arrays se tratan como hoja. */
export function flatten(obj, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) flatten(value, path, out);
    else out[path] = value;
  }
  return out;
}

/**
 * Escribe `value` en la ruta `a.b.c` de `obj`, creando los objetos intermedios.
 * Muta en vez de reconstruir para no alterar el orden de las claves existentes:
 * un reordenado convierte cualquier diff en ilegible.
 */
export function setPath(obj, path, value) {
  const parts = path.split('.');
  let node = obj;
  for (const part of parts.slice(0, -1)) {
    if (!node[part] || typeof node[part] !== 'object') node[part] = {};
    node = node[part];
  }
  node[parts.at(-1)] = value;
}

/**
 * Marcas que deben sobrevivir intactas a la traducción:
 *   {{nombre}}      interpolación
 *   $t(otra.clave)  referencia a otra clave
 *   <0> </0> <1/>   índices de <Trans>
 * Se devuelven ordenadas para poder comparar dos textos por igualdad de conjunto.
 */
export function extractMarkers(text) {
  if (typeof text !== 'string') return [];
  const markers = text.match(/\{\{[^}]*\}\}|\$t\([^)]*\)|<\/?\d+\s*\/?>/g) ?? [];
  return markers.sort();
}

export const sameMarkers = (a, b) => {
  const [ma, mb] = [extractMarkers(a), extractMarkers(b)];
  return ma.length === mb.length && ma.every((marker, i) => marker === mb[i]);
};

/** Claves que legítimamente coinciden entre idiomas (marcas, siglas, símbolos). */
export function readIgnoreList() {
  try {
    return new Set(JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'ignore.json'), 'utf8')));
  } catch {
    return new Set();
  }
}
