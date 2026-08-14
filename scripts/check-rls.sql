-- Comprobación de permisos contra una base de datos real.
--
-- Qué evita: que una tabla nueva quede legible por cualquiera. En Supabase el
-- fallo no da error: 20260810000000_grants_por_defecto.sql concede SELECT a
-- `anon` sobre TODAS las tablas de public, así que lo único que separa los
-- datos de las familias de la calle es la RLS. Una tabla sin RLS, o con una
-- política `USING (true)` para `anon`, es un endpoint público que nadie ha
-- decidido abrir — la web sigue funcionando igual y nada se pone en rojo.
--
-- Ya pasó una vez: `inscripcions_history` (copia JSONB de cada inscripción:
-- nombres, correos, teléfonos) estuvo abierta a `anon` hasta el 2026-08-14.
--
-- Esto NO va en check-invariants.mjs a propósito: leer las migraciones con
-- expresiones regulares da falsos positivos (hay políticas dentro de bloques
-- comentados) y falsos negativos (una migración posterior puede cambiar lo que
-- hizo otra). Solo la base ya construida dice la verdad.
--
-- Uso: psql "$DB_URL" -v ON_ERROR_STOP=1 -f scripts/check-rls.sql
--      (en CI, contra el Supabase limpio que levanta el workflow Supabase)

\set ON_ERROR_STOP on

-- ---------------------------------------------------------------------------
-- 1. Toda tabla de `public` tiene RLS habilitada.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  sin_rls text;
BEGIN
  SELECT string_agg(c.relname, ', ' ORDER BY c.relname)
    INTO sin_rls
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relkind = 'r'
     AND NOT c.relrowsecurity
     -- Excepciones documentadas: ninguna por ahora. Para añadir una, escribe
     -- aquí el motivo por el que esa tabla puede leerla cualquiera.
     AND c.relname NOT IN ('');

  IF sin_rls IS NOT NULL THEN
    RAISE EXCEPTION E'Tablas de public sin RLS: %\n'
      'Con los GRANT por defecto, cualquiera con la anon key puede leerlas.\n'
      'Añade ALTER TABLE ... ENABLE ROW LEVEL SECURITY y sus políticas.', sin_rls;
  END IF;

  RAISE NOTICE 'RLS: todas las tablas de public la tienen habilitada.';
END $$;

-- ---------------------------------------------------------------------------
-- 2. Ninguna tabla con datos personales es legible sin sesión.
--
-- Una política de SELECT (o ALL) con `USING (true)` que alcance a `anon` o a
-- `public` deja la tabla entera abierta. En las tablas de esta lista eso son
-- datos de familias, importes o registros de auditoría.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  abiertas text;
BEGIN
  SELECT string_agg(format('%s (política "%s")', tablename, policyname), E'\n  ' ORDER BY tablename)
    INTO abiertas
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename IN (
       'inscripcions', 'inscripcions_history',
       'payments', 'payment_history', 'monthly_payment_generation',
       'finance_transactions', 'bank_imports', 'payer_aliases',
       'shop_orders', 'shop_order_items',
       'profiles', 'admin_users',
       'contact_messages', 'form_submissions',
       'audit_logs', 'client_errors',
       'notifications', 'admin_tasks'
     )
     AND cmd IN ('SELECT', 'ALL')
     AND permissive = 'PERMISSIVE'
     AND (roles && ARRAY['anon', 'public']::name[])
     AND btrim(coalesce(qual, 'true')) = 'true';

  IF abiertas IS NOT NULL THEN
    RAISE EXCEPTION E'Tablas con datos personales legibles sin sesión:\n  %\n'
      'Cambia la política a USING (is_admin()) o restríngela al rol que toque.', abiertas;
  END IF;

  RAISE NOTICE 'RLS: ninguna tabla sensible con lectura abierta a anon.';
END $$;

-- ---------------------------------------------------------------------------
-- 3. Tablas con RLS y sin ninguna política.
--
-- No es un agujero (sin políticas no lee nadie salvo service_role), pero suele
-- significar una pantalla rota. Se informa, no se bloquea.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  mudas text;
BEGIN
  SELECT string_agg(c.relname, ', ' ORDER BY c.relname)
    INTO mudas
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relkind = 'r'
     AND c.relrowsecurity
     AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = c.relname);

  IF mudas IS NOT NULL THEN
    RAISE WARNING 'Tablas con RLS y sin políticas (solo service_role las ve): %', mudas;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Funciones SECURITY DEFINER sin search_path fijado.
--
-- Vector de escalada conocido: sin search_path, quien pueda crear objetos en un
-- esquema anterior de la ruta puede secuestrar una llamada dentro de la
-- función, que corre con los permisos de quien la creó. Se informa mientras se
-- limpian las que quedan (docs/deuda-tecnica.md).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  sueltas int;
  nombres text;
BEGIN
  SELECT count(*), string_agg(p.proname, ', ' ORDER BY p.proname)
    INTO sueltas, nombres
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.prosecdef
     AND NOT EXISTS (
       SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg LIKE 'search_path=%'
     );

  IF sueltas > 0 THEN
    RAISE WARNING 'SECURITY DEFINER sin search_path (%): %', sueltas, nombres;
  ELSE
    RAISE NOTICE 'Todas las funciones SECURITY DEFINER fijan search_path.';
  END IF;
END $$;
