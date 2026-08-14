-- Cierra la lectura anónima del histórico de inscripciones.
--
-- QUÉ PASABA
-- `inscripcions_history` guarda, en `previous_record` y `new_record`, una copia
-- JSONB entera de la fila de `inscripcions`: nombre del alumno, del padre o la
-- madre, correo, teléfono y el resto de datos del formulario. La política
-- "Allow anonymous select history" la dejaba abierta con USING (true) al rol
-- `anon`, y 20260810000000_grants_por_defecto.sql concede SELECT a `anon` sobre
-- todas las tablas de public.
--
-- Resultado: cualquiera con la anon key —que es pública por diseño y viaja en
-- el bundle de la web— podía leer el histórico completo con una petición a
-- /rest/v1/inscripcions_history. No hacía falta sesión.
--
-- Detectado el 2026-08-14 al montar scripts/check-rls.sql, que a partir de
-- ahora bloquea el merge si vuelve a aparecer una política así.
--
-- QUÉ CAMBIA
-- - SELECT: solo admin (misma regla que la propia tabla `inscripcions`).
-- - INSERT anónimo: SE MANTIENE. El histórico lo escribe un trigger dentro de
--   la transacción de la familia que envía la inscripción; sin este INSERT, el
--   alta pública falla. No filtra nada: escribir no permite leer.
--
-- Nada del frontend consulta esta tabla (`grep -rn inscripcions_history src/`
-- no devuelve nada), así que cerrar el SELECT no rompe ninguna pantalla.

DROP POLICY IF EXISTS "Allow anonymous select history" ON public.inscripcions_history;

DROP POLICY IF EXISTS "Admins can select inscription history" ON public.inscripcions_history;
CREATE POLICY "Admins can select inscription history"
  ON public.inscripcions_history
  FOR SELECT
  TO authenticated
  USING (is_admin());
