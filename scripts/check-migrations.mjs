#!/usr/bin/env node
/**
 * Guarda de nombres de migración.
 *
 * `supabase db push` identifica cada migración por los dígitos anteriores al
 * primer `_`. Dos ficheros con la misma versión son ambiguos (el orden entre
 * ellos depende del alfabeto) y una versión de 8 dígitos choca con cualquier
 * otra migración creada el mismo día.
 *
 * El histórico arrastra 18 ficheros con ese problema. Renombrarlos rompería la
 * tabla `supabase_migrations.schema_migrations` de producción, así que quedan
 * congelados en LEGACY: la guarda solo exige el formato correcto a lo nuevo.
 *
 * Uso: node scripts/check-migrations.mjs
 */

import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations');

/**
 * Migraciones anteriores a esta guarda, ya aplicadas en producción.
 * NO añadir entradas nuevas: si la guarda se queja, renombra tu fichero.
 */
const LEGACY = new Set([
  '20240130_create_activities.sql',
  '20250130_create_events_table.sql',
  '20250130_create_news_table.sql',
  '20250130_create_projects_table.sql',
  '20260130_content_management_tables.sql',
  '20260130_update_activity_prices.sql',
  '20260131_add_news_translations.sql',
  '20260202_documents_feature.sql',
  '20260224_add_announcement_banner.sql',
  '20260224_create_contact_messages.sql',
  '20260226_add_announcement_translations.sql',
  '20260306_add_news_metadata_columns.sql',
  '20260315_add_admin_tasks_subtasks_tags_assignee_name.sql',
  '20260315_create_admin_tasks.sql',
  '20260321_add_news_pdf_attachments.sql',
  '20260323_add_shop_order_contact_phone.sql',
  '20260323_fix_inscripcions_rls_admin.sql',
  '20260506000000_add_menjador_feature.sql',
  '20260506000000_create_board_members.sql',
  '20260616_create_faqs_table.sql',
]);

const VERSION_RE = /^(\d+)_(.+)\.sql$/;

const files = readdirSync(MIGRATIONS_DIR)
  .filter(name => name.endsWith('.sql'))
  .sort();

const errors = [];
const versions = new Map();

for (const file of files) {
  const match = VERSION_RE.exec(file);

  if (!match) {
    errors.push(`${file}: el nombre debe ser <14 dígitos>_<descripción>.sql`);
    continue;
  }

  const [, version] = match;
  const previous = versions.get(version);

  if (previous) {
    // Solo se perdona si ambas vienen del histórico congelado.
    if (!LEGACY.has(file) || !LEGACY.has(previous)) {
      errors.push(`${file}: versión ${version} duplicada con ${previous}`);
    }
  } else {
    versions.set(version, file);
  }

  if (version.length !== 14 && !LEGACY.has(file)) {
    errors.push(
      `${file}: versión de ${version.length} dígitos; usa 14 (YYYYMMDDHHMMSS). ` +
        'Genera el fichero con `supabase migration new <nombre>`.',
    );
  }
}

if (errors.length > 0) {
  console.error(`\n✖ ${errors.length} problema(s) en supabase/migrations:\n`);
  for (const error of errors) console.error(`  - ${error}`);
  console.error('');
  process.exit(1);
}

const legacyPresent = files.filter(f => LEGACY.has(f)).length;
console.log(
  `✓ ${files.length} migraciones con nombre válido ` +
    `(${legacyPresent} del histórico congelado, ver scripts/check-migrations.mjs).`,
);
