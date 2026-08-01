-- ============================================================
-- Migration: audit_logs — definición completa (tabla + función + triggers)
-- Date: 2026-08-01
--
-- CONTEXTO / POR QUÉ EXISTE ESTA MIGRACIÓN
-- ------------------------------------------------------------
-- El repo referenciaba `audit_logs` desde dos sitios sin haberla
-- creado nunca en una migración:
--   * 20260417000000_audit_logs_auto_purge.sql  → cron que borra filas > 90 días
--   * 20260506020000_security_hardening.sql:73  → REVOKE sobre handle_audit_log()
--   * src/services/admin/AdminObservabilityService.ts → SELECT con join a profiles
-- La tabla, la función y los triggers vivían SOLO en la base remota, así que
-- nadie podía saber qué tablas estaban realmente auditadas.
--
-- Esta migración declara ese esquema de forma IDEMPOTENTE y es SEGURA de
-- aplicar sobre producción (donde casi con toda seguridad ya existe):
--   * CREATE TABLE IF NOT EXISTS  → no toca la tabla existente
--   * CREATE OR REPLACE FUNCTION  → re-define la función con search_path fijo
--   * DROP TRIGGER IF EXISTS + CREATE TRIGGER, guardado por to_regclass()
--     → no falla si una tabla del listado no existe en este entorno
--
-- NOTA: si la tabla ya existe en remoto con tipos distintos (p.ej. record_id
-- UUID en vez de TEXT), esta migración NO la altera a propósito: los INSERT de
-- la función usan cast de asignación text→uuid y siguen funcionando.
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABLA
--    Columnas alineadas con el tipo `AuditLog` del servicio admin.
--    changed_by es NULLABLE: los cambios hechos por cron/service_role o por
--    triggers en cascada no tienen auth.uid(); la UI los muestra como "Sistema".
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name  TEXT NOT NULL,
    record_id   TEXT NOT NULL DEFAULT '',
    action      TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data    JSONB,
    new_data    JSONB,
    changed_by  UUID,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.audit_logs IS
    'Traza de cambios (INSERT/UPDATE/DELETE) sobre las tablas de contenido gestionadas desde el CMS. Se purga a 90 días por cron (ver 20260417000000_audit_logs_auto_purge.sql).';
COMMENT ON COLUMN public.audit_logs.record_id IS
    'PK de la fila afectada, como texto. Vacío si la tabla no tiene columna id.';
COMMENT ON COLUMN public.audit_logs.changed_by IS
    'auth.uid() del autor. NULL = acción de sistema (cron, service_role, cascada).';

-- FK a profiles: PostgREST la necesita para resolver el embed `profiles!changed_by`
-- que usa AdminObservabilityService. Se añade solo si falta (y si profiles existe).
DO $$
BEGIN
    IF to_regclass('public.profiles') IS NOT NULL
       AND NOT EXISTS (
            SELECT 1
              FROM pg_constraint
             WHERE conrelid = 'public.audit_logs'::regclass
               AND contype  = 'f'
               AND conname  = 'audit_logs_changed_by_fkey'
       )
    THEN
        ALTER TABLE public.audit_logs
            ADD CONSTRAINT audit_logs_changed_by_fkey
            FOREIGN KEY (changed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ------------------------------------------------------------
-- 2. ÍNDICES
--    created_at DESC  → orden por defecto de la pantalla de observabilidad
--    (table_name, record_id) → "historial de este registro"
--    changed_by / action → filtros de la UI
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at   ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON public.audit_logs (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by   ON public.audit_logs (changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action       ON public.audit_logs (action);

-- ------------------------------------------------------------
-- 3. FUNCIÓN DEL TRIGGER
--    SECURITY DEFINER: los usuarios anónimos/authenticated no tienen INSERT
--    sobre audit_logs (no hay policy de escritura), así que la escritura tiene
--    que hacerse con los privilegios del owner.
--    search_path fijado para evitar escalada por manipulación de search_path.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_old  JSONB;
    v_new  JSONB;
    v_id   TEXT;
    v_user UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_old := to_jsonb(OLD);
        v_new := NULL;
        v_id  := COALESCE(v_old ->> 'id', '');
    ELSIF TG_OP = 'UPDATE' THEN
        v_old := to_jsonb(OLD);
        v_new := to_jsonb(NEW);
        v_id  := COALESCE(v_new ->> 'id', v_old ->> 'id', '');
        -- Sin cambios reales (p.ej. UPDATE que solo toca updated_at por trigger
        -- BEFORE y deja el resto igual) no merece una fila de auditoría.
        IF v_old = v_new THEN
            RETURN NEW;
        END IF;
    ELSE
        v_old := NULL;
        v_new := to_jsonb(NEW);
        v_id  := COALESCE(v_new ->> 'id', '');
    END IF;

    -- auth.uid() revienta si no hay contexto de request (cron, psql directo).
    BEGIN
        v_user := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_user := NULL;
    END;

    INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME, v_id, TG_OP, v_old, v_new, v_user);

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_audit_log() IS
    'Trigger AFTER INSERT/UPDATE/DELETE que vuelca la fila a public.audit_logs.';

-- Coherente con 20260506020000_security_hardening.sql: la función no debe ser
-- invocable vía PostgREST /rpc. Los triggers se ejecutan como el owner igual.
REVOKE EXECUTE ON FUNCTION public.handle_audit_log() FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- 4. RLS — lectura SOLO para role = 'admin'
--    Ojo: NO se usa public.is_admin(), que también acepta 'coordinator'.
--    La auditoría es deliberadamente más estricta que el resto del CMS.
--    No hay policies de INSERT/UPDATE/DELETE: nadie escribe salvo la función
--    SECURITY DEFINER, y nadie puede borrar/alterar la traza desde la app.
-- ------------------------------------------------------------
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read audit logs" ON public.audit_logs;
CREATE POLICY "Admins read audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
             WHERE p.id = auth.uid()
               AND p.role = 'admin'
        )
    );

