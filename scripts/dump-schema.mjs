#!/usr/bin/env node
/**
 * Extrae de producción el DDL de las tablas que ninguna migración crea.
 *
 * El repositorio solo contiene parches incrementales: el esquema base se creó a
 * mano en el panel de Supabase y nunca se capturó. Por eso `supabase start`
 * falla en la segunda migración y no se puede levantar un entorno nuevo.
 *
 * Este script SOLO LEE (todas las consultas son SELECT sobre el catálogo) y
 * escribe el SQL por stdout. No aplica nada.
 *
 * Uso:
 *   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/dump-schema.mjs > salida.sql
 *
 * El token se saca de Supabase → Account → Access Tokens.
 */

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? 'zaxbtnjkidqwzqsehvld';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!TOKEN) {
  console.error('Falta SUPABASE_ACCESS_TOKEN en el entorno.');
  process.exit(1);
}

/** Tablas presentes en producción que ninguna migración del repo crea. */
const TABLES = [
  'profiles',
  'admin_users',
  'site_config',
  'inscripcions',
  'inscripcions_history',
  'payments',
  'payment_history',
  'monthly_payment_generation',
  'acollida_rates',
  'finance_transactions',
  'notifications',
  'shop_products',
  'shop_variants',
  'shop_orders',
  'shop_order_items',
];

async function query(sql) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql }),
    },
  );

  if (!response.ok) {
    throw new Error(`${response.status} ${await response.text()}`);
  }
  return response.json();
}

const list = TABLES.map((t) => `'${t}'`).join(',');

const columns = await query(`
  select c.relname as tabla, a.attname as columna,
         format_type(a.atttypid, a.atttypmod) as tipo,
         a.attnotnull as no_nulo,
         pg_get_expr(d.adbin, d.adrelid) as por_defecto,
         a.attnum as orden
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  where n.nspname = 'public' and c.relname in (${list})
    and a.attnum > 0 and not a.attisdropped
  order by c.relname, a.attnum`);

const constraints = await query(`
  select c.relname as tabla, con.conname as nombre, con.contype as tipo,
         pg_get_constraintdef(con.oid) as def
  from pg_constraint con
  join pg_class c on c.oid = con.conrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname in (${list})
  order by c.relname, con.contype, con.conname`);

const indexes = await query(`
  select tablename as tabla, indexname as nombre, indexdef as def
  from pg_indexes
  where schemaname = 'public' and tablename in (${list})
  order by tablename, indexname`);

const rls = await query(`
  select c.relname as tabla, c.relrowsecurity as activo
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname in (${list})`);

const policies = await query(`
  select tablename as tabla, policyname as nombre, cmd, roles::text as roles,
         qual, with_check
  from pg_policies
  where schemaname = 'public' and tablename in (${list})
  order by tablename, policyname`);

// `handle_audit_log` y sus triggers NO se incluyen: los crea
// 20260801140000_audit_logs_definition.sql, y adelantarlos rompería el orden.
// Ocho migraciones insertan en site_config antes de esa fecha, y con el trigger
// puesto intentarían escribir en `audit_logs` cuando la tabla aún no existe.
const AUDIT_TRIGGER_PREFIX = 'trg_audit_';

/**
 * Los webhooks a Edge Functions llevan el service_role JWT (y algún secreto
 * compartido) escrito dentro de la definición del trigger. Volcarlos a un
 * fichero versionado sería publicar esas credenciales.
 */
const SECRET_PATTERNS = [/eyJ[A-Za-z0-9._-]{20,}/, /x-webhook-secret/i, /service_role/i];
const carriesSecret = (sql) => SECRET_PATTERNS.some((re) => re.test(sql));

const triggersRaw = await query(`
  select c.relname as tabla, t.tgname as nombre, pg_get_triggerdef(t.oid) as def
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname in (${list}) and not t.tgisinternal
  order by c.relname, t.tgname`);

const authTriggersRaw = await query(`
  select t.tgname as nombre, pg_get_triggerdef(t.oid) as def
  from pg_trigger t
  where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal`);

