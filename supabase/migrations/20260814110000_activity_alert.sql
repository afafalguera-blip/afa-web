-- Aviso de que la web ha dejado de usarse.
--
-- QUÉ PROBLEMA RESUELVE
-- Toda la monitorización que había mira la infraestructura: errores de
-- navegador (client_errors) y cuota de Supabase (usage-alert). Ninguna
-- responde a la pregunta que importa: ¿la gente puede trabajar? Una web que
-- responde 200 en todas las rutas y a la que no entra ni una inscripción en
-- tres semanas está rota para su dueño, y ningún linter, test o auditoría de
-- código lo detecta.
--
-- Señal elegida (junta, 2026-08-14): escrituras de familias O actividad de la
-- junta. Se avisa solo si TODAS están a cero, para no gritar en temporada baja.

-- ---------------------------------------------------------------------------
-- Estado del aviso: sin esto, el correo se manda cada mañana mientras dure el
-- parón y en tres días está filtrado y no lo lee nadie.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.alert_state (
  name         text PRIMARY KEY,
  last_sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.alert_state ENABLE ROW LEVEL SECURITY;

-- Solo la Edge Function (service_role, que salta la RLS) escribe aquí. Los
-- admin pueden mirarlo desde el panel; nadie más lo ve.
DROP POLICY IF EXISTS "alert_state_select_admin" ON public.alert_state;
CREATE POLICY "alert_state_select_admin"
  ON public.alert_state
  FOR SELECT
  TO authenticated
  USING (is_admin());

REVOKE ALL ON public.alert_state FROM anon;

-- ---------------------------------------------------------------------------
-- Última señal de vida de cada fuente.
--
-- SECURITY DEFINER porque tiene que ver filas que la RLS esconde (pagos,
-- inscripciones, auditoría) y solo devuelve una fecha por tabla: ningún dato
-- personal sale de aquí. search_path fijado: sin él, quien pueda crear objetos
-- en un esquema anterior de la ruta secuestra las llamadas de dentro.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_last_activity()
RETURNS TABLE (fuente text, ultimo timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  -- Familias
  SELECT 'inscripcions'::text,     max(created_at)   FROM public.inscripcions
  UNION ALL
  SELECT 'shop_orders',            max(created_at)   FROM public.shop_orders
  UNION ALL
  SELECT 'contact_messages',       max(created_at)   FROM public.contact_messages
  UNION ALL
  SELECT 'form_submissions',       max(submitted_at) FROM public.form_submissions
  UNION ALL
  -- Junta
  SELECT 'audit_logs',             max(created_at)   FROM public.audit_logs
  UNION ALL
  SELECT 'admin_tasks',            max(created_at)   FROM public.admin_tasks
  UNION ALL
  SELECT 'news',                   max(created_at)   FROM public.news;
$$;

-- La migración de grants concede EXECUTE por defecto a todo el mundo; esta
-- función no la llama la web, solo el cron con service_role.
REVOKE ALL ON FUNCTION public.get_last_activity() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_last_activity() TO service_role;

-- ---------------------------------------------------------------------------
-- Cron diario. La función decide si toca avisar (cinco días laborables sin
-- señal y sin haber avisado en la última semana); correr a diario solo sirve
-- para que el aviso llegue el mismo día que se cumple el umbral.
--
-- El secreto se lee de vault en cada ejecución para que no aparezca en texto
-- plano en ningún SQL. Es el mismo que usa usage-alert:
--   SELECT vault.create_secret('<aleatorio>', 'usage_alert_secret');
-- y el mismo valor como secreto USAGE_ALERT_SECRET de las Edge Functions.
-- ---------------------------------------------------------------------------
SELECT cron.unschedule('daily-activity-alert')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-activity-alert');

SELECT cron.schedule(
  'daily-activity-alert',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://zaxbtnjkidqwzqsehvld.supabase.co/functions/v1/activity-alert',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'x-alert-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'usage_alert_secret' LIMIT 1)
    ),
    body    := '{}'::jsonb
  );
  $$
);
