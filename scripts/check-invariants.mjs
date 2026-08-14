#!/usr/bin/env node
/**
 * Guardián de invariantes del repositorio.
 *
 * Comprueba la FORMA del repositorio: dónde puede vivir cada cosa y qué no
 * puede existir. Lo que hay que ejecutar para saberlo (RLS, permisos reales de
 * la base) va en scripts/check-rls.sql, que corre contra un Supabase de verdad
 * en el workflow Supabase.
 *
 * Cada comprobación documenta qué fallo real evita. Si alguna salta por algo
 * legítimo, añade el fichero a la lista de excepciones **con el motivo**, nunca
 * a secas: un guardián que se desactiva no protege de nada.
 *
 * Uso: npm run check:invariants
 */

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const checks = [];

function fail(check, message) {
  errors.push(`[${check}] ${message}`);
}

function ok(check, message) {
  checks.push(`${check}: ${message}`);
}

/**
 * Ficheros versionados MÁS los nuevos que aún no lo están (sin los ignorados).
 * En CI son lo mismo; en local, incluir lo nuevo es justo lo que hace falta:
 * el fichero que acabas de escribir es el que puede romper una invariante.
 */
function trackedFiles() {
  return execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean);
}

function read(file) {
  return readFileSync(join(ROOT, file), 'utf8');
}

const TRACKED = trackedFiles();
const isCode = f => /\.(ts|tsx|mjs|js)$/.test(f);

// ---------------------------------------------------------------------------
// 1. Frontera del cliente de Supabase
//
// Qué evita: que una pantalla hable con la base de datos por su cuenta. Cuando
// eso pasa, la consulta no tiene test (los tests de servicio son los que
// verifican qué se manda a PostgREST), y un filtro olvidado devuelve filas de
// otras familias sin dar ningún error.
// ---------------------------------------------------------------------------
const CAPAS_PERMITIDAS = [
  'src/lib/',
  'src/services/',
  'src/tests/',
  /^src\/features\/[^/]+\/services\//,
];

/** Excepciones con motivo. NO añadir más: lo nuevo va por un servicio. */
const FRONTERA_EXCEPCIONES = new Map([
  ['src/core/contexts/AuthContext.tsx', 'la sesión es infraestructura: pasar por services/ crearía un ciclo con el propio cliente'],
  ['src/core/errors/reporter.ts', 'reportar un fallo no puede depender de la capa que puede estar rota'],
  // Deuda heredada, inventariada el 2026-08-14 en docs/deuda-tecnica.md.
  ['src/components/common/NotificationBell.tsx', 'deuda 2026-08-14: lee notificaciones directamente'],
  ['src/components/public/FeaturedProjects.tsx', 'deuda 2026-08-14: lee proyectos destacados directamente'],
  ['src/pages/AcollidaPage.tsx', 'deuda 2026-08-14: consulta tarifas directamente'],
  ['src/pages/auth/LoginPage.tsx', 'deuda 2026-08-14: usa auth directamente'],
  ['src/pages/InscriptionPage.tsx', 'deuda 2026-08-14: envía la inscripción directamente'],
]);

{
  const IMPORT_SUPABASE = /from\s+['"][^'"]*lib\/supabase['"]/;
  const infractores = TRACKED.filter(f => f.startsWith('src/') && isCode(f))
    .filter(f => IMPORT_SUPABASE.test(read(f)))
    .filter(f => !CAPAS_PERMITIDAS.some(c => (typeof c === 'string' ? f.startsWith(c) : c.test(f))))
    .filter(f => !FRONTERA_EXCEPCIONES.has(f));

  if (infractores.length > 0) {
    for (const f of infractores) {
      fail('frontera-supabase', `${f} importa el cliente de Supabase fuera de services/. Muévelo a un servicio, o documenta la excepción en scripts/check-invariants.mjs`);
    }
  } else {
    ok('frontera-supabase', `${FRONTERA_EXCEPCIONES.size} excepciones documentadas, ninguna nueva`);
  }
}

