-- ============================================================
-- client_errors — errores de JavaScript que revientan en el navegador.
--
-- POR QUÉ
-- Hasta hoy, si una pantalla petaba en el móvil de una familia nadie se
-- enteraba: la web es una SPA, el fallo ocurre en su navegador y no deja rastro
-- en ningún log. El bucle "el agente edita → CI valida → deploy" se quedaba sin
-- el último eslabón, que es saber si lo publicado funciona de verdad.
--
-- Se hace con la infraestructura que ya hay (Postgres + RLS + el panel de
-- AdminObservability) en vez de con un servicio externo: sin cuentas nuevas,
-- sin coste y sin otro token que rotar.
--
-- Idempotente: seguro de reaplicar.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.client_errors (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- `fingerprint` agrupa el mismo fallo repetido: un error en la portada lo
    -- reportan cien familias distintas y sin agrupar el panel es ilegible.
    fingerprint  TEXT NOT NULL,
    kind         TEXT NOT NULL,
    message      TEXT NOT NULL,
    stack        TEXT,
    source       TEXT,
    page_url     TEXT,
    user_agent   TEXT,
    app_version  TEXT,

    -- NULL para visitantes anónimos, que son la mayoría.
    user_id      UUID,

    -- Lo marca un admin desde el panel cuando ya está arreglado.
    resolved_at  TIMESTAMPTZ
);

-- La tabla la escribe cualquiera (ver política de INSERT más abajo), así que
-- los límites de tamaño son la única defensa contra que alguien la use de
-- almacenamiento gratis. Van como constraints y no en el cliente: el cliente
-- es justo lo que no controlamos.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                    WHERE conrelid = 'public.client_errors'::regclass
                      AND conname = 'client_errors_limites') THEN
        ALTER TABLE public.client_errors ADD CONSTRAINT client_errors_limites CHECK (
            char_length(fingerprint) BETWEEN 1 AND 64
            AND char_length(message) BETWEEN 1 AND 2000
            AND char_length(COALESCE(stack, '')) <= 8000
            AND char_length(COALESCE(source, '')) <= 500
            AND char_length(COALESCE(page_url, '')) <= 1000
            AND char_length(COALESCE(user_agent, '')) <= 400
            AND char_length(COALESCE(app_version, '')) <= 100
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                    WHERE conrelid = 'public.client_errors'::regclass
                      AND conname = 'client_errors_kind_check') THEN
        ALTER TABLE public.client_errors ADD CONSTRAINT client_errors_kind_check
            CHECK (kind IN ('render', 'window', 'promise', 'manual'));
    END IF;
END $$;

COMMENT ON TABLE public.client_errors IS
    'Errores de JavaScript capturados en el navegador. Los escribe el propio cliente (anon incluido); solo los admin pueden leerlos. Se purgan a 90 días por cron.';
COMMENT ON COLUMN public.client_errors.fingerprint IS
    'Hash de tipo+mensaje+primera línea de pila. Agrupa el mismo fallo reportado por muchas visitas.';

CREATE INDEX IF NOT EXISTS idx_client_errors_created_at
    ON public.client_errors (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_errors_fingerprint
    ON public.client_errors (fingerprint, created_at DESC);
-- Parcial: el panel abre por defecto en "sin resolver", que son pocas filas
-- frente al total.
CREATE INDEX IF NOT EXISTS idx_client_errors_sin_resolver
    ON public.client_errors (created_at DESC) WHERE resolved_at IS NULL;

ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;

-- INSERT abierto a propósito: el 95% de las visitas son anónimas y un error que
-- solo se reporta cuando hay sesión no sirve de nada. El riesgo se acota con
-- los CHECK de tamaño de arriba y con la purga.
DROP POLICY IF EXISTS "client_errors_insert_publico" ON public.client_errors;
CREATE POLICY "client_errors_insert_publico" ON public.client_errors
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

-- Leer sí es privado: un stack trace puede llevar datos de la página.
DROP POLICY IF EXISTS "client_errors_select_admin" ON public.client_errors;
CREATE POLICY "client_errors_select_admin" ON public.client_errors
    FOR SELECT TO authenticated
    USING (is_admin());

DROP POLICY IF EXISTS "client_errors_update_admin" ON public.client_errors;
CREATE POLICY "client_errors_update_admin" ON public.client_errors
    FOR UPDATE TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "client_errors_delete_admin" ON public.client_errors;
CREATE POLICY "client_errors_delete_admin" ON public.client_errors
    FOR DELETE TO authenticated
    USING (is_admin());

-- Sin esto, `anon` no puede ni intentar el INSERT: RLS filtra filas, pero el
-- GRANT es lo que abre la puerta.
GRANT INSERT ON public.client_errors TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.client_errors TO authenticated;

-- Resumen agrupado para el panel. Va como función SECURITY INVOKER: respeta la
-- RLS de arriba, así que solo devuelve algo a un admin.
CREATE OR REPLACE FUNCTION public.client_errors_resumen(p_dias INTEGER DEFAULT 7)
RETURNS TABLE (
    fingerprint   TEXT,
    kind          TEXT,
    message       TEXT,
    veces         BIGINT,
    afectados     BIGINT,
    primera_vez   TIMESTAMPTZ,
    ultima_vez    TIMESTAMPTZ,
    resueltos     BIGINT
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
    SELECT e.fingerprint,
           MIN(e.kind)                                        AS kind,
           MIN(e.message)                                     AS message,
           COUNT(*)                                           AS veces,
           COUNT(DISTINCT COALESCE(e.user_id::TEXT, e.user_agent)) AS afectados,
           MIN(e.created_at)                                  AS primera_vez,
           MAX(e.created_at)                                  AS ultima_vez,
           COUNT(*) FILTER (WHERE e.resolved_at IS NOT NULL)  AS resueltos
      FROM public.client_errors e
     WHERE e.created_at >= NOW() - (p_dias || ' days')::INTERVAL
     GROUP BY e.fingerprint
     ORDER BY MAX(e.created_at) DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.client_errors_resumen(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.client_errors_resumen(INTEGER) TO authenticated;

-- Purga a 90 días, mismo criterio que audit_logs.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.unschedule('purge-old-client-errors')
          WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-old-client-errors');

        PERFORM cron.schedule(
            'purge-old-client-errors',
            '15 3 * * 0',
            $cron$DELETE FROM public.client_errors WHERE created_at < NOW() - INTERVAL '90 days'$cron$
        );
    END IF;
END $$;
