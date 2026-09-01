-- El freno al duplicado deja de fijarse en los espacios sobrantes.
--
-- ORIGEN: el caso real que motivó todo esto. La familia Peña Basciani envió el
-- mismo formulario tres veces (17 jul, 28 ago 15:46, 28 ago 15:50) para la
-- misma criatura, mismo curso y misma actividad. Al revisarlo, el freno que
-- puso 20260901120000 NO habría parado la tercera: compara `students` como
-- JSONB crudo, y esas dos filas del 28 de agosto se diferenciaban en que una
-- guardaba «Gianluca Matteo » y «Pironi Peña » con un espacio final y la otra
-- no. Para Postgres son dos JSONB distintos; para cualquier persona son la
-- misma inscripción.
--
-- El panel sí las detecta desde el primer día, porque
-- src/logic/inscriptionDuplicates.ts normaliza antes de comparar. Esta
-- migración lleva esa misma normalización a la base, que es donde se puede
-- evitar que el duplicado llegue a existir.
--
-- Aditiva: crea una función y sustituye el cuerpo de otra. No toca ninguna fila
-- ni rechaza nada que antes se aceptara, salvo el duplicado que ahora sí ve.

-- ---------------------------------------------------------------------------
-- La huella de las criaturas de una inscripción
--
-- GEMELA DE `studentsSignature()` en src/logic/inscriptionDuplicates.ts. Las
-- dos tienen que dar lo mismo para los mismos datos: si se toca una, se toca la
-- otra. La del panel decide qué etiqueta se pinta; esta decide qué envío se
-- rechaza. Que discrepen significaría avisar de algo que no se frena, o al
-- revés.
--
-- Reglas, en el mismo orden que la versión de TypeScript:
--   - nombre y apellidos en minúsculas, sin espacios de sobra ni repetidos;
--   - curso en minúsculas;
--   - actividades en minúsculas, sin vacías y ORDENADAS: apuntarse a inglés y
--     patinaje es lo mismo que apuntarse a patinaje e inglés;
--   - criaturas ORDENADAS: teclear a los hermanos en otro orden no crea una
--     inscripción distinta.
--
-- IMMUTABLE porque para los mismos datos devuelve siempre lo mismo: así se
-- puede usar en un índice el día que el volumen lo pida (hoy son cientos de
-- filas y el recorrido secuencial del trigger no se nota).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.inscripcio_signatura(p_students jsonb)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  SET search_path TO 'public', 'pg_catalog'
  AS $$
  SELECT coalesce(string_agg(fila, '||' ORDER BY fila), '')
    FROM (
      SELECT regexp_replace(
               btrim(lower(coalesce(s ->> 'name', '')) || ' ' || lower(coalesce(s ->> 'surname', ''))),
               '\s+', ' ', 'g')
             || '#' || btrim(lower(coalesce(s ->> 'course', '')))
             || '#' || coalesce(
                  (SELECT string_agg(act, '|' ORDER BY act)
                     FROM (SELECT btrim(lower(value)) AS act
                             FROM jsonb_array_elements_text(
                                    CASE WHEN jsonb_typeof(s -> 'activities') = 'array'
                                         THEN s -> 'activities'
                                         ELSE '[]'::jsonb END)) a
                    WHERE act <> ''),
                  '')
             AS fila
        FROM jsonb_array_elements(
               CASE WHEN jsonb_typeof(p_students) = 'array' THEN p_students ELSE '[]'::jsonb END) s
    ) files;
$$;

COMMENT ON FUNCTION public.inscripcio_signatura(jsonb) IS
  'Huella normalizada de las criaturas de una inscripción (minúsculas, sin espacios de sobra, '
  'actividades y criaturas ordenadas). GEMELA de studentsSignature() en '
  'src/logic/inscriptionDuplicates.ts: si se toca una, se toca la otra.';

-- ---------------------------------------------------------------------------
-- El freno, ahora comparando huellas
--
-- Sigue casando por CORREO y no por DNI, aunque la etiqueta del panel use los
-- dos. La diferencia está en el coste de equivocarse: la etiqueta avisa a quien
-- gestiona y esto le cierra la puerta a una familia. Un DNI mal tecleado que
-- coincida con el de otra familia dejaría a alguien sin poder apuntarse sin
-- entender por qué. Lo que el freno no vea, lo ve la etiqueta.
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
     AND public.inscripcio_signatura(students) = public.inscripcio_signatura(NEW.students)
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
  'BEFORE INSERT en inscripcions: rechaza la repetición del mismo formulario (mismo curso '
  'escolar, mismo correo y misma huella de criaturas, ver inscripcio_signatura). No toca los '
  'duplicados legítimos de una familia con varias criaturas. Lanza SQLSTATE P0409.';