// ---------------------------------------------------------------------------
// 2. .env.example cubre todo lo que el código lee del entorno
//
// Qué evita: desplegar sin una variable y descubrirlo en producción. Vite
// hornea las VITE_* en tiempo de build: si falta, no hay error, hay
// `undefined` dentro del bundle publicado.
// ---------------------------------------------------------------------------
{
  const ruta = '.env.example';

  if (!existsSync(join(ROOT, ruta))) {
    fail('env-example', 'no existe .env.example: el código lee variables que nadie documenta');
  } else {
    const documentadas = new Set(
      read(ruta)
        .split('\n')
        .map(l => l.replace(/^#\s*/, '').trim())
        .map(l => l.split('=')[0].trim())
        .filter(Boolean),
    );

    const usadas = new Map(); // nombre -> primer fichero donde aparece

    // Este mismo fichero contiene los patrones de búsqueda como texto.
    for (const f of TRACKED.filter(isCode).filter(f => f !== 'scripts/check-invariants.mjs')) {
      const src = read(f);
      // Frontend: import.meta.env.VITE_*
      for (const m of src.matchAll(/import\.meta\.env\.(VITE_[A-Z0-9_]+)/g)) {
        if (!usadas.has(m[1])) usadas.set(m[1], f);
      }
      // Edge Functions: Deno.env.get("X")
      for (const m of src.matchAll(/Deno\.env\.get\(\s*["']([A-Z0-9_]+)["']\s*\)/g)) {
        if (!usadas.has(m[1])) usadas.set(m[1], f);
      }
    }

    const faltan = [...usadas].filter(([nombre]) => !documentadas.has(nombre));
    if (faltan.length > 0) {
      for (const [nombre, f] of faltan) {
        fail('env-example', `${nombre} se lee en ${f} y no está en ${ruta}`);
      }
    } else {
      ok('env-example', `${usadas.size} variables del código, todas documentadas`);
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Sin secretos versionados
//
// Qué evita: la clave service_role o la de Resend en un commit. Con
// service_role, la RLS deja de existir: cualquiera lee y borra todo.
// La anon key NO cuenta: es pública por diseño y viaja en el bundle.
// ---------------------------------------------------------------------------
{
  const PATRONES = [
    [/\bsbp_[a-zA-Z0-9]{20,}/, 'token de acceso de Supabase (sbp_...)'],
    [/\bre_[A-Za-z0-9_]{20,}/, 'clave de API de Resend (re_...)'],
    [/\bAIza[0-9A-Za-z_-]{30,}/, 'clave de API de Google/Gemini (AIza...)'],
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'clave privada'],
  ];

  /** Un JWT de Supabase con role service_role dentro del payload. */
  function llevaServiceRole(texto) {
    for (const m of texto.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.([A-Za-z0-9_-]{20,})\./g)) {
      try {
        const payload = JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8'));
        if (payload?.role === 'service_role') return true;
      } catch {
        // No era un JWT: nada que mirar.
      }
    }
    return false;
  }

  const revisables = TRACKED.filter(f => f !== 'package-lock.json' && !f.startsWith('backup/'));
  let encontrados = 0;

  for (const f of revisables) {
    let src;
    try {
      src = read(f);
    } catch {
      continue; // binario o ilegible
    }
    for (const [re, que] of PATRONES) {
      if (re.test(src)) {
        fail('secretos', `${f} contiene ${que}`);
        encontrados++;
      }
    }
    if (llevaServiceRole(src)) {
      fail('secretos', `${f} contiene un JWT con role service_role`);
      encontrados++;
    }
  }

  if (encontrados === 0) ok('secretos', `${revisables.length} ficheros versionados, ninguno con credenciales`);
}

// ---------------------------------------------------------------------------
// 4. Un único proyecto de Supabase
//
// Qué evita: que un fichero apunte a otro proyecto (o a uno borrado) mientras
// el resto apunta al bueno. Es el fallo que hace que "en local iba" y en
// producción se escriba en una base que no es.
// ---------------------------------------------------------------------------
{
  const refs = new Map(); // ref -> ficheros
  // .env.example lleva un ref de mentira a propósito: es la plantilla.
  for (const f of TRACKED.filter(f => f !== '.env.example')) {
    let src;
    try {
      src = read(f);
    } catch {
      continue;
    }
    for (const m of src.matchAll(/\b([a-z]{20})\.supabase\.co\b/g)) {
      if (!refs.has(m[1])) refs.set(m[1], []);
      if (!refs.get(m[1]).includes(f)) refs.get(m[1]).push(f);
    }
  }

  if (refs.size > 1) {
    for (const [ref, ficheros] of refs) {
      fail('project-ref', `${ref} aparece en ${ficheros.slice(0, 4).join(', ')}${ficheros.length > 4 ? '…' : ''}`);
    }
    fail('project-ref', 'hay más de un proyecto de Supabase referenciado en el repositorio');
  } else {
    const [[ref, ficheros]] = refs.size === 1 ? [...refs] : [['(ninguno)', []]];
    ok('project-ref', `${ref} en ${ficheros.length} ficheros, sin divergencias`);
  }
}

// ---------------------------------------------------------------------------
// 5. Misma versión de la CLI de Supabase en todos los workflows
//
// Qué evita: que el job que valida el esquema y el que lo despliega usen
// versiones distintas. Verde en la validación, y otra cosa aplicada a la base
// de las familias.
// ---------------------------------------------------------------------------
{
  const workflows = TRACKED.filter(f => f.startsWith('.github/workflows/') && f.endsWith('.yml'));
  const versiones = new Map();

  for (const f of workflows) {
    const src = read(f);
    // supabase/setup-cli@vN ... version: X.Y.Z (el `with:` va justo detrás)
    for (const m of src.matchAll(/supabase\/setup-cli@[^\n]*\n\s*with:\s*\n\s*version:\s*([0-9.]+)/g)) {
      if (!versiones.has(m[1])) versiones.set(m[1], []);
      versiones.get(m[1]).push(f);
    }
  }

  if (versiones.size > 1) {
    fail('cli-supabase', `versiones distintas de la CLI en los workflows: ${[...versiones.keys()].join(', ')}`);
  } else if (versiones.size === 1) {
    const [[v, usos]] = [...versiones];
    ok('cli-supabase', `${v} en los ${usos.length} usos`);
  }
}

// ---------------------------------------------------------------------------
// 6. HTML crudo solo donde se sanea
//
// Qué evita: volver a abrir el XSS almacenado que ya apareció una vez (ver
// src/tests/htmlSanitizer.test.ts). Todo lo que entra por el editor de noticias
// o por la configuración pasa por sanitizeRichTextHtml antes de pintarse.
// ---------------------------------------------------------------------------
const HTML_CRUDO_EXCEPCIONES = new Map([
  ['src/components/admin/news/NewsPreview.tsx', 'recibe previewHtml ya saneado en NewsEditorPage.tsx:84'],
  ['src/pages/NewsDetailPage.tsx', 'pinta safeHtml, saneado en el useMemo de la línea 35'],
]);

{
  const infractores = TRACKED.filter(f => f.startsWith('src/') && f.endsWith('.tsx'))
    .filter(f => read(f).includes('dangerouslySetInnerHTML'))
    .filter(f => !read(f).includes('sanitizeRichTextHtml'))
    .filter(f => !HTML_CRUDO_EXCEPCIONES.has(f));

  if (infractores.length > 0) {
    for (const f of infractores) {
      fail('html-crudo', `${f} pinta HTML sin pasar por sanitizeRichTextHtml`);
    }
  } else {
    ok('html-crudo', `${HTML_CRUDO_EXCEPCIONES.size} excepciones documentadas, ninguna nueva`);
  }
}

// ---------------------------------------------------------------------------

if (errors.length > 0) {
  console.error(`\n✖ ${errors.length} invariante(s) rota(s):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error('\nCada una está explicada en scripts/check-invariants.mjs.\n');
  process.exit(1);
}

console.log(`✓ ${checks.length} invariantes en pie:`);
for (const c of checks) console.log(`  · ${c}`);
