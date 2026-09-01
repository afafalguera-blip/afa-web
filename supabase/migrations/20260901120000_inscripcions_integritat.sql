-- Integridad de `inscripcions`: la red de seguridad del borrado, el freno a los
-- duplicados exactos y el enlace con `payments`.
--
-- ORIGEN: 2026-09-01. Se borró una inscripción del panel creyendo que estaba
-- repetida. La fila se recuperó de `audit_logs`, pero la revisión sacó cuatro
-- cosas que la hacían fácil de repetir y difícil de deshacer.
--
-- Todo lo de aquí es aditivo salvo el arreglo de
-- `remove_baja_payments_for_month`, que cambia la definición de una función (se
-- revierte volviendo a poner el cuerpo anterior, que queda en
-- supabase/schema.snapshot.sql). No borra ni modifica ninguna fila.

-- ---------------------------------------------------------------------------
-- 1. La única copia de una inscripción borrada, versionada
--
-- QUÉ PASABA: `trg_audit_inscripcions` existía en producción pero no en
-- ninguna migración — se creó a mano. Es lo que vuelca la fila entera a
-- `audit_logs.old_data` al borrarla, y por tanto lo único que permite
-- recuperarla (ver scripts/recuperar-inscripcio-esborrada.sql). Un
-- `supabase db reset`, o levantar el entorno de CI desde las migraciones,
-- reconstruía la base SIN el trigger: el borrado dejaba de tener vuelta atrás
-- y nadie se enteraba hasta necesitarlo.
--
-- `handle_audit_log()` la define 20260801140000_audit_logs_definition.sql.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE TRIGGER "trg_audit_inscripcions"
  AFTER INSERT OR UPDATE OR DELETE ON public.inscripcions
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

COMMENT ON TABLE public.inscripcions IS
  'Una fila = UNA FAMILIA con 1..3 criaturas dentro de `students` (JSONB), no una criatura. '
  'Borrar la fila se lleva a todas sus criaturas por delante; para retirar a una familia usa '
  'status = ''baja''. El borrado queda copiado en audit_logs.old_data 90 días '
  '(trigger trg_audit_inscripcions).';

-- ---------------------------------------------------------------------------
-- 2. Freno al duplicado exacto
--
-- QUÉ PASABA: el formulario público hace un INSERT pelado. Una familia que no
-- ve el correo de confirmación y reenvía el formulario crea una segunda fila
-- idéntica; nada la para y nada la señala. Después, en el panel, las dos filas
-- se ven iguales (mismo nombre, DNI, correo y teléfono) y distinguir el
-- duplicado real de "la misma familia con otra criatura" depende de leer la
-- columna de alumnos a 13px.
--
-- Un índice único no vale: la misma familia SÍ puede tener dos inscripciones
-- legítimas (una por criatura, o una ampliación con un hermano). Lo que nunca
-- es legítimo es la repetición EXACTA: mismo curso escolar, mismo correo y el
-- mismo `students` carácter por carácter.
--
-- Trigger y no índice también por esto: un índice único fallaría al crearse si
-- ya hay duplicados en producción; el trigger solo mira lo que entra a partir
-- de ahora y deja el histórico en paz.
--
-- Orden de disparo: los BEFORE INSERT corren en orden alfabético, así que
-- `trg_inscripcio_academic_year` ya ha rellenado el curso cuando llega este.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_inscripcio_duplicada()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $$
DECLARE
  v_existent uuid;
BEGIN
  SELECT id INTO v_existent
    FROM public.inscripcions
   WHERE academic_year IS NOT DISTINCT FROM NEW.academic_year
     AND lower(btrim(coalesce(parent_email_1, ''))) = lower(btrim(coalesce(NEW.parent_email_1, '')))
     AND students = NEW.students
   LIMIT 1;

  IF v_existent IS NOT NULL THEN
    -- P0409: lo mapea el formulario público para decirle a la familia que ya
    -- la tenemos apuntada, en vez de soltarle el error de Postgres.
    RAISE EXCEPTION 'Inscripció duplicada: ja existeix la inscripció % amb les mateixes dades', v_existent
      USING ERRCODE = 'P0409';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.check_inscripcio_duplicada() IS
  'BEFORE INSERT en inscripcions: rechaza la repetición exacta (mismo curso escolar, mismo '
  'correo y mismo students). No toca los duplicados legítimos de una familia con varias '
  'criaturas. Lanza SQLSTATE P0409.';

