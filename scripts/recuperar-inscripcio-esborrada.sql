-- Recuperar una inscripción borrada del panel.
--
-- El botón de la papelera de /admin/inscriptions hace un DELETE de verdad: no
-- hay papelera ni estado intermedio. Lo que sí hay es el trigger
-- `trg_audit_inscripcions`, que antes de que la fila desaparezca la copia
-- entera a `audit_logs.old_data`. De ahí se reconstruye.
--
-- LÍMITE: `audit_logs` se purga a los 90 días (cron semanal, ver
-- 20260417000000_audit_logs_auto_purge.sql). Pasado ese plazo no hay copia.
--
-- NO mires `inscripcions_history`: solo la escriben dos RPC que el frontend no
-- llama nunca, así que está vacía de todo lo que pasa por la aplicación.
--
-- Uso:
--   psql "$DB_URL" -f scripts/recuperar-inscripcio-esborrada.sql
-- o pegando los bloques, de uno en uno, en el SQL editor de Supabase.
-- Los bloques 1-2 y 4-5 solo leen. El 3 es el único que escribe.


-- ---------------------------------------------------------------------------
-- 1. Qué se ha borrado y cuándo
--
-- `changed_by` es el uuid de quien lo hizo (auth.uid()); sale a NULL si el
-- borrado vino de un cron o de psql directo, sin sesión.
-- ---------------------------------------------------------------------------

SELECT a.id                                        AS audit_id,
       a.created_at                                AS esborrada_el,
       a.record_id                                 AS inscripcio_id,
       COALESCE(p.full_name, a.changed_by::text, '(sense sessió)') AS qui,
       a.old_data ->> 'parent_name'                AS familia,
       a.old_data ->> 'parent_dni'                 AS dni,
       a.old_data ->> 'parent_email_1'             AS correu,
       a.old_data ->> 'academic_year'              AS curs_escolar,
       a.old_data ->> 'status'                     AS estat,
       jsonb_array_length(a.old_data -> 'students') AS n_criatures,
       a.old_data -> 'students'                    AS criatures
  FROM public.audit_logs a
  LEFT JOIN public.profiles p ON p.id = a.changed_by
 WHERE a.table_name = 'inscripcions'
   AND a.action = 'DELETE'
 ORDER BY a.created_at DESC
 LIMIT 50;


-- ---------------------------------------------------------------------------
-- 2. ¿Era duplicada de verdad?
--
-- Antes de restaurar, mirar qué OTRAS inscripciones comparten correo o DNI con
-- la borrada. Si las criaturas coinciden una a una, era un duplicado real y no
-- hace falta restaurar nada. Si la borrada tenía alguna criatura que no está en
-- las demás, se perdió una inscripción de verdad: pasa al bloque 3.
--
-- Sustituye el uuid por el `inscripcio_id` que te interese del bloque 1.
-- ---------------------------------------------------------------------------

WITH esborrada AS (
    SELECT old_data
      FROM public.audit_logs
     WHERE table_name = 'inscripcions'
       AND action = 'DELETE'
       AND record_id = '00000000-0000-0000-0000-000000000000'   -- <-- el uuid
     ORDER BY created_at DESC
     LIMIT 1
)
SELECT 'ESBORRADA' AS origen,
       e.old_data ->> 'created_at'   AS enviada_el,
       e.old_data ->> 'parent_name'  AS familia,
       e.old_data -> 'students'      AS criatures
  FROM esborrada e
UNION ALL
SELECT 'VIVA'                        AS origen,
       i.created_at::text            AS enviada_el,
       i.parent_name                 AS familia,
       i.students                    AS criatures
  FROM public.inscripcions i, esborrada e
 WHERE i.academic_year IS NOT DISTINCT FROM (e.old_data ->> 'academic_year')
   AND (
         lower(btrim(i.parent_email_1)) = lower(btrim(e.old_data ->> 'parent_email_1'))
      OR lower(btrim(i.parent_dni))     = lower(btrim(e.old_data ->> 'parent_dni'))
       )
 ORDER BY origen, enviada_el;


