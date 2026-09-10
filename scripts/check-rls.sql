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
       'notifications', 'admin_tasks',
       -- El padró y la acollida: nombre, curso y asistencia diaria de menores.
       -- Son los datos más sensibles que hay y faltaban en esta lista.
       'children', 'child_enrollments',
       'acollida_inscripcions', 'acollida_attendance', 'acollida_monitor_links'
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

-- ---------------------------------------------------------------------------
-- 5. Ninguna función SECURITY DEFINER nueva es ejecutable por `anon`.
--
-- Las tablas tienen RLS; las funciones no. Para una función el GRANT ES el
-- permiso, y una SECURITY DEFINER corre con los privilegios de quien la creó:
-- si `anon` puede llamarla, la RLS de dentro no la frena.
--
-- Ya pasó: 20260810000000_grants_por_defecto.sql hace
--   GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, ...
-- y, al aplicarse después del hardening, devolvió EXECUTE a `anon` sobre
-- funciones que borraban recibos (remove_baja_payments_for_month) o generaban
-- cobros en masa. Lo arregla 20260910180000_rehacer_revokes_de_funcions.sql;
-- este bloque es para que no vuelva a colarse sin que nadie lo vea.
--
-- Las funciones de trigger se excluyen: Postgres no deja llamarlas a mano.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  expuestas text;
BEGIN
  SELECT string_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
                    E'\n  ' ORDER BY p.proname)
    INTO expuestas
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.prosecdef
     AND p.prorettype <> 'pg_catalog.trigger'::regtype
     AND has_function_privilege('anon', p.oid, 'EXECUTE')
     AND p.proname NOT IN (
       -- Abiertas a propósito, cada una con su propio control dentro:
       --   el enlace sin contraseña de la monitora de acollida (exige token
       --   válido y activo, y no devuelve ningún dato de contacto),
       'acollida_monitor_roster', 'acollida_monitor_search', 'acollida_monitor_mark',
       --   los días completos, que el formulario público necesita para no
       --   ofrecer una plaza que no existe,
       'acollida_full_days',
       --   el pedido de la tienda, que puede hacer quien no tiene cuenta
       --   (comprueba que no se pida en nombre de otro usuario),
       'create_shop_complex_order_v1',
       --   el contador de clics de los enlaces cortos,
       'increment_clicks',
       --   e is_admin(), que para `anon` devuelve false y es lo que evalúan
       --   las propias políticas.
       'is_admin',
       -- Operaciones de administración que comprueban is_admin() por dentro:
       -- llamarlas sin sesión devuelve 'No autoritzat'. Se listan aquí porque
       -- el GRANT en bloque las alcanza; el control real está en su código.
       'admin_set_app_setting', 'admin_delete_app_setting', 'admin_get_app_setting_meta',
       'soft_delete_form_submission',
       'generate_book_payments', 'generate_soci_payments', 'rollover_acollida_payments'
     );

  IF expuestas IS NOT NULL THEN
    RAISE EXCEPTION E'Funciones SECURITY DEFINER ejecutables por `anon`:\n  %\n'
      'Corren con los permisos de su creador, así que la RLS no las para.\n'
      'Añade REVOKE EXECUTE ... FROM PUBLIC, anon en una migración, o —si la\n'
      'apertura es deliberada y la función comprueba quién llama— documenta el\n'
      'motivo en la lista de excepciones de este bloque.', expuestas;
  END IF;

  RAISE NOTICE 'RLS: ninguna función SECURITY DEFINER inesperada abierta a anon.';
END $$;