DROP TRIGGER IF EXISTS "trg_inscripcio_duplicada" ON public.inscripcions;
CREATE TRIGGER "trg_inscripcio_duplicada"
  BEFORE INSERT ON public.inscripcions
  FOR EACH ROW EXECUTE FUNCTION public.check_inscripcio_duplicada();

-- ---------------------------------------------------------------------------
-- 3. `payments` deja de poder quedarse colgando
--
-- QUÉ PASABA: `payments.inscripcion_id` era un uuid suelto, SIN clave ajena.
-- Borrar una inscripción no borraba sus pagos ni avisaba de que existían: los
-- pagos quedaban apuntando a un id que ya no está, invisibles para cualquier
-- consulta que cruce las dos tablas.
--
-- ON DELETE RESTRICT y no CASCADE a propósito: los pagos son el registro
-- contable de lo que una familia ha abonado. Que desaparezcan porque alguien
-- limpia una inscripción es peor que el error que impide la limpieza. Con
-- RESTRICT, quien quiera retirar a una familia con pagos usa status = 'baja'
-- (que es lo correcto) o resuelve los pagos primero a conciencia.
--
-- NOT VALID: no revisa las filas que ya están. Si hay huérfanos de borrados
-- anteriores, la migración entra igual y esos pagos se quedan como están —
-- son la única pista que queda de a qué inscripción pertenecían, y borrarlos
-- o ponerlos a NULL destruiría esa pista. La restricción SÍ actúa desde ya
-- sobre lo nuevo: PostgreSQL instala los dos triggers (el de INSERT/UPDATE en
-- payments y el de DELETE en inscripcions) aunque la constraint esté NOT VALID.
--
-- CONDICIÓN DE RETIRADA del NOT VALID: cuando la consulta de huérfanos de
-- scripts/recuperar-inscripcio-esborrada.sql (bloque 4) devuelva 0 filas,
-- `ALTER TABLE public.payments VALIDATE CONSTRAINT payments_inscripcion_id_fkey;`
-- en una migración nueva.
-- ---------------------------------------------------------------------------

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_inscripcion_id_fkey;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_inscripcion_id_fkey
  FOREIGN KEY (inscripcion_id) REFERENCES public.inscripcions(id)
  ON DELETE RESTRICT
  NOT VALID;

COMMENT ON CONSTRAINT payments_inscripcion_id_fkey ON public.payments IS
  'RESTRICT: una inscripción con pagos no se borra, se da de baja. NOT VALID mientras queden '
  'huérfanos de borrados anteriores a 2026-09-01.';

-- ---------------------------------------------------------------------------
-- 4. Una baja deja de poder borrar los pagos del hermano que sigue apuntado
--
-- QUÉ PASABA: `remove_baja_payments_for_month` borra los pagos del mes de las
-- familias que están de baja. Para los pagos antiguos, que no tienen
-- `inscripcion_id`, caía a comparar el correo del padre o la madre:
--
--   or (p.inscripcion_id is null and lower(p.parent_email) in (b.e1, b.e2))
--
-- Una familia con dos inscripciones y el mismo correo —una de baja, otra de
-- alta, que es justo el caso de la familia que se apunta por separado a cada
-- criatura— perdía TAMBIÉN los pagos de la inscripción activa. Sin traza: la
-- función devuelve un número, no dice qué borró.
--
-- QUÉ CAMBIA: el atajo por correo solo se aplica si ese correo no aparece en
-- ninguna inscripción que siga de alta. Cuando el correo es ambiguo, el pago se
-- queda: un pago de más se ve en la conciliación, un pago borrado no se ve.
-- Los pagos con `inscripcion_id` no cambian, ahí no hay ambigüedad.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.remove_baja_payments_for_month(p_month integer, p_year integer)
  RETURNS TABLE(removed integer)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $$