const triggerFunction = (def) => def.match(/EXECUTE (?:PROCEDURE|FUNCTION) ([a-z0-9_."]+)\s*\(/i)?.[1];

// Un trigger solo sirve si su función existe ya. Se recogen las funciones de
// todos los triggers que se van a emitir y se vuelcan antes que ellos.
// Funciones que existen en produccion y que ninguna migracion crea. Sin ellas,
// un entorno nuevo se queda sin la mitad de la logica de negocio (altas y bajas
// de inscripcion, generacion de recibos, backups...).
const ORPHAN_FUNCTIONS = [
  'create_inscripcions_backup',
  'dar_de_alta_inscripcion',
  'dar_de_baja_inscripcion',
  'fn_create_payments_for_inscription',
  'generate_slug',
  'handle_new_contact_message',
  'hash_password',
  'prevent_triggers_on_inscripcions',
  'record_payment_received',
  'remove_baja_payments_for_month',
];

const neededFunctions = new Set(['is_admin', ...ORPHAN_FUNCTIONS]);
for (const trg of [...triggersRaw, ...authTriggersRaw]) {
  if (trg.nombre.startsWith(AUDIT_TRIGGER_PREFIX)) continue;
  if (carriesSecret(trg.def)) continue;
  const fn = triggerFunction(trg.def)?.replace(/^public\.|"/g, '');
  if (fn) neededFunctions.add(fn);
}

const functionList = [...neededFunctions].map((f) => `'${f}'`).join(',');
const functions = await query(`
  select p.proname as nombre, pg_get_functiondef(p.oid) as def
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname in (${functionList})
  order by p.proname`);

const definedFunctions = new Set(functions.map((f) => f.nombre));

const authTriggers = authTriggersRaw;

const by = (rows, key) => {
  const map = new Map();
  for (const row of rows) {
    const list = map.get(row[key]) ?? [];
    list.push(row);
    map.set(row[key], list);
  }
  return map;
};

const colsByTable = by(columns, 'tabla');
const consByTable = by(constraints, 'tabla');
const idxByTable = by(indexes, 'tabla');
const polByTable = by(policies, 'tabla');
const trgByTable = by(triggersRaw, 'tabla');
const rlsByTable = new Map(rls.map((r) => [r.tabla, r.activo]));

const out = [];
const w = (line = '') => out.push(line);

w('-- Esquema base: tablas que ninguna migración creaba.');
w('--');
w('-- Generado con `node scripts/dump-schema.mjs` leyendo el catálogo de');
w('-- producción. Corresponde al estado del esquema el 2026-08-11.');
w('--');
w('-- Va con la fecha más antigua de todas para que un entorno nuevo cree');
w('-- primero estas tablas y las 57 migraciones siguientes se apliquen encima.');
w('-- Todo es idempotente (IF NOT EXISTS / DROP ... IF EXISTS), así que también');
w('-- es inofensivo contra una base que ya las tenga.');
w();

w('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
w();

// Tres migraciones de 2025 crean triggers que llaman a log_audit_change(), una
// funcion que NO existe en produccion: esos ficheros nunca se aplicaron tal
// cual. La auditoria real la hacen los trg_audit_* con handle_audit_log(), que
// llegan en 20260801140000. Sin este stub, un entorno nuevo se atasca en la
// tercera migracion.
w('-- Stub de compatibilidad, ver comentario en scripts/dump-schema.mjs.');
w(`CREATE OR REPLACE FUNCTION public.log_audit_change()
RETURNS trigger LANGUAGE plpgsql AS $stub$
BEGIN
  -- Intencionadamente sin efecto: la auditoria de verdad son los trg_audit_*.
  RETURN COALESCE(NEW, OLD);
END;
$stub$;`);
w();

w('-- ============================ TABLAS ============================');
for (const table of TABLES) {
  const cols = colsByTable.get(table);
  if (!cols) {
    w(`-- AVISO: ${table} no encontrada en producción`);
    continue;
  }
  w();
  w(`CREATE TABLE IF NOT EXISTS public.${table} (`);
  const lines = cols.map((c) => {
    let line = `  ${c.columna} ${c.tipo}`;
    if (c.por_defecto) line += ` DEFAULT ${c.por_defecto}`;
    if (c.no_nulo) line += ' NOT NULL';
    return line;
  });
  // Las PRIMARY KEY y los CHECK van dentro del CREATE; las FK después, para no
  // depender del orden de creación entre tablas.
  for (const con of consByTable.get(table) ?? []) {
    if (con.tipo === 'p' || con.tipo === 'c' || con.tipo === 'u') {
      lines.push(`  CONSTRAINT ${con.nombre} ${con.def}`);
    }
  }
  w(lines.join(',\n'));
  w(');');
}

w();
w('-- ========================= CLAVES AJENAS =========================');
for (const table of TABLES) {
  for (const con of consByTable.get(table) ?? []) {
    if (con.tipo !== 'f') continue;
    w(`DO $$ BEGIN`);
    w(`  ALTER TABLE public.${table} ADD CONSTRAINT ${con.nombre} ${con.def};`);
    w(`EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
  }
}

w();
w('-- ============================ ÍNDICES ============================');
for (const table of TABLES) {
  const cons = new Set((consByTable.get(table) ?? []).map((c) => c.nombre));
  for (const idx of idxByTable.get(table) ?? []) {
    // Los índices que respaldan una PK/UNIQUE ya los crea la constraint.
    if (cons.has(idx.nombre)) continue;
    w(idx.def.replace(/^CREATE (UNIQUE )?INDEX /, 'CREATE $1INDEX IF NOT EXISTS ') + ';');
  }
}

w();
w('-- =========================== FUNCIONES ===========================');
for (const fn of functions) {
  w();
  w(`${fn.def};`);
}

w();
w('-- =========================== TRIGGERS ============================');
w('-- Los trg_audit_* quedan fuera a propósito: los crea');
w('-- 20260801140000_audit_logs_definition.sql, junto con la tabla audit_logs a');
w('-- la que escriben. Adelantarlos aquí haría fallar las migraciones anteriores');
w('-- que insertan en site_config.');
w('--');
w('-- Los webhooks a Edge Functions tampoco: su definición lleva el');
w('-- service_role dentro de la cabecera Authorization, y esto es un fichero');
w('-- versionado. Se gestionan fuera de banda (ver docs/deuda-tecnica.md).');
const omitted = [];
for (const table of TABLES) {
  for (const trg of trgByTable.get(table) ?? []) {
    if (trg.nombre.startsWith(AUDIT_TRIGGER_PREFIX)) continue;
    if (carriesSecret(trg.def)) {
      omitted.push(`${trg.nombre} (webhook, lleva credenciales)`);
      continue;
    }
    const fn = triggerFunction(trg.def)?.replace(/^public\.|"/g, '');
    if (fn && !definedFunctions.has(fn)) {
      omitted.push(`${trg.nombre} (su función ${fn}() la crea una migración posterior)`);
      continue;
    }
    w(`DROP TRIGGER IF EXISTS ${trg.nombre} ON public.${table};`);
    w(`${trg.def};`);
  }
}
if (omitted.length > 0) {
  w();
  w('-- Omitidos por llevar credenciales en su definición:');
  for (const name of omitted) w(`--   ${name}`);
}
for (const trg of authTriggers) {
  w(`DROP TRIGGER IF EXISTS ${trg.nombre} ON auth.users;`);
  w(`${trg.def};`);
}

w();
w('-- ======================== RLS Y POLÍTICAS ========================');
for (const table of TABLES) {
  if (!rlsByTable.get(table)) continue;
  w(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);
}
w();
for (const table of TABLES) {
  for (const pol of polByTable.get(table) ?? []) {
    const roles = pol.roles.replace(/[{}]/g, '');
    w(`DROP POLICY IF EXISTS "${pol.nombre}" ON public.${table};`);
    let sql = `CREATE POLICY "${pol.nombre}" ON public.${table} FOR ${pol.cmd} TO ${roles}`;
    if (pol.qual) sql += `\n  USING (${pol.qual})`;
    if (pol.with_check) sql += `\n  WITH CHECK (${pol.with_check})`;
    w(`${sql};`);
  }
}

process.stdout.write(out.join('\n') + '\n');