-- ---------------------------------------------------------------------------
-- 3. Restaurar  (ÚNICO BLOQUE QUE ESCRIBE)
--
-- Devuelve la fila con su id, su fecha de envío y su estado originales, así que
-- vuelve a su sitio en el listado y los pagos que la referenciaban dejan de
-- estar huérfanos.
--
-- El DISABLE TRIGGER es para no mandarle otra vez el correo de confirmación a
-- la familia: `send-inscription-email-webhook` dispara en cada INSERT y no
-- distingue un alta nueva de una restauración. Requiere ser dueño de la tabla
-- (postgres / service_role); desde el SQL editor de Supabase va.
--
-- `trg_inscripcio_duplicada` no molesta aquí: si la fila se borró, ya no hay
-- ninguna igual con la que chocar. Si SÍ choca, es la prueba de que el borrado
-- era correcto y no hay que restaurar nada.
--
-- Sustituye el uuid por el `audit_id` del bloque 1 (el de audit_logs, no el de
-- la inscripción).
-- ---------------------------------------------------------------------------

BEGIN;

ALTER TABLE public.inscripcions DISABLE TRIGGER "send-inscription-email-webhook";

INSERT INTO public.inscripcions
SELECT (jsonb_populate_record(NULL::public.inscripcions, a.old_data)).*
  FROM public.audit_logs a
 WHERE a.id = '00000000-0000-0000-0000-000000000000'            -- <-- el audit_id
   AND a.table_name = 'inscripcions'
   AND a.action = 'DELETE';

ALTER TABLE public.inscripcions ENABLE TRIGGER "send-inscription-email-webhook";

-- Comprueba que ha entrado UNA fila y que es la que esperabas antes de
-- confirmar. Si algo no cuadra: ROLLBACK;
SELECT id, created_at, parent_name, academic_year, status, students
  FROM public.inscripcions
 WHERE id = '00000000-0000-0000-0000-000000000000';             -- <-- inscripcio_id

COMMIT;


-- ---------------------------------------------------------------------------
-- 4. Pagos huérfanos de borrados anteriores
--
-- Desde 20260901120000_inscripcions_integritat.sql no se pueden crear más
-- (la clave ajena lo impide), pero los de antes siguen ahí: apuntan a una
-- inscripción que ya no existe, así que no salen en ninguna consulta que cruce
-- las dos tablas.
--
-- Cada uno lleva el `inscripcion_id` de la inscripción que se borró: cruzándolo
-- con el bloque 1 sale de quién era. Si restauras esa inscripción, el pago se
-- reengancha solo.
--
-- Cuando esto devuelva 0 filas, se puede validar la clave ajena:
--   ALTER TABLE public.payments VALIDATE CONSTRAINT payments_inscripcion_id_fkey;
-- ---------------------------------------------------------------------------

SELECT p.id,
       p.inscripcion_id,
       p.student_name,
       p.student_surname,
       p.parent_email,
       p.concept,
       p.amount,
       p.payment_month,
       p.payment_year,
       p.status,
       (a.old_data ->> 'parent_name') AS familia_esborrada,
       a.created_at                   AS inscripcio_esborrada_el
  FROM public.payments p
  LEFT JOIN public.audit_logs a
         ON a.table_name = 'inscripcions'
        AND a.action = 'DELETE'
        AND a.record_id = p.inscripcion_id::text
 WHERE p.inscripcion_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM public.inscripcions i WHERE i.id = p.inscripcion_id)
 ORDER BY p.payment_year DESC, p.payment_month DESC;


-- ---------------------------------------------------------------------------
-- 5. Duplicados que quedan vivos
--
-- Los que ya estaban antes del trigger anti-duplicado. Mismo curso escolar,
-- mismo correo y el mismo `students` carácter por carácter: eso no es una
-- familia con dos criaturas, es el mismo formulario enviado dos veces. Quedarse
-- con el más antiguo y borrar el resto es seguro.
--
-- El panel los marca ahora con la etiqueta «Duplicat exacte».
-- ---------------------------------------------------------------------------

SELECT lower(btrim(parent_email_1))        AS correu,
       academic_year                       AS curs_escolar,
       count(*)                            AS vegades,
       array_agg(id ORDER BY created_at)   AS ids_mes_antic_primer,
       min(created_at)                     AS primera,
       max(created_at)                     AS ultima,
       (array_agg(students ORDER BY created_at))[1] AS criatures
  FROM public.inscripcions
 GROUP BY lower(btrim(parent_email_1)), academic_year, students
HAVING count(*) > 1
 ORDER BY vegades DESC, ultima DESC;