declare v_removed int := 0;
begin
  with bajas as (
    select id,
           lower(btrim(coalesce(parent_email_1, ''))) e1,
           lower(btrim(coalesce(parent_email_2, ''))) e2
    from inscripcions
    where coalesce(status, 'alta') = 'baja'
  ),
  -- Correos que además aparecen en alguna inscripción que sigue de alta. Un
  -- pago sin inscripcion_id con uno de estos correos es ambiguo: puede ser del
  -- hermano que no se ha dado de baja.
  correus_actius as (
    select lower(btrim(coalesce(parent_email_1, ''))) e
      from inscripcions where coalesce(status, 'alta') <> 'baja'
    union
    select lower(btrim(coalesce(parent_email_2, ''))) e
      from inscripcions where coalesce(status, 'alta') <> 'baja'
  ),
  del as (
    delete from payments p
    using bajas b
    where p.payment_month = p_month
      and p.payment_year  = p_year
      and (
            (p.inscripcion_id is not null and p.inscripcion_id = b.id)
         or (p.inscripcion_id is null
             and lower(btrim(coalesce(p.parent_email, ''))) in (b.e1, b.e2)
             and lower(btrim(coalesce(p.parent_email, ''))) not in (select e from correus_actius))
      )
    returning 1
  )
  select count(*) into v_removed from del;

  return query select coalesce(v_removed, 0);
end;
$$;

COMMENT ON FUNCTION public.remove_baja_payments_for_month(integer, integer) IS
  'Borra los pagos del mes de las familias de baja. El atajo por correo (pagos sin '
  'inscripcion_id) se salta los correos que también tiene alguna inscripción de alta, para no '
  'llevarse los pagos del hermano que sigue apuntado.';

-- ---------------------------------------------------------------------------
-- 5. `create_inscripcions_backup()` deja de estar al alcance de `anon`
--
-- QUÉ PASABA: la función copia `inscripcions` entera (nombres de criaturas,
-- correos, teléfonos, datos de salud) a una tabla `inscripcions_backup_<fecha>`
-- por SQL dinámico, y estaba con GRANT a `anon` y `authenticated`. No la llama
-- nadie: ni el frontend, ni ningún cron. Que hoy no explote depende solo de que
-- `anon` no tenga CREATE sobre el esquema public — un permiso que no controla
-- este repositorio. Y la tabla que crearía nacería sin RLS, que es exactamente
-- el fallo que scripts/check-rls.sql existe para impedir.
--
-- CONDICIÓN DE RETIRADA: si el día que haga falta un backup se hace con
-- `pg_dump` o desde el panel de Supabase (que es lo que se ha hecho siempre),
-- esta función sobra y se puede DROP en una migración nueva. Se deja porque
-- borrar una función que alguien pueda estar llamando a mano desde el SQL
-- editor no es asunto de esta migración.
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.create_inscripcions_backup() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_inscripcions_backup() FROM anon;
REVOKE ALL ON FUNCTION public.create_inscripcions_backup() FROM authenticated;

COMMENT ON FUNCTION public.create_inscripcions_backup() IS
  'MUERTA: no la llama ni el frontend ni ningún cron. Solo service_role. Crearía una copia de '
  'todas las inscripciones SIN RLS. Ver el bloque 5 de 20260901120000_inscripcions_integritat.sql.';

-- ---------------------------------------------------------------------------
-- 6. Decir en voz alta que `inscripcions_history` no sirve para recuperar nada
--
-- La tabla tiene la pinta exacta de ser el sitio donde mirar cuando algo se
-- borra: guarda `previous_record` y `new_record` con la fila entera. Pero solo
-- la escriben `dar_de_baja_inscripcion` y `dar_de_alta_inscripcion`, y el
-- frontend no llama a ninguna de las dos (`grep -rn dar_de_baja_inscripcion
-- src/` no devuelve nada): el panel hace un UPDATE directo del estado. Así que
-- está vacía de todo lo que ha pasado por la aplicación.
--
-- Buscar ahí un borrado y no encontrarlo es la forma más rápida de concluir
-- que no hay copia, teniéndola en `audit_logs`. El comentario evita ese rato.
-- ---------------------------------------------------------------------------

COMMENT ON TABLE public.inscripcions_history IS
  'NO es la traza de cambios: solo la escriben las RPC dar_de_alta_inscripcion / '
  'dar_de_baja_inscripcion, que el frontend nunca llama. Para recuperar una inscripción '
  'borrada o ver quién la cambió, mira audit_logs (table_name = ''inscripcions'').';