REVOKE ALL ON TABLE public.audit_logs FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.audit_logs TO authenticated;

-- ------------------------------------------------------------
-- 5. TRIGGERS
--
-- TABLAS AUDITADAS (contenido y configuración gestionados desde el CMS,
-- más las tablas financieras/administrativas donde un cambio silencioso
-- tiene consecuencias):
--   Contenido web ... news, projects, events, activities, documents, faqs,
--                     board_members, site_announcements, site_config,
--                     notifications, short_urls, forms
--   Servicios ....... menjador_rates, menjador_menus, acollida_rates
--   Gestión ......... admin_tasks, inscripcions
--   Finanzas ........ payments, finance_transactions, invoices, payer_aliases
--   Botiga .......... shop_products, shop_variants, shop_orders
--   Seguridad ....... profiles  (los cambios de `role` son el vector nº1 de
--                     escalada de privilegios; auditar esto es obligatorio)
--
-- TABLAS DEJADAS FUERA A PROPÓSITO:
--   * audit_logs ............ auditar la auditoría = recursión infinita.
--   * form_submissions ...... alto volumen y escritura pública anónima; además
--                             duplicaría datos personales (a menudo de menores)
--                             en una segunda tabla. Ya tiene soft-delete propio.
--   * contact_messages ...... ídem: escritura pública, PII, sin valor de traza.
--   * shop_order_items ...... filas hijas escritas por el checkout público; el
--                             cambio relevante ya queda en shop_orders.
--   * payment_history,
--     monthly_payment_generation ... ya SON tablas de histórico; auditar un
--                             histórico solo duplica volumen.
--   * bank_imports .......... guarda el volcado bruto del extracto bancario;
--                             copiarlo entero a audit_logs dispara el tamaño de
--                             la BD (plan Free). payer_aliases sí se audita.
--   * app_settings .......... guarda secretos (GEMINI_API_KEY). old_data/new_data
--                             filtrarían el secreto a cualquier admin lector.
--   * admin_users ........... contiene hashes de contraseña (ver
--                             20260506020000_security_hardening.sql). Nunca.
--   * auth.*, storage.* ..... esquemas gestionados por Supabase.
--
-- La creación va guardada por to_regclass(): si alguna de estas tablas no
-- existe en el entorno donde se aplica, se salta con NOTICE en vez de fallar.
-- ------------------------------------------------------------
DO $$
DECLARE
    v_audited TEXT[] := ARRAY[
        'news',
        'projects',
        'events',
        'activities',
        'documents',
        'faqs',
        'board_members',
        'site_announcements',
        'site_config',
        'notifications',
        'short_urls',
        'forms',
        'menjador_rates',
        'menjador_menus',
        'acollida_rates',
        'admin_tasks',
        'inscripcions',
        'payments',
        'finance_transactions',
        'invoices',
        'payer_aliases',
        'shop_products',
        'shop_variants',
        'shop_orders',
        'profiles'
    ];
    v_table TEXT;
    v_old   RECORD;
BEGIN
    FOREACH v_table IN ARRAY v_audited LOOP
        IF to_regclass('public.' || quote_ident(v_table)) IS NULL THEN
            RAISE NOTICE 'audit_logs: se salta %, la tabla no existe en este entorno', v_table;
            CONTINUE;
        END IF;

        -- Producción puede tener ya un trigger de auditoría con OTRO nombre.
        -- Se eliminan solo los que apuntan a handle_audit_log() y solo sobre las
        -- tablas de este listado, para no duplicar filas ni desactivar triggers
        -- de tablas que no controlamos aquí.
        FOR v_old IN
            SELECT tg.tgname
              FROM pg_trigger tg
              JOIN pg_proc  p ON p.oid = tg.tgfoid
              JOIN pg_namespace pn ON pn.oid = p.pronamespace
             WHERE tg.tgrelid = ('public.' || quote_ident(v_table))::regclass
               AND NOT tg.tgisinternal
               AND p.proname  = 'handle_audit_log'
               AND pn.nspname = 'public'
        LOOP
            EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', v_old.tgname, v_table);
        END LOOP;

        EXECUTE format(
            'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I '
            'FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log()',
            'trg_audit_' || v_table,
            v_table
        );
    END LOOP;
END $$;

-- ============================================================
-- ROLLBACK (manual, solo si algo se rompe)
-- ============================================================
-- DO $$
-- DECLARE r RECORD;
-- BEGIN
--   FOR r IN SELECT c.relname, tg.tgname
--              FROM pg_trigger tg
--              JOIN pg_class c ON c.oid = tg.tgrelid
--              JOIN pg_proc  p ON p.oid = tg.tgfoid
--             WHERE p.proname = 'handle_audit_log' AND NOT tg.tgisinternal
--   LOOP
--     EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', r.tgname, r.relname);
--   END LOOP;
-- END $$;
-- DROP FUNCTION IF EXISTS public.handle_audit_log();
-- DROP TABLE IF EXISTS public.audit_logs;
