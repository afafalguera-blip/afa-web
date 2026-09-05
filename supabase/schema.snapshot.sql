


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."academic_year_for"("p_month" integer, "p_year" integer) RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
  SELECT CASE
    WHEN p_month >= 9
      THEN p_year::text || '-' || lpad(((p_year + 1) % 100)::text, 2, '0')
      ELSE (p_year - 1)::text || '-' || lpad((p_year % 100)::text, 2, '0')
  END;
$$;


ALTER FUNCTION "public"."academic_year_for"("p_month" integer, "p_year" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."acollida_inscripcio_defaults"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
BEGIN
  NEW.updated_at := now();
  IF TG_OP = 'INSERT' THEN
    IF coalesce(NEW.academic_year, '') = '' THEN
      NEW.academic_year := public.academic_year_for(
        extract(month FROM now())::int, extract(year FROM now())::int);
    END IF;
    IF NEW.modality = 'mensual' AND (NEW.start_month IS NULL OR NEW.start_year IS NULL) THEN
      NEW.start_month := extract(month FROM now())::int;
      NEW.start_year := extract(year FROM now())::int;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."acollida_inscripcio_defaults"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."acollida_price_for"("p_rate_id" "uuid", "p_is_member" boolean, "p_occasional" boolean) RETURNS numeric
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
  SELECT CASE
    WHEN p_occasional AND p_is_member     THEN r.preu_soci_ocasional
    WHEN p_occasional AND NOT p_is_member THEN r.preu_no_soci_ocasional
    WHEN p_is_member                      THEN r.preu_soci_mes
    ELSE                                       r.preu_no_soci_mes
  END
  FROM public.acollida_rates r
  WHERE r.id = p_rate_id;
$$;


ALTER FUNCTION "public"."acollida_price_for"("p_rate_id" "uuid", "p_is_member" boolean, "p_occasional" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."activity_monthly_price"("p_activity" "text", "p_is_member" boolean) RETURNS numeric
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
  SELECT COALESCE(
    (
      SELECT CASE
               WHEN p_is_member THEN COALESCE(a.price_member, a.price)
               ELSE COALESCE(a.price_non_member, a.price_member, a.price)
             END
      FROM public.activities a
      WHERE a.title IS NOT NULL
        AND a.title <> ''
        AND p_activity ILIKE a.title || '%'
      ORDER BY length(a.title) DESC
      LIMIT 1
    ),
    -- Fallback for legacy / unmatched activity names.
    CASE WHEN p_is_member THEN 20.00 ELSE 25.00 END
  );
$$;


ALTER FUNCTION "public"."activity_monthly_price"("p_activity" "text", "p_is_member" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_delete_app_setting"("p_key" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;
    IF NOT public.is_allowed_setting_key(p_key) THEN
        RAISE EXCEPTION 'unknown setting key: %', p_key USING ERRCODE = '22023';
    END IF;
    DELETE FROM public.app_settings WHERE key = p_key;
END;
$$;


ALTER FUNCTION "public"."admin_delete_app_setting"("p_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_get_app_setting_meta"("p_key" "text") RETURNS TABLE("key" "text", "is_set" boolean, "masked" "text", "updated_at" timestamp with time zone, "updated_by_email" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;
    IF NOT public.is_allowed_setting_key(p_key) THEN
        RAISE EXCEPTION 'unknown setting key: %', p_key USING ERRCODE = '22023';
    END IF;

    RETURN QUERY
    SELECT
        s.key,
        TRUE AS is_set,
        public.mask_secret(s.value) AS masked,
        s.updated_at,
        u.email::TEXT AS updated_by_email
    FROM public.app_settings s
    LEFT JOIN auth.users u ON u.id = s.updated_by
    WHERE s.key = p_key
    LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."admin_get_app_setting_meta"("p_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_set_app_setting"("p_key" "text", "p_value" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;
    IF NOT public.is_allowed_setting_key(p_key) THEN
        RAISE EXCEPTION 'unknown setting key: %', p_key USING ERRCODE = '22023';
    END IF;
    IF p_value IS NULL OR length(trim(p_value)) = 0 THEN
        RAISE EXCEPTION 'value required' USING ERRCODE = '22023';
    END IF;
    IF length(p_value) > 1024 THEN
        RAISE EXCEPTION 'value too long' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.app_settings (key, value, updated_by)
    VALUES (p_key, p_value, auth.uid())
    ON CONFLICT (key) DO UPDATE
       SET value      = EXCLUDED.value,
           updated_at = NOW(),
           updated_by = EXCLUDED.updated_by;
END;
$$;


ALTER FUNCTION "public"."admin_set_app_setting"("p_key" "text", "p_value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."afa_annual_fee"() RETURNS numeric
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
  SELECT COALESCE(
    (SELECT (value->>'annual_fee_amount')::numeric FROM public.site_config WHERE key = 'fees'),
    0
  );
$$;


ALTER FUNCTION "public"."afa_annual_fee"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."book_price_for"("p_course" "text") RETURNS numeric
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
  SELECT COALESCE(
    (SELECT (value->'map'->>p_course)::numeric FROM public.site_config WHERE key = 'book_prices'),
    (SELECT (value->>'default')::numeric      FROM public.site_config WHERE key = 'book_prices'),
    0
  );
$$;


ALTER FUNCTION "public"."book_price_for"("p_course" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_acollida_rate_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
DECLARE recent_same_email int; recent_total int;
BEGIN
  SELECT count(*) INTO recent_same_email
  FROM public.acollida_inscripcions
  WHERE created_at > (now() - interval '60 seconds')
    AND parent_email IS NOT DISTINCT FROM NEW.parent_email;

  -- 3 germans en un minut són normals; el quart ja és un enviament repetit.
  IF recent_same_email >= 4 THEN
    RAISE EXCEPTION 'Rate limit exceeded: massa sol·licituds en poc temps'
      USING ERRCODE = 'P0429';
  END IF;

  SELECT count(*) INTO recent_total
  FROM public.acollida_inscripcions
  WHERE created_at > (now() - interval '60 seconds');

  IF recent_total >= 40 THEN
    RAISE EXCEPTION 'Rate limit exceeded: massa sol·licituds en poc temps'
      USING ERRCODE = 'P0429';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_acollida_rate_limit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_contact_message_rate_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    recent_same_email INT;
    recent_total INT;
BEGIN
    SELECT COUNT(*) INTO recent_same_email
    FROM public.contact_messages
    WHERE created_at > (NOW() - interval '300 seconds')
      AND email IS NOT DISTINCT FROM NEW.email;

    IF recent_same_email >= 3 THEN
        RAISE EXCEPTION 'Rate limit exceeded: massa missatges en poc temps'
            USING ERRCODE = 'P0429';
    END IF;

    SELECT COUNT(*) INTO recent_total
    FROM public.contact_messages
    WHERE created_at > (NOW() - interval '60 seconds');

    IF recent_total >= 20 THEN
        RAISE EXCEPTION 'Rate limit exceeded: massa missatges en poc temps'
            USING ERRCODE = 'P0429';
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_contact_message_rate_limit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_form_submission_rate_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    recent_count INT;
BEGIN
    SELECT COUNT(*) INTO recent_count
    FROM public.form_submissions
    WHERE form_id = NEW.form_id
      AND submitted_at > (NOW() - interval '60 seconds')
      AND deleted_at IS NULL
      AND (
          (NEW.submitted_by_user_id IS NOT NULL AND submitted_by_user_id = NEW.submitted_by_user_id)
          OR
          (NEW.submitted_by_user_id IS NULL AND submitted_by_user_id IS NULL)
      );

    IF recent_count >= 5 THEN
        RAISE EXCEPTION 'Rate limit exceeded: too many submissions in a short period'
            USING ERRCODE = 'P0429';
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_form_submission_rate_limit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_inscripcio_duplicada"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."check_inscripcio_duplicada"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_inscripcio_duplicada"() IS 'BEFORE INSERT en inscripcions: rechaza la repetición del mismo formulario (mismo curso escolar, mismo correo y misma huella de criaturas, ver inscripcio_signatura). No toca los duplicados legítimos de una familia con varias criaturas. Lanza SQLSTATE P0409.';



CREATE OR REPLACE FUNCTION "public"."check_inscripcio_rate_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    recent_same_email INT;
    recent_total INT;
BEGIN
    SELECT COUNT(*) INTO recent_same_email
    FROM public.inscripcions
    WHERE created_at > (NOW() - interval '60 seconds')
      AND parent_email_1 IS NOT DISTINCT FROM NEW.parent_email_1;

    IF recent_same_email >= 3 THEN
        RAISE EXCEPTION 'Rate limit exceeded: massa inscripcions en poc temps'
            USING ERRCODE = 'P0429';
    END IF;

    -- Freno global generoso: no bloquea una jornada de inscripciones real,
    -- pero corta el flood automatizado que dispara emails via webhook.
    SELECT COUNT(*) INTO recent_total
    FROM public.inscripcions
    WHERE created_at > (NOW() - interval '60 seconds');

    IF recent_total >= 40 THEN
        RAISE EXCEPTION 'Rate limit exceeded: massa inscripcions en poc temps'
            USING ERRCODE = 'P0429';
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_inscripcio_rate_limit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."client_errors_resumen"("p_dias" integer DEFAULT 7) RETURNS TABLE("fingerprint" "text", "kind" "text", "message" "text", "veces" bigint, "afectados" bigint, "primera_vez" timestamp with time zone, "ultima_vez" timestamp with time zone, "resueltos" bigint)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
    SELECT e.fingerprint,
           MIN(e.kind)                                        AS kind,
           MIN(e.message)                                     AS message,
           COUNT(*)                                           AS veces,
           -- El tercer COALESCE importa: COUNT(DISTINCT NULL) da 0, así que un
           -- reporte sin sesión y sin user-agent no contaba como nadie.
           COUNT(DISTINCT COALESCE(e.user_id::TEXT, e.user_agent, 'anònim')) AS afectados,
           MIN(e.created_at)                                  AS primera_vez,
           MAX(e.created_at)                                  AS ultima_vez,
           COUNT(*) FILTER (WHERE e.resolved_at IS NOT NULL)  AS resueltos
      FROM public.client_errors e
     WHERE e.created_at >= NOW() - (p_dias || ' days')::INTERVAL
     GROUP BY e.fingerprint
     ORDER BY MAX(e.created_at) DESC;
$$;


ALTER FUNCTION "public"."client_errors_resumen"("p_dias" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_inscripcions_backup"() RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    backup_table_name TEXT;
    sql_statement TEXT;
BEGIN
    -- Crear nombre de tabla con fecha actual
    backup_table_name := 'inscripcions_backup_' || TO_CHAR(CURRENT_DATE, 'YYYY_MM_DD');
    
    -- Crear la tabla de backup
    sql_statement := 'CREATE TABLE IF NOT EXISTS ' || backup_table_name || ' AS SELECT * FROM inscripcions';
    EXECUTE sql_statement;
    
    -- Agregar comentario
    sql_statement := 'COMMENT ON TABLE ' || backup_table_name || ' IS ''Backup automático de inscripcions creado el ' || CURRENT_DATE || '''';
    EXECUTE sql_statement;
    
    RETURN 'Backup creado exitosamente: ' || backup_table_name;
END;
$$;


ALTER FUNCTION "public"."create_inscripcions_backup"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_inscripcions_backup"() IS 'MUERTA: no la llama ni el frontend ni ningún cron. Solo service_role. Crearía una copia de todas las inscripciones SIN RLS. Ver el bloque 5 de 20260901120000_inscripcions_integritat.sql.';



CREATE OR REPLACE FUNCTION "public"."create_shop_complex_order_v1"("p_customer_name" "text", "p_customer_email" "text", "p_customer_phone" "text", "p_total_amount" numeric, "p_items" "jsonb", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_language" "text" DEFAULT 'ca'::"text", "p_is_member" boolean DEFAULT false) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_order_id uuid;
  v_item jsonb;
  v_real_total numeric := 0;
  v_variant_record record;
  v_actual_price numeric;
  v_is_member boolean;
  v_caller_uid uuid;
  v_clean_email text;
  v_clean_phone text;
  v_language text;
BEGIN
  v_clean_email := nullif(trim(coalesce(p_customer_email, '')), '');
  v_clean_phone := nullif(trim(coalesce(p_customer_phone, '')), '');
  v_language := coalesce(nullif(trim(coalesce(p_language, '')), ''), 'ca');

  IF v_clean_email IS NULL AND v_clean_phone IS NULL THEN
    RAISE EXCEPTION 'Either customer email or phone is required';
  END IF;

  -- Authentication Check (Prevent User Spoofing)
  v_caller_uid := auth.uid();
  IF p_user_id IS NOT NULL AND p_user_id != v_caller_uid THEN
    RAISE EXCEPTION 'Unauthorized: user_id mismatch. You cannot place an order for another user.';
  END IF;

  -- Use explicit p_is_member flag (caller controls pricing tier)
  v_is_member := p_is_member;

  -- Create the order header
  INSERT INTO shop_orders (
    customer_name,
    customer_email,
    customer_phone,
    total_amount,
    user_id,
    language,
    status,
    is_member
  ) VALUES (
    p_customer_name,
    v_clean_email,
    v_clean_phone,
    0,
    p_user_id,
    v_language,
    'pending',
    v_is_member
  ) RETURNING id INTO v_order_id;

  -- Process each item (server-side validation)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO v_variant_record
    FROM shop_variants
    WHERE id = (v_item->>'variant_id')::uuid;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Variant not found: %', (v_item->>'variant_id');
    END IF;

    -- NOTE: no stock guard. Out-of-stock items are accepted as a backorder;
    -- stock is allowed to go negative to signal how many units are owed.

    IF v_is_member THEN
      v_actual_price := v_variant_record.price_member;
    ELSE
      v_actual_price := v_variant_record.price_non_member;
    END IF;

    v_real_total := v_real_total + (v_actual_price * (v_item->>'quantity')::int);

    INSERT INTO shop_order_items (
      order_id,
      variant_id,
      quantity,
      price_at_time
    ) VALUES (
      v_order_id,
      v_variant_record.id,
      (v_item->>'quantity')::int,
      v_actual_price
    );

    UPDATE shop_variants
    SET stock = stock - (v_item->>'quantity')::int
    WHERE id = v_variant_record.id;
  END LOOP;

  UPDATE shop_orders
  SET total_amount = v_real_total
  WHERE id = v_order_id;

  RETURN v_order_id;
END;
$$;


ALTER FUNCTION "public"."create_shop_complex_order_v1"("p_customer_name" "text", "p_customer_email" "text", "p_customer_phone" "text", "p_total_amount" numeric, "p_items" "jsonb", "p_user_id" "uuid", "p_language" "text", "p_is_member" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_academic_year"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
  SELECT COALESCE(
    (SELECT value->>'active_year' FROM public.site_config WHERE key = 'season'),
    '2026-27'
  );
$$;


ALTER FUNCTION "public"."current_academic_year"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dar_de_alta_inscripcion"("p_inscripcion_id" "uuid", "p_motivo" "text" DEFAULT NULL::"text", "p_changed_by" "text" DEFAULT 'admin'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_previous_record JSONB;
    v_new_record JSONB;
BEGIN
    -- Obtener el registro completo antes de modificarlo
    SELECT to_jsonb(inscripcions.*) INTO v_previous_record
    FROM inscripcions
    WHERE id = p_inscripcion_id;

    -- Actualizar el status de la inscripción a 'alta'
    UPDATE inscripcions
    SET status = 'alta',
        updated_at = NOW()
    WHERE id = p_inscripcion_id;

    -- Obtener el registro completo después de modificarlo
    SELECT to_jsonb(inscripcions.*) INTO v_new_record
    FROM inscripcions
    WHERE id = p_inscripcion_id;

    -- Registrar en el historial con el registro anterior y nuevo
    INSERT INTO inscripcions_history (
        inscripcion_id,
        changed_by,
        action,
        note,
        previous_record,
        new_record
    ) VALUES (
        p_inscripcion_id,
        p_changed_by,
        'alta',
        p_motivo,
        v_previous_record,
        v_new_record
    );

    -- Mensaje de confirmación en logs
    RAISE NOTICE 'Inscripción % dada de alta por %', p_inscripcion_id, p_changed_by;
END;
$$;


ALTER FUNCTION "public"."dar_de_alta_inscripcion"("p_inscripcion_id" "uuid", "p_motivo" "text", "p_changed_by" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dar_de_baja_inscripcion"("p_inscripcion_id" "uuid", "p_motivo" "text" DEFAULT NULL::"text", "p_changed_by" "text" DEFAULT 'admin'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_previous_record JSONB;
    v_new_record JSONB;
BEGIN
    -- Obtener el registro completo antes de modificarlo
    SELECT to_jsonb(inscripcions.*) INTO v_previous_record
    FROM inscripcions
    WHERE id = p_inscripcion_id;

    -- Actualizar el status de la inscripción a 'baja'
    UPDATE inscripcions
    SET status = 'baja',
        updated_at = NOW()
    WHERE id = p_inscripcion_id;

    -- Obtener el registro completo después de modificarlo
    SELECT to_jsonb(inscripcions.*) INTO v_new_record
    FROM inscripcions
    WHERE id = p_inscripcion_id;

    -- Registrar en el historial con el registro anterior y nuevo
    INSERT INTO inscripcions_history (
        inscripcion_id,
        changed_by,
        action,
        note,
        previous_record,
        new_record
    ) VALUES (
        p_inscripcion_id,
        p_changed_by,
        'baja',
        p_motivo,
        v_previous_record,
        v_new_record
    );

    -- Mensaje de confirmación en logs
    RAISE NOTICE 'Inscripción % marcada como baja por %', p_inscripcion_id, p_changed_by;
END;
$$;


ALTER FUNCTION "public"."dar_de_baja_inscripcion"("p_inscripcion_id" "uuid", "p_motivo" "text", "p_changed_by" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."events_fill_end_date"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
BEGIN
    IF NEW.end_date IS NULL THEN
        NEW.end_date := NEW.event_date;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."events_fill_end_date"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_create_payments_for_inscription"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
    v_now date := current_date;
    v_year int := extract(year from v_now)::int;
    v_month int := extract(month from v_now)::int;
    v_due_date date := make_date(v_year, v_month, 10); -- vencimiento día 10 del mes en curso
    v_student jsonb;
    v_name text;
    v_surname text;
    v_course text;
    v_activities text[];
begin
    -- Si la inscripción tiene formato nuevo con array de students
    if NEW.students is not null then
        for v_student in select * from jsonb_array_elements(NEW.students)
        loop
            v_name := coalesce((v_student->>'name'), '');
            v_surname := coalesce((v_student->>'surname'), '');
            v_course := coalesce((v_student->>'course'), '');
            -- Convertir array JSON de actividades a text[]
            v_activities := coalesce(
                (select array_agg(elem::text)
                   from jsonb_array_elements_text(coalesce(v_student->'activities','[]'::jsonb)) as elem),
                array[]::text[]
            );

            insert into public.payments (
                student_name,
                student_surname,
                course,
                activities,
                amount,
                due_date,
                status,
                bank_reference,
                notes,
                afa_member,
                payment_month,
                payment_year,
                payment_date,
                updated_at
            ) values (
                v_name,
                v_surname,
                v_course,
                v_activities,
                0, -- se puede ajustar luego; aquí solo creamos el registro de control
                v_due_date,
                'pending',
                null,
                'Auto-creado desde preinscripción',
                coalesce(NEW.afa_member, false),
                v_month,
                v_year,
                null,
                now()
            );
        end loop;
    else
        -- Formato antiguo: un único alumno en columnas sueltas
        insert into public.payments (
            student_name,
            student_surname,
            course,
            activities,
            amount,
            due_date,
            status,
            bank_reference,
            notes,
            afa_member,
            payment_month,
            payment_year,
            payment_date,
            updated_at
        ) values (
            coalesce(NEW.student_name,''),
            coalesce(NEW.student_surname,''),
            coalesce(NEW.student_course,''),
            coalesce(NEW.activities, array[]::text[]),
            0,
            v_due_date,
            'pending',
            null,
            'Auto-creado desde preinscripción (formato antiguo)',
            coalesce(NEW.afa_member, false),
            v_month,
            v_year,
            null,
            now()
        );
    end if;

    return NEW;
end;
$$;


ALTER FUNCTION "public"."fn_create_payments_for_inscription"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_acollida_payments"("p_month" integer, "p_year" integer) RETURNS TABLE("success" boolean, "message" "text", "payments_generated" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_ins record; v_due date; v_amount numeric; v_days int; v_count int := 0; v_year_str text;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN QUERY SELECT false, 'No autoritzat', 0; RETURN;
  END IF;

  v_due := (date_trunc('month', make_date(p_year, p_month, 1)) + interval '9 days')::date;
  v_year_str := public.academic_year_for(p_month, p_year);

  FOR v_ins IN
    SELECT i.*, r.horari
    FROM public.acollida_inscripcions i
    JOIN public.acollida_rates r ON r.id = i.rate_id
    WHERE i.status = 'confirmada'
      AND i.academic_year = v_year_str
  LOOP
    IF v_ins.modality = 'mensual' THEN
      IF v_ins.start_year IS NOT NULL AND v_ins.start_month IS NOT NULL
         AND (v_ins.start_year * 12 + v_ins.start_month) > (p_year * 12 + p_month) THEN
        CONTINUE;
      END IF;
      v_amount := public.acollida_price_for(v_ins.rate_id, v_ins.afa_member, false);
    ELSE
      SELECT count(*) INTO v_days
      FROM unnest(v_ins.occasional_dates) d
      WHERE extract(month FROM d)::int = p_month AND extract(year FROM d)::int = p_year;
      IF coalesce(v_days, 0) = 0 THEN CONTINUE; END IF;
      v_amount := coalesce(public.acollida_price_for(v_ins.rate_id, v_ins.afa_member, true), 0) * v_days;
    END IF;

    IF coalesce(v_amount, 0) <= 0 THEN CONTINUE; END IF;

    INSERT INTO public.payments(
      student_name, student_surname, course, concept, activities, amount, due_date,
      parent_name, parent_email, parent_phone, afa_member, status,
      payment_month, payment_year, bank_reference)
    VALUES (
      v_ins.child_name, v_ins.child_surname, v_ins.course, 'acollida',
      ARRAY['Acollida ' || v_ins.horari], v_amount, v_due,
      v_ins.parent_name, v_ins.parent_email, v_ins.parent_phone, v_ins.afa_member, 'pending',
      p_month, p_year, 'ACO-' || v_ins.id)
    ON CONFLICT ON CONSTRAINT uq_payments_student_month DO UPDATE SET
      amount = EXCLUDED.amount,
      due_date = EXCLUDED.due_date,
      activities = EXCLUDED.activities,
      parent_email = EXCLUDED.parent_email,
      parent_phone = EXCLUDED.parent_phone,
      bank_reference = EXCLUDED.bank_reference,
      updated_at = now()
    WHERE payments.status <> 'paid';

    v_count := v_count + 1;
  END LOOP;

  RETURN QUERY SELECT true, 'Rebuts d''acollida generats', v_count;
END;
$$;


ALTER FUNCTION "public"."generate_acollida_payments"("p_month" integer, "p_year" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_book_payments"("p_year" integer) RETURNS TABLE("success" boolean, "message" "text", "payments_generated" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_ins record; v_student jsonb; v_course text; v_amount numeric;
  v_year_str text; v_due date; v_count int := 0;
BEGIN
  IF NOT public.is_admin() THEN RETURN QUERY SELECT false, 'No autoritzat', 0; RETURN; END IF;
  v_year_str := public.academic_year_for(9, p_year);
  v_due := make_date(p_year, 9, 15);
  FOR v_ins IN
    SELECT * FROM inscripcions
    WHERE coalesce(status, 'alta') = 'alta'
      AND coalesce(academic_year, v_year_str) = v_year_str
  LOOP
    FOR v_student IN SELECT jsonb_array_elements(v_ins.students) LOOP
      v_course := v_student->>'course';
      v_amount := public.book_price_for(v_course);
      IF coalesce(v_amount, 0) <= 0 THEN CONTINUE; END IF;
      INSERT INTO payments(student_name, student_surname, course, concept, activities, amount, due_date,
        parent_name, parent_email, parent_phone, afa_member, status, payment_month, payment_year)
      VALUES (v_student->>'name', v_student->>'surname', v_course, 'llibres', ARRAY['Llibres socialització'], v_amount, v_due,
        v_ins.parent_name, v_ins.parent_email_1, v_ins.parent_phone_1, v_ins.afa_member, 'pending', 9, p_year)
      ON CONFLICT ON CONSTRAINT uq_payments_student_month DO UPDATE SET
        amount = EXCLUDED.amount, due_date = EXCLUDED.due_date, updated_at = now()
      WHERE payments.status <> 'paid';
      v_count := v_count + 1;
    END LOOP;
  END LOOP;
  RETURN QUERY SELECT true, 'Cobraments de llibres generats/actualitzats', v_count;
END $$;


ALTER FUNCTION "public"."generate_book_payments"("p_year" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_monthly_payments"("p_month" integer, "p_year" integer) RETURNS TABLE("success" boolean, "message" "text", "payments_generated" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_ins record; v_student jsonb; v_activities text[]; v_billable text[];
  v_total numeric(10,2); v_due_date date; v_count int := 0;
BEGIN
  IF p_month < 1 OR p_month > 12 THEN RETURN QUERY SELECT false, 'Mes inválido', 0; RETURN; END IF;
  v_due_date := (date_trunc('month', make_date(p_year, p_month, 1)) + interval '9 days')::date;
  FOR v_ins IN SELECT * FROM inscripcions LOOP
    FOR v_student IN SELECT jsonb_array_elements(v_ins.students) LOOP
      v_activities := ARRAY(SELECT jsonb_array_elements_text(v_student->'activities'));
      IF coalesce(array_length(v_activities,1),0) = 0 THEN CONTINUE; END IF;
      v_billable := ARRAY(SELECT a FROM unnest(v_activities) a WHERE NOT public.is_activity_excluded(a));
      v_total := public.student_monthly_fee(v_activities, v_ins.afa_member);
      IF coalesce(v_total,0) <= 0 THEN CONTINUE; END IF;
      INSERT INTO payments(student_name, student_surname, course, activities, amount, due_date,
        parent_name, parent_email, parent_phone, afa_member, status, payment_month, payment_year)
      VALUES (v_student->>'name', v_student->>'surname', v_student->>'course', v_billable, v_total, v_due_date,
        v_ins.parent_name, v_ins.parent_email_1, v_ins.parent_phone_1, v_ins.afa_member, 'pending', p_month, p_year)
      ON CONFLICT ON CONSTRAINT uq_payments_student_month DO UPDATE SET
        activities = EXCLUDED.activities, amount = EXCLUDED.amount, due_date = EXCLUDED.due_date,
        parent_name = EXCLUDED.parent_name, parent_email = EXCLUDED.parent_email, parent_phone = EXCLUDED.parent_phone,
        afa_member = EXCLUDED.afa_member, updated_at = now()
      WHERE payments.status <> 'paid';
      v_count := v_count + 1;
    END LOOP;
  END LOOP;
  RETURN QUERY SELECT true, 'Pagos generados/actualizados', v_count;
END $$;


ALTER FUNCTION "public"."generate_monthly_payments"("p_month" integer, "p_year" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_monthly_payments_only_active"("p_month" integer, "p_year" integer) RETURNS TABLE("success" boolean, "message" "text", "payments_generated" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_ins record; v_student jsonb; v_activities text[]; v_billable text[];
  v_total numeric(10,2); v_due_date date; v_count int := 0;
BEGIN
  IF p_month < 1 OR p_month > 12 THEN RETURN QUERY SELECT false, 'Mes inválido', 0; RETURN; END IF;
  v_due_date := (date_trunc('month', make_date(p_year, p_month, 1)) + interval '9 days')::date;
  FOR v_ins IN SELECT * FROM inscripcions WHERE coalesce(status,'alta') = 'alta' LOOP
    FOR v_student IN SELECT jsonb_array_elements(v_ins.students) LOOP
      v_activities := ARRAY(SELECT jsonb_array_elements_text(v_student->'activities'));
      IF coalesce(array_length(v_activities,1),0) = 0 THEN CONTINUE; END IF;
      v_billable := ARRAY(SELECT a FROM unnest(v_activities) a WHERE NOT public.is_activity_excluded(a));
      v_total := public.student_monthly_fee(v_activities, v_ins.afa_member);
      IF coalesce(v_total,0) <= 0 THEN CONTINUE; END IF;
      INSERT INTO payments(student_name, student_surname, course, activities, amount, due_date,
        parent_name, parent_email, parent_phone, afa_member, status, payment_month, payment_year)
      VALUES (v_student->>'name', v_student->>'surname', v_student->>'course', v_billable, v_total, v_due_date,
        v_ins.parent_name, v_ins.parent_email_1, v_ins.parent_phone_1, v_ins.afa_member, 'pending', p_month, p_year)
      ON CONFLICT ON CONSTRAINT uq_payments_student_month DO UPDATE SET
        activities = EXCLUDED.activities, amount = EXCLUDED.amount, due_date = EXCLUDED.due_date,
        parent_name = EXCLUDED.parent_name, parent_email = EXCLUDED.parent_email, parent_phone = EXCLUDED.parent_phone,
        afa_member = EXCLUDED.afa_member, updated_at = now()
      WHERE payments.status <> 'paid';
      v_count := v_count + 1;
    END LOOP;
  END LOOP;
  RETURN QUERY SELECT true, 'Pagos generados/actualizados', v_count;
END $$;


ALTER FUNCTION "public"."generate_monthly_payments_only_active"("p_month" integer, "p_year" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_slug"("t" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
BEGIN
  RETURN lower(regexp_replace(t, '[^a-zA-Z0-9]+', '-', 'g'));
END;
$$;


ALTER FUNCTION "public"."generate_slug"("t" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_soci_payments"("p_year" integer) RETURNS TABLE("success" boolean, "message" "text", "payments_generated" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_ins record; v_fee numeric; v_year_str text; v_due date; v_count int := 0;
BEGIN
  IF NOT public.is_admin() THEN RETURN QUERY SELECT false, 'No autoritzat', 0; RETURN; END IF;
  v_fee := public.afa_annual_fee();
  IF coalesce(v_fee, 0) <= 0 THEN
    RETURN QUERY SELECT false, 'Quota de soci no configurada (Config > Quotes)', 0; RETURN;
  END IF;
  v_year_str := public.academic_year_for(9, p_year);
  v_due := make_date(p_year, 10, 1);
  FOR v_ins IN
    SELECT * FROM inscripcions
    WHERE afa_member = true
      AND coalesce(status, 'alta') = 'alta'
      AND coalesce(academic_year, v_year_str) = v_year_str
  LOOP
    INSERT INTO payments(student_name, student_surname, course, concept, activities, amount, due_date,
      parent_name, parent_email, parent_phone, afa_member, status, payment_month, payment_year, bank_reference)
    VALUES (coalesce(NULLIF(v_ins.parent_name, ''), 'Família'), '', '', 'soci', ARRAY['Quota soci AFA'], v_fee, v_due,
      v_ins.parent_name, v_ins.parent_email_1, v_ins.parent_phone_1, true, 'pending', 9, p_year, 'INS-' || v_ins.id)
    ON CONFLICT ON CONSTRAINT uq_payments_student_month DO UPDATE SET
      amount = EXCLUDED.amount, due_date = EXCLUDED.due_date,
      parent_email = EXCLUDED.parent_email, parent_phone = EXCLUDED.parent_phone,
      bank_reference = EXCLUDED.bank_reference, updated_at = now()
    WHERE payments.status <> 'paid';
    v_count := v_count + 1;
  END LOOP;
  RETURN QUERY SELECT true, 'Quotes de soci generades/actualitzades', v_count;
END $$;


ALTER FUNCTION "public"."generate_soci_payments"("p_year" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_db_size_bytes"() RETURNS bigint
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
  SELECT pg_database_size(current_database())::bigint;
$$;


ALTER FUNCTION "public"."get_db_size_bytes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_fee_rules"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
  SELECT COALESCE(
    (SELECT value FROM public.site_config WHERE key = 'fee_rules'),
    '{"exclude_activity_ids":[],"exclude_titles":["Anglès"],"multiactivity":{"min_activities":2,"member_price":36,"non_member_price":40}}'::jsonb
  );
$$;


ALTER FUNCTION "public"."get_fee_rules"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_last_activity"() RETURNS TABLE("fuente" "text", "ultimo" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
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


ALTER FUNCTION "public"."get_last_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_storage_size_bytes"() RETURNS bigint
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
  SELECT COALESCE(
    SUM((metadata->>'size')::bigint),
    0
  )::bigint
  FROM storage.objects
  WHERE (metadata->>'size') IS NOT NULL;
$$;


ALTER FUNCTION "public"."get_storage_size_bytes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_audit_log"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
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


ALTER FUNCTION "public"."handle_audit_log"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_audit_log"() IS 'Trigger AFTER INSERT/UPDATE/DELETE que vuelca la fila a public.audit_logs.';



CREATE OR REPLACE FUNCTION "public"."handle_new_contact_message"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM
    net.http_post(
      url := 'https://zaxbtnjkidqwzqsehvld.supabase.co/functions/v1/notify-contact',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', 'contact_messages',
        'record', row_to_json(NEW)::jsonb
      )
    );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_contact_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_shop_order"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
BEGIN
  PERFORM
    net.http_post(
      url := 'https://zaxbtnjkidqwzqsehvld.supabase.co/functions/v1/send-order-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', 'shop_orders',
        'record', row_to_json(NEW)::jsonb
      )
    );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_shop_order"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', 'familia');
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_shop_order_inventory_on_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
DECLARE
    item RECORD;
BEGIN
    -- Detectar si el estado de pago pasa a cancelado/reembolsado
    IF (OLD.payment_status NOT IN ('cancelled', 'refunded') AND NEW.payment_status IN ('cancelled', 'refunded')) THEN
        -- Restaurar stock de todos los ítems del pedido
        FOR item IN SELECT variant_id, quantity FROM public.shop_order_items WHERE order_id = NEW.id LOOP
            UPDATE public.shop_variants
            SET stock = stock + item.quantity
            WHERE id = item.variant_id;
        END LOOP;
    
    -- Detectar si el pedido sale de un estado cancelado/reembolsado (ej: reactivado)
    ELSIF (OLD.payment_status IN ('cancelled', 'refunded') AND NEW.payment_status NOT IN ('cancelled', 'refunded')) THEN
        -- Restar stock de nuevo
        FOR item IN SELECT variant_id, quantity FROM public.shop_order_items WHERE order_id = NEW.id LOOP
            UPDATE public.shop_variants
            SET stock = stock - item.quantity
            WHERE id = item.variant_id;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_shop_order_inventory_on_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hash_password"("password" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    -- Hash simple usando MD5 (para demo - en producción usar bcrypt)
    RETURN md5(password || 'afa_salt_2024');
END;
$$;


ALTER FUNCTION "public"."hash_password"("password" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_clicks"("p_slug" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.short_urls
  SET clicks = clicks + 1
  WHERE slug = p_slug;
END;
$$;


ALTER FUNCTION "public"."increment_clicks"("p_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inscripcio_signatura"("p_students" "jsonb") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public', 'pg_catalog'
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


ALTER FUNCTION "public"."inscripcio_signatura"("p_students" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."inscripcio_signatura"("p_students" "jsonb") IS 'Huella normalizada de las criaturas de una inscripción (minúsculas, sin espacios de sobra, actividades y criaturas ordenadas). GEMELA de studentsSignature() en src/logic/inscriptionDuplicates.ts: si se toca una, se toca la otra.';



CREATE OR REPLACE FUNCTION "public"."is_activity_excluded"("p_activity" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $_$
  WITH rules AS (
    SELECT public.get_fee_rules() AS j
  ),
  ids AS (
    SELECT ARRAY(
      SELECT e::bigint
      FROM rules, jsonb_array_elements_text(COALESCE(rules.j->'exclude_activity_ids', '[]'::jsonb)) AS t(e)
      WHERE e ~ '^[0-9]+$'
    ) AS arr
  ),
  excluded_titles AS (
    -- Configured by id: resolve the current title from the catalogue.
    SELECT a.title AS title
    FROM public.activities a, ids
    WHERE COALESCE(array_length(ids.arr, 1), 0) > 0
      AND a.id = ANY(ids.arr)

    UNION ALL

    -- Legacy fallback: only while no ids are configured.
    SELECT t.title
    FROM rules, ids,
         jsonb_array_elements_text(COALESCE(rules.j->'exclude_titles', '[]'::jsonb)) AS t(title)
    WHERE COALESCE(array_length(ids.arr, 1), 0) = 0
  )
  SELECT EXISTS (
    SELECT 1
    FROM excluded_titles
    WHERE title IS NOT NULL
      AND title <> ''
      AND p_activity ILIKE title || '%'
  );
$_$;


ALTER FUNCTION "public"."is_activity_excluded"("p_activity" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_activity_excluded"("p_activity" "text") IS 'True when a stored inscription activity value belongs to an activity excluded from the AFA monthly fee. Reads site_config.fee_rules: exclude_activity_ids (stable ids, preferred) with a fallback to the legacy exclude_titles list.';



CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'coordinator')
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_allowed_setting_key"("p_key" "text") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    AS $$
  SELECT p_key IN ('GEMINI_API_KEY');
$$;


ALTER FUNCTION "public"."is_allowed_setting_key"("p_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_audit_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Intencionadamente sin efecto: la auditoria de verdad son los trg_audit_*.
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."log_audit_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mask_secret"("value" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    len INT := length(coalesce(value, ''));
BEGIN
    IF len = 0 THEN RETURN ''; END IF;
    IF len < 8 THEN RETURN repeat('•', len); END IF;
    RETURN repeat('•', len - 4) || right(value, 4);
END;
$$;


ALTER FUNCTION "public"."mask_secret"("value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_triggers_on_inscripcions"() RETURNS "event_trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.object_type = 'trigger'
       AND cmd.schema_name = 'public'
       AND cmd.object_identity LIKE '% inscripcions' -- target table
    THEN
      -- extraer nombre del trigger propuesto
      -- object_identity suele ser: trigger_name ON public.inscripcions
      IF split_part(cmd.object_identity, ' ', 1) <> 'update_inscripcions_updated_at' THEN
        RAISE EXCEPTION 'Por política: no se pueden crear triggers en public.inscripcions salvo update_inscripcions_updated_at';
      END IF;
    END IF;
  END LOOP;
END
$$;


ALTER FUNCTION "public"."prevent_triggers_on_inscripcions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_profile_role"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    jwt_role text := COALESCE(
        NULLIF(current_setting('request.jwt.claims', true), '')::json ->> 'role',
        ''
    );
    caller_is_admin boolean;
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.role IS NOT DISTINCT FROM OLD.role THEN
        RETURN NEW;
    END IF;

    -- Sin claims JWT = conexion directa (psql, Management API, migraciones)
    IF jwt_role IN ('service_role', 'supabase_admin', '') THEN
        RETURN NEW;
    END IF;

    SELECT (p.role = 'admin') INTO caller_is_admin
    FROM public.profiles p
    WHERE p.id = auth.uid();

    IF COALESCE(caller_is_admin, false) THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        NEW.role := 'familia';
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'No autoritzat a modificar profiles.role'
        USING ERRCODE = '42501';
END;
$$;


ALTER FUNCTION "public"."protect_profile_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_payment_received"("p_student_name" "text", "p_student_surname" "text", "p_payment_date" "date", "p_amount" numeric, "p_bank_reference" "text" DEFAULT NULL::"text", "p_notes" "text" DEFAULT NULL::"text") RETURNS TABLE("success" boolean, "message" "text")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_payment RECORD;
    v_payment_id UUID;
BEGIN
    -- Buscar el pago pendiente más reciente para este estudiante
    SELECT * INTO v_payment
    FROM payments 
    WHERE student_name = p_student_name 
      AND student_surname = p_student_surname
      AND status = 'pending'
      AND amount = p_amount
    ORDER BY due_date DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'No se encontró un pago pendiente que coincida con los datos proporcionados';
        RETURN;
    END IF;
    
    v_payment_id := v_payment.id;
    
    -- Actualizar el pago como pagado
    UPDATE payments 
    SET status = 'paid', 
        payment_date = p_payment_date,
        bank_reference = p_bank_reference,
        notes = p_notes,
        updated_at = NOW()
    WHERE id = v_payment_id;
    
    -- Registrar en el historial
    INSERT INTO payment_history (
        payment_id,
        status_change,
        changed_by,
        notes
    ) VALUES (
        v_payment_id,
        'paid',
        'admin',
        COALESCE(p_notes, 'Pago registrado manualmente')
    );
    
    RETURN QUERY SELECT TRUE, 'Pago registrado exitosamente';
END;
$$;


ALTER FUNCTION "public"."record_payment_received"("p_student_name" "text", "p_student_surname" "text", "p_payment_date" "date", "p_amount" numeric, "p_bank_reference" "text", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_baja_payments_for_month"("p_month" integer, "p_year" integer) RETURNS TABLE("removed" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."remove_baja_payments_for_month"("p_month" integer, "p_year" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."remove_baja_payments_for_month"("p_month" integer, "p_year" integer) IS 'Borra los pagos del mes de las familias de baja. El atajo por correo (pagos sin inscripcion_id) se salta los correos que también tiene alguna inscripción de alta, para no llevarse los pagos del hermano que sigue apuntado.';



CREATE OR REPLACE FUNCTION "public"."rollover_acollida_payments"("p_from_month" integer, "p_from_year" integer, "p_to_month" integer, "p_to_year" integer) RETURNS TABLE("success" boolean, "message" "text", "payments_generated" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE v_due date; v_count int := 0;
BEGIN
  IF NOT public.is_admin() THEN RETURN QUERY SELECT false, 'No autoritzat', 0; RETURN; END IF;
  v_due := (date_trunc('month', make_date(p_to_year, p_to_month, 1)) + interval '9 days')::date;
  INSERT INTO payments(student_name, student_surname, course, concept, activities, amount, due_date,
    parent_name, parent_email, parent_phone, afa_member, status, payment_month, payment_year, notes)
  SELECT student_name, student_surname, course, 'acollida', activities, amount, v_due,
    parent_name, parent_email, parent_phone, afa_member, 'pending', p_to_month, p_to_year, notes
  FROM payments
  WHERE concept = 'acollida' AND payment_month = p_from_month AND payment_year = p_from_year
  ON CONFLICT ON CONSTRAINT uq_payments_student_month DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT true, 'Rebuts d''acollida duplicats', v_count;
END $$;


ALTER FUNCTION "public"."rollover_acollida_payments"("p_from_month" integer, "p_from_year" integer, "p_to_month" integer, "p_to_year" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_board_members_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_board_members_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_finance_tx_academic_year"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
BEGIN
  IF NEW.academic_year IS NULL THEN
    NEW.academic_year := public.academic_year_for(
      EXTRACT(MONTH FROM NEW.date)::int,
      EXTRACT(YEAR FROM NEW.date)::int);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_finance_tx_academic_year"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_forms_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_forms_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_inscripcio_academic_year"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
BEGIN
  IF NEW.academic_year IS NULL THEN
    NEW.academic_year := public.current_academic_year();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_inscripcio_academic_year"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_payer_aliases_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;


ALTER FUNCTION "public"."set_payer_aliases_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_payment_academic_year"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
BEGIN
  NEW.academic_year := public.academic_year_for(NEW.payment_month, NEW.payment_year);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_payment_academic_year"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_shop_order_academic_year"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
BEGIN
  IF NEW.academic_year IS NULL THEN
    NEW.academic_year := public.current_academic_year();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_shop_order_academic_year"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."soft_delete_form_submission"("submission_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Solo administradores pueden borrar envíos'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.form_submissions
       SET deleted_at = NOW()
     WHERE id = submission_id
       AND deleted_at IS NULL;
END;
$$;


ALTER FUNCTION "public"."soft_delete_form_submission"("submission_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."student_monthly_fee"("p_activities" "text"[], "p_is_member" boolean) RETURNS numeric
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
DECLARE
  v_rules jsonb := public.get_fee_rules();
  v_min int := COALESCE((v_rules->'multiactivity'->>'min_activities')::int, 2);
  v_billable text[];
  v_n int;
  v_total numeric(10,2) := 0;
  v_activity text;
BEGIN
  v_billable := ARRAY(SELECT a FROM unnest(p_activities) a WHERE NOT public.is_activity_excluded(a));
  v_n := COALESCE(array_length(v_billable, 1), 0);
  IF v_n = 0 THEN
    RETURN 0;
  END IF;

  IF v_n >= v_min THEN
    RETURN CASE
      WHEN p_is_member THEN COALESCE((v_rules->'multiactivity'->>'member_price')::numeric, 0)
      ELSE COALESCE((v_rules->'multiactivity'->>'non_member_price')::numeric, 0)
    END;
  END IF;

  FOREACH v_activity IN ARRAY v_billable LOOP
    v_total := v_total + public.activity_monthly_price(v_activity, p_is_member);
  END LOOP;
  RETURN v_total;
END;
$$;


ALTER FUNCTION "public"."student_monthly_fee"("p_activities" "text"[], "p_is_member" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_shop_variant_stock"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.shop_variants
        SET stock = stock - NEW.quantity
        WHERE id = NEW.variant_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.shop_variants
        SET stock = stock + OLD.quantity
        WHERE id = OLD.variant_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Si cambia la variante
        IF (OLD.variant_id <> NEW.variant_id) THEN
            UPDATE public.shop_variants
            SET stock = stock + OLD.quantity
            WHERE id = OLD.variant_id;
            
            UPDATE public.shop_variants
            SET stock = stock - NEW.quantity
            WHERE id = NEW.variant_id;
        -- Si solo cambia la cantidad
        ELSIF (OLD.quantity <> NEW.quantity) THEN
            UPDATE public.shop_variants
            SET stock = stock + (OLD.quantity - NEW.quantity)
            WHERE id = NEW.variant_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."sync_shop_variant_stock"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_shop_order_total"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_order_id UUID;
    v_total NUMERIC;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_order_id := OLD.order_id;
    ELSE
        v_order_id := NEW.order_id;
    END IF;

    SELECT COALESCE(SUM(quantity * price_at_time), 0)
    INTO v_total
    FROM public.shop_order_items
    WHERE order_id = v_order_id;

    UPDATE public.shop_orders
    SET total_amount = v_total
    WHERE id = v_order_id;

    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_shop_order_total"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."acollida_inscripcions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "academic_year" "text" NOT NULL,
    "child_name" "text" NOT NULL,
    "child_surname" "text" NOT NULL,
    "course" "text" NOT NULL,
    "rate_id" "uuid" NOT NULL,
    "modality" "text" DEFAULT 'mensual'::"text" NOT NULL,
    "weekdays" smallint[] DEFAULT '{}'::smallint[] NOT NULL,
    "occasional_dates" "date"[] DEFAULT '{}'::"date"[] NOT NULL,
    "start_month" smallint,
    "start_year" smallint,
    "parent_name" "text" NOT NULL,
    "parent_email" "text" NOT NULL,
    "parent_phone" "text" NOT NULL,
    "afa_member" boolean DEFAULT false NOT NULL,
    "notes" "text",
    "status" "text" DEFAULT 'pendent'::"text" NOT NULL,
    "form_language" "text" DEFAULT 'ca'::"text" NOT NULL,
    CONSTRAINT "acollida_inscripcions_modality_check" CHECK (("modality" = ANY (ARRAY['mensual'::"text", 'ocasional'::"text"]))),
    CONSTRAINT "acollida_inscripcions_month_check" CHECK ((("start_month" IS NULL) OR (("start_month" >= 1) AND ("start_month" <= 12)))),
    CONSTRAINT "acollida_inscripcions_status_check" CHECK (("status" = ANY (ARRAY['pendent'::"text", 'confirmada'::"text", 'baixa'::"text"]))),
    CONSTRAINT "acollida_inscripcions_weekdays_check" CHECK (("weekdays" <@ ARRAY[(1)::smallint, (2)::smallint, (3)::smallint, (4)::smallint, (5)::smallint]))
);


ALTER TABLE "public"."acollida_inscripcions" OWNER TO "postgres";


COMMENT ON TABLE "public"."acollida_inscripcions" IS 'Sol·licituds del servei d''acollida, una fila per infant. Substitueix el formulari genèric /f/acollida des del 2026-09-05.';



COMMENT ON COLUMN "public"."acollida_inscripcions"."weekdays" IS 'Dies de la setmana en enters 1..5 (dilluns..divendres), no en etiquetes: els llistats per dia han de funcionar sigui quin sigui l''idioma del formulari.';



COMMENT ON COLUMN "public"."acollida_inscripcions"."occasional_dates" IS 'Dates concretes quan modality = ocasional. El generador de rebuts cobra les que cauen dins del mes.';



COMMENT ON COLUMN "public"."acollida_inscripcions"."status" IS 'pendent (rebuda) | confirmada (plaça donada, entra als rebuts) | baixa.';



CREATE TABLE IF NOT EXISTS "public"."acollida_rates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "horari" "text" NOT NULL,
    "preu_soci_mes" numeric NOT NULL,
    "preu_soci_ocasional" numeric,
    "preu_no_soci_mes" numeric NOT NULL,
    "preu_no_soci_ocasional" numeric,
    "order_index" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "horari_ca" "text",
    "horari_es" "text",
    "horari_en" "text",
    "active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."acollida_rates" OWNER TO "postgres";


COMMENT ON COLUMN "public"."acollida_rates"."preu_soci_mes" IS 'Preu mensual per a famílies sòcies, en euros. Numèric des de 2026-09-05 (abans text: «64€»).';



COMMENT ON COLUMN "public"."acollida_rates"."active" IS 'Franja oferta al formulari públic. Una tarifa amb sol·licituds no es pot esborrar: es desactiva.';



CREATE TABLE IF NOT EXISTS "public"."activities" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "title" "text" NOT NULL,
    "category" "text" NOT NULL,
    "description" "text",
    "price" numeric,
    "price_info" "text" DEFAULT '/mes'::"text",
    "grades" "text",
    "schedule_summary" "text",
    "schedule_details" "jsonb" DEFAULT '[]'::"jsonb",
    "place" "text",
    "spots" integer DEFAULT 0,
    "image_url" "text",
    "color" "text" DEFAULT 'bg-primary'::"text",
    "category_icon" "text",
    "is_stem_approved" boolean DEFAULT false,
    "important_note" "text",
    "price_member" numeric,
    "price_non_member" numeric,
    "title_es" "text",
    "title_ca" "text",
    "title_en" "text",
    "description_es" "text",
    "description_ca" "text",
    "description_en" "text",
    "grades_es" "text",
    "grades_ca" "text",
    "grades_en" "text",
    "schedule_summary_es" "text",
    "schedule_summary_ca" "text",
    "schedule_summary_en" "text",
    "important_note_es" "text",
    "important_note_ca" "text",
    "important_note_en" "text",
    "category_ca" "text",
    "category_es" "text",
    "category_en" "text",
    "place_ca" "text",
    "place_es" "text",
    "place_en" "text",
    "inscription_course_types" "text"[] DEFAULT '{}'::"text"[],
    "inscription_enabled" boolean DEFAULT false
);


ALTER TABLE "public"."activities" OWNER TO "postgres";


ALTER TABLE "public"."activities" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."activities_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."admin_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "priority" "text" DEFAULT 'medium'::"text" NOT NULL,
    "due_date" "date",
    "assigned_to" "uuid",
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "assignee_name" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "subtasks" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    CONSTRAINT "admin_tasks_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "admin_tasks_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'blocked'::"text", 'done'::"text"])))
);


ALTER TABLE "public"."admin_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "username" "text" NOT NULL,
    "password_hash" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "last_login" timestamp with time zone,
    "created_by" "text" DEFAULT 'system'::"text"
);


ALTER TABLE "public"."admin_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."alert_state" (
    "name" "text" NOT NULL,
    "last_sent_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."alert_state" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_settings" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid"
);


ALTER TABLE "public"."app_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."app_settings" IS 'Runtime secrets managed from the admin UI (e.g. GEMINI_API_KEY). RLS denies all roles; only service_role and SECURITY DEFINER functions touch the raw value.';



CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "text" DEFAULT ''::"text" NOT NULL,
    "action" "text" NOT NULL,
    "old_data" "jsonb",
    "new_data" "jsonb",
    "changed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "audit_logs_action_check" CHECK (("action" = ANY (ARRAY['INSERT'::"text", 'UPDATE'::"text", 'DELETE'::"text"])))
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."audit_logs" IS 'Traza de cambios (INSERT/UPDATE/DELETE) sobre las tablas de contenido gestionadas desde el CMS. Se purga a 90 días por cron (ver 20260417000000_audit_logs_auto_purge.sql).';



COMMENT ON COLUMN "public"."audit_logs"."record_id" IS 'PK de la fila afectada, como texto. Vacío si la tabla no tiene columna id.';



COMMENT ON COLUMN "public"."audit_logs"."changed_by" IS 'auth.uid() del autor. NULL = acción de sistema (cron, service_role, cascada).';



CREATE TABLE IF NOT EXISTS "public"."bank_imports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "file_hash" "text" NOT NULL,
    "filename" "text",
    "movements_total" integer DEFAULT 0 NOT NULL,
    "movements_income" integer DEFAULT 0 NOT NULL,
    "matched_count" integer DEFAULT 0 NOT NULL,
    "applied_count" integer DEFAULT 0 NOT NULL,
    "imported_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"()
);


ALTER TABLE "public"."bank_imports" OWNER TO "postgres";


COMMENT ON TABLE "public"."bank_imports" IS 'One row per reconciled N43 statement (hash-deduped) with a match/apply summary.';



CREATE TABLE IF NOT EXISTS "public"."board_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "role" "text" NOT NULL,
    "role_key" "text" DEFAULT 'vocal'::"text" NOT NULL,
    "bio" "text",
    "email" "text",
    "photo_url" "text",
    "display_order" integer DEFAULT 0 NOT NULL,
    "is_visible" boolean DEFAULT true NOT NULL,
    "translations" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."board_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_errors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fingerprint" "text" NOT NULL,
    "kind" "text" NOT NULL,
    "message" "text" NOT NULL,
    "stack" "text",
    "source" "text",
    "page_url" "text",
    "user_agent" "text",
    "app_version" "text",
    "user_id" "uuid",
    "resolved_at" timestamp with time zone,
    CONSTRAINT "client_errors_kind_check" CHECK (("kind" = ANY (ARRAY['render'::"text", 'window'::"text", 'promise'::"text", 'manual'::"text"]))),
    CONSTRAINT "client_errors_limites" CHECK (((("char_length"("fingerprint") >= 1) AND ("char_length"("fingerprint") <= 64)) AND (("char_length"("message") >= 1) AND ("char_length"("message") <= 2000)) AND ("char_length"(COALESCE("stack", ''::"text")) <= 8000) AND ("char_length"(COALESCE("source", ''::"text")) <= 500) AND ("char_length"(COALESCE("page_url", ''::"text")) <= 1000) AND ("char_length"(COALESCE("user_agent", ''::"text")) <= 400) AND ("char_length"(COALESCE("app_version", ''::"text")) <= 100)))
);


ALTER TABLE "public"."client_errors" OWNER TO "postgres";


COMMENT ON TABLE "public"."client_errors" IS 'Errores de JavaScript capturados en el navegador. Los escribe el propio cliente (anon incluido); solo los admin pueden leerlos. Se purgan a 90 días por cron.';



COMMENT ON COLUMN "public"."client_errors"."fingerprint" IS 'Hash de tipo+mensaje+primera línea de pila. Agrupa el mismo fallo reportado por muchas visitas.';



CREATE TABLE IF NOT EXISTS "public"."contact_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "message" "text" NOT NULL,
    "status" "text" DEFAULT 'unread'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "contact_messages_status_check" CHECK (("status" = ANY (ARRAY['unread'::"text", 'read'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."contact_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "category" "text" DEFAULT 'general'::"text" NOT NULL,
    "file_url" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "file_type" "text",
    "size_bytes" bigint,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "event_date" "date" NOT NULL,
    "start_time" time without time zone,
    "end_time" time without time zone,
    "location" "text",
    "all_day" boolean DEFAULT false,
    "event_type" "text" DEFAULT 'general'::"text",
    "color" "text" DEFAULT '#3b82f6'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "end_date" "date",
    CONSTRAINT "events_end_date_after_start" CHECK ((("end_date" IS NULL) OR ("end_date" >= "event_date"))),
    CONSTRAINT "events_event_type_check" CHECK (("event_type" = ANY (ARRAY['general'::"text", 'meeting'::"text", 'celebration'::"text", 'deadline'::"text", 'activity'::"text"])))
);


ALTER TABLE "public"."events" OWNER TO "postgres";


COMMENT ON TABLE "public"."events" IS 'Stores general calendar events for the AFA';



COMMENT ON COLUMN "public"."events"."end_date" IS 'Último día del evento, inclusivo. Igual a event_date en eventos de un solo día; lo rellena el trigger events_fill_end_date_trg cuando llega NULL.';



CREATE TABLE IF NOT EXISTS "public"."faqs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category" "text" NOT NULL,
    "question" "text" NOT NULL,
    "answer" "text" NOT NULL,
    "translations" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."faqs" OWNER TO "postgres";


COMMENT ON TABLE "public"."faqs" IS 'Editable FAQ entries shown in the extraescolars section.';



CREATE TABLE IF NOT EXISTS "public"."finance_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "amount" numeric NOT NULL,
    "type" "text" NOT NULL,
    "category" "text" NOT NULL,
    "description" "text",
    "payment_method" "text",
    "status" "text" DEFAULT 'paid'::"text",
    "attachment_url" "text",
    "reference_id" "uuid",
    "reference_type" "text",
    "academic_year" "text",
    CONSTRAINT "finance_transactions_type_check" CHECK (("type" = ANY (ARRAY['income'::"text", 'expense'::"text"])))
);


ALTER TABLE "public"."finance_transactions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."finance_transactions"."academic_year" IS 'Accounting-year cohort derived from the transaction date.';



CREATE TABLE IF NOT EXISTS "public"."form_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "form_id" "uuid" NOT NULL,
    "submitted_by_user_id" "uuid",
    "answers" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."form_submissions" OWNER TO "postgres";


COMMENT ON TABLE "public"."form_submissions" IS 'Envíos recibidos en formularios públicos. Soft-delete via deleted_at.';



CREATE TABLE IF NOT EXISTS "public"."forms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "slug" "text" NOT NULL,
    "header_image_url" "text",
    "folder" "text",
    "closes_at" timestamp with time zone,
    "fields_schema" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "translations" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."forms" OWNER TO "postgres";


COMMENT ON TABLE "public"."forms" IS 'Plantillas de formularios dinámicos creados desde el admin del AFA.';



COMMENT ON COLUMN "public"."forms"."folder" IS 'Carpeta/categoría libre para agrupar formularios (ej: Inscripcions, Extraescolars, Menjador).';



COMMENT ON COLUMN "public"."forms"."translations" IS 'Multilingual content: { "ca": { title, description, fields: { [field_id]: { label, placeholder?, options? } } }, "en": { ... } }. The "es" version lives in the top-level columns (title, description) and field_schema (label, placeholder, options).';



CREATE TABLE IF NOT EXISTS "public"."inscripcions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "students" "jsonb" NOT NULL,
    "parent_name" "text" NOT NULL,
    "parent_dni" "text" NOT NULL,
    "parent_phone_1" "text" NOT NULL,
    "parent_phone_2" "text",
    "parent_email_1" "text" NOT NULL,
    "parent_email_2" "text",
    "afa_member" boolean DEFAULT false NOT NULL,
    "health_info" "text",
    "image_auth_consent" "text",
    "can_leave_alone" boolean DEFAULT false,
    "authorized_pickup" "text",
    "conditions_accepted" boolean DEFAULT false NOT NULL,
    "form_language" "text" DEFAULT 'ca'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'alta'::"text" NOT NULL,
    "baja_reason" "text",
    "baja_at" timestamp with time zone,
    "academic_year" "text",
    "extra_answers" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "inscripcions_status_check" CHECK (("status" = ANY (ARRAY['alta'::"text", 'baja'::"text"]))),
    CONSTRAINT "inscripcions_students_check" CHECK ((("jsonb_array_length"("students") >= 1) AND ("jsonb_array_length"("students") <= 3)))
);


ALTER TABLE "public"."inscripcions" OWNER TO "postgres";


COMMENT ON TABLE "public"."inscripcions" IS 'Una fila = UNA FAMILIA con 1..3 criaturas dentro de `students` (JSONB), no una criatura. Borrar la fila se lleva a todas sus criaturas por delante; para retirar a una familia usa status = ''baja''. El borrado queda copiado en audit_logs.old_data 90 días (trigger trg_audit_inscripcions).';



COMMENT ON COLUMN "public"."inscripcions"."academic_year" IS 'Course cohort, e.g. 2026-27. Stamped from site_config.season on insert.';



COMMENT ON COLUMN "public"."inscripcions"."extra_answers" IS 'Answers to admin-defined custom questions, keyed by CustomQuestion.key.';



CREATE TABLE IF NOT EXISTS "public"."inscripcions_history" (
    "id" bigint NOT NULL,
    "inscripcion_id" "uuid" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "changed_by" "text",
    "action" "text" NOT NULL,
    "note" "text",
    "previous_record" "jsonb" NOT NULL,
    "new_record" "jsonb" NOT NULL
);


ALTER TABLE "public"."inscripcions_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."inscripcions_history" IS 'NO es la traza de cambios: solo la escriben las RPC dar_de_alta_inscripcion / dar_de_baja_inscripcion, que el frontend nunca llama. Para recuperar una inscripción borrada o ver quién la cambió, mira audit_logs (table_name = ''inscripcions'').';



CREATE TABLE IF NOT EXISTS "public"."menjador_menus" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "month" integer,
    "year" integer,
    "file_url" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "size_bytes" bigint,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "menjador_menus_month_check" CHECK ((("month" >= 1) AND ("month" <= 12)))
);


ALTER TABLE "public"."menjador_menus" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."menjador_rates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "label" "text" NOT NULL,
    "label_ca" "text",
    "label_es" "text",
    "label_en" "text",
    "rate_type" "text" NOT NULL,
    "preu_soci" "text" NOT NULL,
    "preu_no_soci" "text" NOT NULL,
    "note" "text",
    "note_ca" "text",
    "note_es" "text",
    "note_en" "text",
    "order_index" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "menjador_rates_rate_type_check" CHECK (("rate_type" = ANY (ARRAY['fix'::"text", 'esporadic'::"text"])))
);


ALTER TABLE "public"."menjador_rates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."monthly_payment_generation" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "generation_date" "date" NOT NULL,
    "month" integer NOT NULL,
    "year" integer NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "generated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "generated_by" "text",
    CONSTRAINT "monthly_payment_generation_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'generated'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."monthly_payment_generation" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."news" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text",
    "excerpt" "text",
    "image_url" "text",
    "published" boolean DEFAULT false,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "translations" "jsonb" DEFAULT '{}'::"jsonb",
    "slug" "text",
    "news_url" "text",
    "sources" "text",
    "event_date" timestamp with time zone,
    "attachment_url" "text",
    "attachment_name" "text"
);


ALTER TABLE "public"."news" OWNER TO "postgres";


COMMENT ON TABLE "public"."news" IS 'Stores news articles for the AFA website';



COMMENT ON COLUMN "public"."news"."translations" IS 'Multilingual content: { "ca": { "title": "...", "content": "..." }, "es": { ... }, "en": { ... } }';



COMMENT ON COLUMN "public"."news"."attachment_url" IS 'Public URL for an optional attached PDF file';



COMMENT ON COLUMN "public"."news"."attachment_name" IS 'Original file name for the optional attached PDF';



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "message" "text",
    "type" "text" DEFAULT 'info'::"text",
    "link" "text",
    "start_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "end_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "active" boolean DEFAULT true,
    "translations" "jsonb"
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON COLUMN "public"."notifications"."translations" IS 'Auto-translated content: { ca: { title, message }, es: {...}, en: {...} }';



CREATE TABLE IF NOT EXISTS "public"."payer_aliases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "alias_normalized" "text" NOT NULL,
    "parent_name" "text" NOT NULL,
    "hits" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."payer_aliases" OWNER TO "postgres";


COMMENT ON TABLE "public"."payer_aliases" IS 'Learned map from normalized N43 payer name to canonical payments.parent_name.';



CREATE TABLE IF NOT EXISTS "public"."payment_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_id" "uuid" NOT NULL,
    "status_change" "text" NOT NULL,
    "changed_by" "text" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"(),
    "notes" "text"
);


ALTER TABLE "public"."payment_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_name" "text" NOT NULL,
    "student_surname" "text" NOT NULL,
    "course" "text" NOT NULL,
    "activities" "text"[] NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "due_date" "date" NOT NULL,
    "payment_date" "date",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "bank_reference" "text",
    "notes" "text",
    "parent_name" "text" NOT NULL,
    "parent_email" "text" NOT NULL,
    "parent_phone" "text" NOT NULL,
    "afa_member" boolean DEFAULT false NOT NULL,
    "payment_month" integer NOT NULL,
    "payment_year" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "inscripcion_id" "uuid",
    "academic_year" "text",
    "concept" "text" DEFAULT 'extraescolar'::"text" NOT NULL,
    CONSTRAINT "payments_concept_check" CHECK (("concept" = ANY (ARRAY['extraescolar'::"text", 'acollida'::"text", 'soci'::"text", 'llibres'::"text"]))),
    CONSTRAINT "payments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'overdue'::"text"])))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


COMMENT ON COLUMN "public"."payments"."academic_year" IS 'Course cohort derived from payment_month/payment_year.';



COMMENT ON COLUMN "public"."payments"."concept" IS 'Billing concept: extraescolar | acollida | soci | llibres.';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone,
    "full_name" "text",
    "avatar_url" "text",
    "role" "text" DEFAULT 'familia'::"text" NOT NULL,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'monitor'::"text", 'familia'::"text"]))),
    CONSTRAINT "username_length" CHECK (("char_length"("full_name") >= 3))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "image_url" "text",
    "status" "text" DEFAULT 'active'::"text",
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "projects_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


COMMENT ON TABLE "public"."projects" IS 'Stores AFA projects and initiatives';



CREATE TABLE IF NOT EXISTS "public"."shop_order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "variant_id" "uuid",
    "quantity" integer NOT NULL,
    "price_at_time" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."shop_order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shop_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "total_amount" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "customer_name" "text",
    "payment_status" "text" DEFAULT 'pending'::"text",
    "delivery_status" "text" DEFAULT 'pending'::"text",
    "customer_email" "text",
    "language" "text" DEFAULT 'ca'::"text",
    "customer_phone" "text",
    "is_member" boolean DEFAULT false NOT NULL,
    "academic_year" "text"
);


ALTER TABLE "public"."shop_orders" OWNER TO "postgres";


COMMENT ON COLUMN "public"."shop_orders"."customer_phone" IS 'Customer phone number used as contact alternative to email';



COMMENT ON COLUMN "public"."shop_orders"."is_member" IS 'Whether the customer identified as an AFA member at the time of purchase. Independent of user_id.';



COMMENT ON COLUMN "public"."shop_orders"."academic_year" IS 'Course cohort, e.g. 2026-27. Stamped from site_config.season on insert.';



CREATE TABLE IF NOT EXISTS "public"."shop_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "category" "text" NOT NULL,
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "name_es" "text",
    "name_ca" "text",
    "name_en" "text",
    "description_es" "text",
    "description_ca" "text",
    "description_en" "text"
);


ALTER TABLE "public"."shop_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shop_variants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid",
    "size" "text" NOT NULL,
    "price_member" numeric(10,2) NOT NULL,
    "price_non_member" numeric(10,2) NOT NULL,
    "stock" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."shop_variants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."short_urls" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "target_url" "text" NOT NULL,
    "description" "text",
    "clicks" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    CONSTRAINT "short_urls_clicks_non_negative_chk" CHECK (("clicks" >= 0)),
    CONSTRAINT "short_urls_slug_format_chk" CHECK (("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::"text")),
    CONSTRAINT "short_urls_target_url_protocol_chk" CHECK (("target_url" ~ '^https?://'::"text"))
);


ALTER TABLE "public"."short_urls" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."site_announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "is_active" boolean DEFAULT false,
    "message" "text" NOT NULL,
    "type" "text" DEFAULT 'info'::"text",
    "link" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "translations" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."site_announcements" OWNER TO "postgres";


COMMENT ON COLUMN "public"."site_announcements"."translations" IS 'Translations for the banner message: { "ca": "...", "es": "...", "en": "..." }';



CREATE TABLE IF NOT EXISTS "public"."site_config" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."site_config" OWNER TO "postgres";


ALTER TABLE ONLY "public"."acollida_inscripcions"
    ADD CONSTRAINT "acollida_inscripcions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."acollida_rates"
    ADD CONSTRAINT "acollida_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_tasks"
    ADD CONSTRAINT "admin_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."alert_state"
    ADD CONSTRAINT "alert_state_pkey" PRIMARY KEY ("name");



ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bank_imports"
    ADD CONSTRAINT "bank_imports_file_hash_key" UNIQUE ("file_hash");



ALTER TABLE ONLY "public"."bank_imports"
    ADD CONSTRAINT "bank_imports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."board_members"
    ADD CONSTRAINT "board_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_errors"
    ADD CONSTRAINT "client_errors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact_messages"
    ADD CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."faqs"
    ADD CONSTRAINT "faqs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."finance_transactions"
    ADD CONSTRAINT "finance_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."form_submissions"
    ADD CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."forms"
    ADD CONSTRAINT "forms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."forms"
    ADD CONSTRAINT "forms_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."inscripcions_history"
    ADD CONSTRAINT "inscripcions_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inscripcions"
    ADD CONSTRAINT "inscripcions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."menjador_menus"
    ADD CONSTRAINT "menjador_menus_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."menjador_rates"
    ADD CONSTRAINT "menjador_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."monthly_payment_generation"
    ADD CONSTRAINT "monthly_payment_generation_month_year_key" UNIQUE ("month", "year");



ALTER TABLE ONLY "public"."monthly_payment_generation"
    ADD CONSTRAINT "monthly_payment_generation_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."news"
    ADD CONSTRAINT "news_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payer_aliases"
    ADD CONSTRAINT "payer_aliases_alias_normalized_key" UNIQUE ("alias_normalized");



ALTER TABLE ONLY "public"."payer_aliases"
    ADD CONSTRAINT "payer_aliases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_history"
    ADD CONSTRAINT "payment_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shop_order_items"
    ADD CONSTRAINT "shop_order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shop_orders"
    ADD CONSTRAINT "shop_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shop_products"
    ADD CONSTRAINT "shop_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shop_variants"
    ADD CONSTRAINT "shop_variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."short_urls"
    ADD CONSTRAINT "short_urls_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_announcements"
    ADD CONSTRAINT "site_announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_config"
    ADD CONSTRAINT "site_config_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "uq_payments_student_month" UNIQUE ("student_name", "student_surname", "course", "concept", "payment_month", "payment_year");



CREATE INDEX "events_date_range_idx" ON "public"."events" USING "btree" ("event_date", "end_date");



CREATE INDEX "idx_acollida_ins_course" ON "public"."acollida_inscripcions" USING "btree" ("course");



CREATE INDEX "idx_acollida_ins_created" ON "public"."acollida_inscripcions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_acollida_ins_rate" ON "public"."acollida_inscripcions" USING "btree" ("rate_id");



CREATE INDEX "idx_acollida_ins_weekdays" ON "public"."acollida_inscripcions" USING "gin" ("weekdays");



CREATE INDEX "idx_acollida_ins_year_status" ON "public"."acollida_inscripcions" USING "btree" ("academic_year", "status");



CREATE INDEX "idx_admin_tasks_assigned_to" ON "public"."admin_tasks" USING "btree" ("assigned_to");



CREATE INDEX "idx_admin_tasks_assignee_name" ON "public"."admin_tasks" USING "btree" ("assignee_name");



CREATE INDEX "idx_admin_tasks_due_date" ON "public"."admin_tasks" USING "btree" ("due_date");



CREATE INDEX "idx_admin_tasks_priority" ON "public"."admin_tasks" USING "btree" ("priority");



CREATE INDEX "idx_admin_tasks_status" ON "public"."admin_tasks" USING "btree" ("status");



CREATE INDEX "idx_admin_tasks_subtasks" ON "public"."admin_tasks" USING "gin" ("subtasks");



CREATE INDEX "idx_admin_tasks_tags" ON "public"."admin_tasks" USING "gin" ("tags");



CREATE INDEX "idx_admin_users_active" ON "public"."admin_users" USING "btree" ("is_active");



CREATE INDEX "idx_admin_users_username" ON "public"."admin_users" USING "btree" ("username");



CREATE INDEX "idx_audit_logs_action" ON "public"."audit_logs" USING "btree" ("action");



CREATE INDEX "idx_audit_logs_changed_by" ON "public"."audit_logs" USING "btree" ("changed_by");



CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_logs_table_record" ON "public"."audit_logs" USING "btree" ("table_name", "record_id");



CREATE INDEX "idx_bank_imports_hash" ON "public"."bank_imports" USING "btree" ("file_hash");



CREATE INDEX "idx_board_members_order" ON "public"."board_members" USING "btree" ("is_visible", "display_order");



CREATE INDEX "idx_client_errors_created_at" ON "public"."client_errors" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_client_errors_fingerprint" ON "public"."client_errors" USING "btree" ("fingerprint", "created_at" DESC);



CREATE INDEX "idx_client_errors_sin_resolver" ON "public"."client_errors" USING "btree" ("created_at" DESC) WHERE ("resolved_at" IS NULL);



CREATE INDEX "idx_events_date" ON "public"."events" USING "btree" ("event_date");



CREATE INDEX "idx_events_event_date" ON "public"."events" USING "btree" ("event_date");



CREATE INDEX "idx_faqs_active_order" ON "public"."faqs" USING "btree" ("is_active", "sort_order");



CREATE INDEX "idx_finance_tx_academic_year" ON "public"."finance_transactions" USING "btree" ("academic_year");



CREATE INDEX "idx_form_submissions_deleted_at" ON "public"."form_submissions" USING "btree" ("deleted_at");



CREATE INDEX "idx_form_submissions_form_id" ON "public"."form_submissions" USING "btree" ("form_id");



CREATE INDEX "idx_forms_folder" ON "public"."forms" USING "btree" ("folder");



CREATE INDEX "idx_forms_slug" ON "public"."forms" USING "btree" ("slug");



CREATE INDEX "idx_inscripcions_academic_year" ON "public"."inscripcions" USING "btree" ("academic_year");



CREATE INDEX "idx_inscripcions_afa_member" ON "public"."inscripcions" USING "btree" ("afa_member");



CREATE INDEX "idx_inscripcions_created_at" ON "public"."inscripcions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_inscripcions_history_changed_at" ON "public"."inscripcions_history" USING "btree" ("changed_at" DESC);



CREATE INDEX "idx_inscripcions_parent_email" ON "public"."inscripcions" USING "btree" ("parent_email_1");



CREATE INDEX "idx_inscripcions_students_gin" ON "public"."inscripcions" USING "gin" ("students");



CREATE INDEX "idx_news_published" ON "public"."news" USING "btree" ("published");



CREATE INDEX "idx_news_published_at" ON "public"."news" USING "btree" ("published_at");



CREATE INDEX "idx_news_published_created" ON "public"."news" USING "btree" ("published", "created_at" DESC);



CREATE INDEX "idx_news_published_published_at" ON "public"."news" USING "btree" ("published", "published_at" DESC);



CREATE INDEX "idx_news_slug" ON "public"."news" USING "btree" ("slug");



CREATE INDEX "idx_payer_aliases_alias" ON "public"."payer_aliases" USING "btree" ("alias_normalized");



CREATE INDEX "idx_payment_history_payment_id" ON "public"."payment_history" USING "btree" ("payment_id");



CREATE INDEX "idx_payments_academic_year" ON "public"."payments" USING "btree" ("academic_year");



CREATE INDEX "idx_payments_concept" ON "public"."payments" USING "btree" ("concept");



CREATE INDEX "idx_payments_due_date" ON "public"."payments" USING "btree" ("due_date");



CREATE INDEX "idx_payments_month_year" ON "public"."payments" USING "btree" ("payment_month", "payment_year");



CREATE INDEX "idx_payments_status" ON "public"."payments" USING "btree" ("status");



CREATE INDEX "idx_payments_student" ON "public"."payments" USING "btree" ("student_name", "student_surname");



CREATE INDEX "idx_projects_status" ON "public"."projects" USING "btree" ("status");



CREATE INDEX "idx_shop_order_items_order_id" ON "public"."shop_order_items" USING "btree" ("order_id");



CREATE INDEX "idx_shop_order_items_variant_id" ON "public"."shop_order_items" USING "btree" ("variant_id");



CREATE INDEX "idx_shop_orders_academic_year" ON "public"."shop_orders" USING "btree" ("academic_year");



CREATE INDEX "idx_shop_orders_user_id" ON "public"."shop_orders" USING "btree" ("user_id");



CREATE INDEX "idx_shop_variants_product_id" ON "public"."shop_variants" USING "btree" ("product_id");



CREATE INDEX "idx_short_urls_created_at" ON "public"."short_urls" USING "btree" ("created_at" DESC);



CREATE UNIQUE INDEX "idx_short_urls_slug_unique" ON "public"."short_urls" USING "btree" ("slug");



CREATE INDEX "inscripcions_history_inscripcion_id_idx" ON "public"."inscripcions_history" USING "btree" ("inscripcion_id");



CREATE INDEX "inscripcions_status_idx" ON "public"."inscripcions" USING "btree" ("status");



CREATE INDEX "menjador_menus_period_idx" ON "public"."menjador_menus" USING "btree" ("year" DESC NULLS LAST, "month" DESC NULLS LAST);



CREATE INDEX "payments_inscripcion_id_idx" ON "public"."payments" USING "btree" ("inscripcion_id");



CREATE INDEX "payments_parent_email_idx" ON "public"."payments" USING "btree" ("lower"("parent_email"));



CREATE OR REPLACE TRIGGER "events_fill_end_date_trg" BEFORE INSERT OR UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."events_fill_end_date"();



CREATE OR REPLACE TRIGGER "log_events_changes" AFTER INSERT OR DELETE OR UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."log_audit_change"();



CREATE OR REPLACE TRIGGER "log_news_changes" AFTER INSERT OR DELETE OR UPDATE ON "public"."news" FOR EACH ROW EXECUTE FUNCTION "public"."log_audit_change"();



CREATE OR REPLACE TRIGGER "log_projects_changes" AFTER INSERT OR DELETE OR UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."log_audit_change"();



CREATE OR REPLACE TRIGGER "on_shop_order_insert" AFTER INSERT ON "public"."shop_orders" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_shop_order"();



CREATE OR REPLACE TRIGGER "send-inscription-email-webhook" AFTER INSERT ON "public"."inscripcions" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://zaxbtnjkidqwzqsehvld.supabase.co/functions/v1/send-inscription-email', 'POST', '{"Content-type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}', '{}', '5000');



CREATE OR REPLACE TRIGGER "tr_restore_stock_on_cancel" AFTER UPDATE OF "payment_status" ON "public"."shop_orders" FOR EACH ROW EXECUTE FUNCTION "public"."handle_shop_order_inventory_on_status_change"();



CREATE OR REPLACE TRIGGER "tr_sync_stock" AFTER INSERT OR DELETE OR UPDATE ON "public"."shop_order_items" FOR EACH ROW EXECUTE FUNCTION "public"."sync_shop_variant_stock"();



CREATE OR REPLACE TRIGGER "tr_update_order_total" AFTER INSERT OR DELETE OR UPDATE ON "public"."shop_order_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_shop_order_total"();



CREATE OR REPLACE TRIGGER "trg_acollida_inscripcio_defaults" BEFORE INSERT OR UPDATE ON "public"."acollida_inscripcions" FOR EACH ROW EXECUTE FUNCTION "public"."acollida_inscripcio_defaults"();



CREATE OR REPLACE TRIGGER "trg_acollida_rate_limit" BEFORE INSERT ON "public"."acollida_inscripcions" FOR EACH ROW EXECUTE FUNCTION "public"."check_acollida_rate_limit"();



CREATE OR REPLACE TRIGGER "trg_audit_acollida_rates" AFTER INSERT OR DELETE OR UPDATE ON "public"."acollida_rates" FOR EACH ROW EXECUTE FUNCTION "public"."handle_audit_log"();



CREATE OR REPLACE TRIGGER "trg_audit_activities" AFTER INSERT OR DELETE OR UPDATE ON "public"."activities" FOR EACH ROW EXECUTE FUNCTION "public"."handle_audit_log"();



CREATE OR REPLACE TRIGGER "trg_audit_admin_tasks" AFTER INSERT OR DELETE OR UPDATE ON "public"."admin_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."handle_audit_log"();



CREATE OR REPLACE TRIGGER "trg_audit_board_members" AFTER INSERT OR DELETE OR UPDATE ON "public"."board_members" FOR EACH ROW EXECUTE FUNCTION "public"."handle_audit_log"();



CREATE OR REPLACE TRIGGER "trg_audit_documents" AFTER INSERT OR DELETE OR UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION "public"."handle_audit_log"();



CREATE OR REPLACE TRIGGER "trg_audit_events" AFTER INSERT OR DELETE OR UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."handle_audit_log"();



CREATE OR REPLACE TRIGGER "trg_audit_faqs" AFTER INSERT OR DELETE OR UPDATE ON "public"."faqs" FOR EACH ROW EXECUTE FUNCTION "public"."handle_audit_log"();



CREATE OR REPLACE TRIGGER "trg_audit_finance_transactions" AFTER INSERT OR DELETE OR UPDATE ON "public"."finance_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_audit_log"();



CREATE OR REPLACE TRIGGER "trg_audit_forms" AFTER INSERT OR DELETE OR UPDATE ON "public"."forms" FOR EACH ROW EXECUTE FUNCTION "public"."handle_audit_log"();



CREATE OR REPLACE TRIGGER "trg_audit_inscripcions" AFTER INSERT OR DELETE OR UPDATE ON "public"."inscripcions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_audit_log"();



CREATE OR REPLACE TRIGGER "trg_audit_menjador_menus" AFTER INSERT OR DELETE OR UPDATE ON "public"."menjador_menus" FOR EACH ROW EXECUTE FUNCTION "public"."handle_audit_log"();



CREATE OR REPLACE TRIGGER "trg_audit_menjador_rates" AFTER INSERT OR DELETE OR UPDATE ON "public"."menjador_rates" FOR EACH ROW EXECUTE FUNCTION "public"."handle_audit_log"();



CREATE OR REPLACE TRIGGER "trg_audit_news" AFTER INSERT OR DELETE OR UPDATE ON "public"."news" FOR EACH ROW EXECUTE FUNCTION "public"."handle_audit_log"();



CREATE OR REPLACE TRIGGER "trg_audit_notifications" AFTER INSERT OR DELETE OR UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."handle_audit_log"();



CREATE OR REPLACE TRIGGER "trg_audit_payer_aliases" AFTER INSERT OR DELETE OR UPDATE ON "public"."payer_aliases" FOR EACH ROW EXECUTE FUNCTION "public"."handle_audit_log"();



CREATE OR REPLACE TRIGGER "trg_audit_payments" AFTER INSERT OR DELETE OR UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."handle_audit_log"();



CREATE OR REPLACE TRIGGER "trg_audit_profiles" AFTER INSERT OR DELETE OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_audit_log"();



CREATE OR REPLACE TRIGGER "trg_audit_projects" AFTER INSERT OR DELETE OR UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."handle_audit_log"();



CREATE OR REPLACE TRIGGER "trg_audit_shop_orders" AFTER INSERT OR DELETE OR UPDATE ON "public"."shop_orders" FOR EACH ROW EXECUTE FUNCTION "public"."handle_audit_log"();



CREATE OR REPLACE TRIGGER "trg_audit_shop_products" AFTER INSERT OR DELETE OR UPDATE ON "public"."shop_products" FOR EACH ROW EXECUTE FUNCTION "public"."handle_audit_log"();



CREATE OR REPLACE TRIGGER "trg_audit_shop_variants" AFTER INSERT OR DELETE OR UPDATE ON "public"."shop_variants" FOR EACH ROW EXECUTE FUNCTION "public"."handle_audit_log"();



CREATE OR REPLACE TRIGGER "trg_audit_short_urls" AFTER INSERT OR DELETE OR UPDATE ON "public"."short_urls" FOR EACH ROW EXECUTE FUNCTION "public"."handle_audit_log"();



CREATE OR REPLACE TRIGGER "trg_audit_site_announcements" AFTER INSERT OR DELETE OR UPDATE ON "public"."site_announcements" FOR EACH ROW EXECUTE FUNCTION "public"."handle_audit_log"();



CREATE OR REPLACE TRIGGER "trg_audit_site_config" AFTER INSERT OR DELETE OR UPDATE ON "public"."site_config" FOR EACH ROW EXECUTE FUNCTION "public"."handle_audit_log"();



CREATE OR REPLACE TRIGGER "trg_board_members_updated_at" BEFORE UPDATE ON "public"."board_members" FOR EACH ROW EXECUTE FUNCTION "public"."set_board_members_updated_at"();



CREATE OR REPLACE TRIGGER "trg_contact_message_rate_limit" BEFORE INSERT ON "public"."contact_messages" FOR EACH ROW EXECUTE FUNCTION "public"."check_contact_message_rate_limit"();



CREATE OR REPLACE TRIGGER "trg_finance_tx_academic_year" BEFORE INSERT ON "public"."finance_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."set_finance_tx_academic_year"();



CREATE OR REPLACE TRIGGER "trg_form_submission_rate_limit" BEFORE INSERT ON "public"."form_submissions" FOR EACH ROW EXECUTE FUNCTION "public"."check_form_submission_rate_limit"();



CREATE OR REPLACE TRIGGER "trg_forms_set_updated_at" BEFORE UPDATE ON "public"."forms" FOR EACH ROW EXECUTE FUNCTION "public"."set_forms_updated_at"();



CREATE OR REPLACE TRIGGER "trg_inscripcio_academic_year" BEFORE INSERT ON "public"."inscripcions" FOR EACH ROW EXECUTE FUNCTION "public"."set_inscripcio_academic_year"();



CREATE OR REPLACE TRIGGER "trg_inscripcio_duplicada" BEFORE INSERT ON "public"."inscripcions" FOR EACH ROW EXECUTE FUNCTION "public"."check_inscripcio_duplicada"();



CREATE OR REPLACE TRIGGER "trg_inscripcio_rate_limit" BEFORE INSERT ON "public"."inscripcions" FOR EACH ROW EXECUTE FUNCTION "public"."check_inscripcio_rate_limit"();



CREATE OR REPLACE TRIGGER "trg_payer_aliases_updated_at" BEFORE UPDATE ON "public"."payer_aliases" FOR EACH ROW EXECUTE FUNCTION "public"."set_payer_aliases_updated_at"();



CREATE OR REPLACE TRIGGER "trg_payment_academic_year" BEFORE INSERT OR UPDATE OF "payment_month", "payment_year" ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."set_payment_academic_year"();



CREATE OR REPLACE TRIGGER "trg_protect_profile_role" BEFORE INSERT OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."protect_profile_role"();



CREATE OR REPLACE TRIGGER "trg_shop_order_academic_year" BEFORE INSERT ON "public"."shop_orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_shop_order_academic_year"();



CREATE OR REPLACE TRIGGER "update_admin_tasks_updated_at" BEFORE UPDATE ON "public"."admin_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_events_updated_at" BEFORE UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_faqs_updated_at" BEFORE UPDATE ON "public"."faqs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_inscripcions_updated_at" BEFORE UPDATE ON "public"."inscripcions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_monthly_payment_generation_updated_at" BEFORE UPDATE ON "public"."monthly_payment_generation" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_news_updated_at" BEFORE UPDATE ON "public"."news" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_payments_updated_at" BEFORE UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_projects_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_site_announcements_updated_at" BEFORE UPDATE ON "public"."site_announcements" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



ALTER TABLE ONLY "public"."acollida_inscripcions"
    ADD CONSTRAINT "acollida_inscripcions_rate_id_fkey" FOREIGN KEY ("rate_id") REFERENCES "public"."acollida_rates"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."admin_tasks"
    ADD CONSTRAINT "admin_tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."admin_tasks"
    ADD CONSTRAINT "admin_tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."form_submissions"
    ADD CONSTRAINT "form_submissions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."form_submissions"
    ADD CONSTRAINT "form_submissions_submitted_by_user_id_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."forms"
    ADD CONSTRAINT "forms_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."news"
    ADD CONSTRAINT "news_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."payment_history"
    ADD CONSTRAINT "payment_history_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_inscripcion_id_fkey" FOREIGN KEY ("inscripcion_id") REFERENCES "public"."inscripcions"("id") ON DELETE RESTRICT NOT VALID;



COMMENT ON CONSTRAINT "payments_inscripcion_id_fkey" ON "public"."payments" IS 'RESTRICT: una inscripción con pagos no se borra, se da de baja. NOT VALID mientras queden huérfanos de borrados anteriores a 2026-09-01.';



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shop_order_items"
    ADD CONSTRAINT "shop_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."shop_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shop_order_items"
    ADD CONSTRAINT "shop_order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."shop_variants"("id");



ALTER TABLE ONLY "public"."shop_orders"
    ADD CONSTRAINT "shop_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."shop_variants"
    ADD CONSTRAINT "shop_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."shop_products"("id") ON DELETE CASCADE;



CREATE POLICY "Acollida Rates Policy" ON "public"."acollida_rates" USING (("public"."is_admin"() OR true)) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admin manage finance" ON "public"."finance_transactions" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admin manage payments" ON "public"."payments" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can delete acollida" ON "public"."acollida_inscripcions" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can delete activities" ON "public"."activities" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can delete admin tasks" ON "public"."admin_tasks" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can delete board members" ON "public"."board_members" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can delete documents" ON "public"."documents" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can delete finance_transactions" ON "public"."finance_transactions" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can delete inscriptions" ON "public"."inscripcions" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can delete menjador_menus" ON "public"."menjador_menus" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can delete menjador_rates" ON "public"."menjador_rates" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can insert activities" ON "public"."activities" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can insert admin tasks" ON "public"."admin_tasks" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can insert board members" ON "public"."board_members" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can insert documents" ON "public"."documents" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can insert finance_transactions" ON "public"."finance_transactions" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can insert menjador_menus" ON "public"."menjador_menus" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can insert menjador_rates" ON "public"."menjador_rates" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage all news" ON "public"."news" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'coordinator'::"text"]))))));



CREATE POLICY "Admins can manage all projects" ON "public"."projects" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'coordinator'::"text"]))))));



CREATE POLICY "Admins can manage announcements" ON "public"."site_announcements" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage contact messages" ON "public"."contact_messages" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage events" ON "public"."events" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'coordinator'::"text"]))))));



CREATE POLICY "Admins can manage faqs" ON "public"."faqs" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'coordinator'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'coordinator'::"text"]))))));



CREATE POLICY "Admins can manage monthly_payment_generation" ON "public"."monthly_payment_generation" TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage order items" ON "public"."shop_order_items" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'coordinator'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'coordinator'::"text"]))))));



CREATE POLICY "Admins can manage payment_history" ON "public"."payment_history" TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage shop orders" ON "public"."shop_orders" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'coordinator'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'coordinator'::"text"]))))));



CREATE POLICY "Admins can manage short urls" ON "public"."short_urls" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can read admin tasks" ON "public"."admin_tasks" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can read admin_users" ON "public"."admin_users" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can read finance_transactions" ON "public"."finance_transactions" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can select acollida" ON "public"."acollida_inscripcions" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can select inscription history" ON "public"."inscripcions_history" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can select inscriptions" ON "public"."inscripcions" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can update acollida" ON "public"."acollida_inscripcions" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update activities" ON "public"."activities" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update admin tasks" ON "public"."admin_tasks" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update board members" ON "public"."board_members" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update documents" ON "public"."documents" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update finance_transactions" ON "public"."finance_transactions" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update inscriptions" ON "public"."inscripcions" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update menjador_menus" ON "public"."menjador_menus" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update menjador_rates" ON "public"."menjador_rates" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins delete bank imports" ON "public"."bank_imports" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins delete forms" ON "public"."forms" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins delete payer aliases" ON "public"."payer_aliases" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins delete submissions" ON "public"."form_submissions" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins have full access to events" ON "public"."events" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins have full access to news" ON "public"."news" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins have full access to projects" ON "public"."projects" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins insert bank imports" ON "public"."bank_imports" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins insert forms" ON "public"."forms" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins insert payer aliases" ON "public"."payer_aliases" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins read all forms" ON "public"."forms" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins read audit logs" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "Admins read bank imports" ON "public"."bank_imports" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins read payer aliases" ON "public"."payer_aliases" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins read submissions" ON "public"."form_submissions" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins update bank imports" ON "public"."bank_imports" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins update forms" ON "public"."forms" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins update payer aliases" ON "public"."payer_aliases" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins update submissions" ON "public"."form_submissions" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Allow anonymous insert history" ON "public"."inscripcions_history" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Anyone can insert contact messages" ON "public"."contact_messages" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can read active faqs" ON "public"."faqs" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can read active projects" ON "public"."projects" FOR SELECT USING (("status" = 'active'::"text"));



CREATE POLICY "Anyone can read announcements" ON "public"."site_announcements" FOR SELECT USING (true);



CREATE POLICY "Anyone can read events" ON "public"."events" FOR SELECT USING (true);



CREATE POLICY "Anyone can read published news" ON "public"."news" FOR SELECT USING (("published" = true));



CREATE POLICY "Anyone submits to active open forms" ON "public"."form_submissions" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."forms" "f"
  WHERE (("f"."id" = "form_submissions"."form_id") AND ("f"."is_active" = true) AND (("f"."closes_at" IS NULL) OR ("f"."closes_at" > "now"()))))));



CREATE POLICY "Notifications Access Policy" ON "public"."notifications" USING (("public"."is_admin"() OR ("active" = true))) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Public can insert inscriptions" ON "public"."inscripcions" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Public can insert items" ON "public"."shop_order_items" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Public can insert orders" ON "public"."shop_orders" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Public can read active menjador_menus" ON "public"."menjador_menus" FOR SELECT USING (("is_active" OR "public"."is_admin"()));



CREATE POLICY "Public can read menjador_rates" ON "public"."menjador_rates" FOR SELECT USING (true);



CREATE POLICY "Public can request acollida" ON "public"."acollida_inscripcions" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Public documents are viewable by everyone" ON "public"."documents" FOR SELECT USING (true);



CREATE POLICY "Public read access" ON "public"."activities" FOR SELECT USING (true);



CREATE POLICY "Public reads active forms" ON "public"."forms" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Read board members" ON "public"."board_members" FOR SELECT USING ((("is_visible" = true) OR "public"."is_admin"()));



CREATE POLICY "Shop Products Policy" ON "public"."shop_products" USING (("public"."is_admin"() OR true)) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Shop Variants Policy" ON "public"."shop_variants" USING (("public"."is_admin"() OR true)) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Site Config Policy" ON "public"."site_config" USING (("public"."is_admin"() OR true)) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Users can see own orders" ON "public"."shop_orders" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view their own order items" ON "public"."shop_order_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."shop_orders"
  WHERE (("shop_orders"."id" = "shop_order_items"."order_id") AND ("shop_orders"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."acollida_inscripcions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."acollida_rates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."alert_state" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "alert_state_select_admin" ON "public"."alert_state" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



ALTER TABLE "public"."app_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bank_imports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."board_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_errors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_errors_delete_admin" ON "public"."client_errors" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "client_errors_insert_publico" ON "public"."client_errors" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "client_errors_select_admin" ON "public"."client_errors" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "client_errors_update_admin" ON "public"."client_errors" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."contact_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."faqs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."finance_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."form_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."forms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inscripcions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inscripcions_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."menjador_menus" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."menjador_rates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."monthly_payment_generation" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."news" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payer_aliases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payments_anon_all" ON "public"."payments" TO "anon" USING (false) WITH CHECK (false);



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "profiles_select_own_or_admin" ON "public"."profiles" FOR SELECT TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "id") OR "public"."is_admin"()));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shop_order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shop_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shop_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shop_variants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."short_urls" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."site_announcements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."site_config" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

















































































































































































GRANT ALL ON FUNCTION "public"."academic_year_for"("p_month" integer, "p_year" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."academic_year_for"("p_month" integer, "p_year" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."academic_year_for"("p_month" integer, "p_year" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."acollida_inscripcio_defaults"() TO "anon";
GRANT ALL ON FUNCTION "public"."acollida_inscripcio_defaults"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."acollida_inscripcio_defaults"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."acollida_price_for"("p_rate_id" "uuid", "p_is_member" boolean, "p_occasional" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."acollida_price_for"("p_rate_id" "uuid", "p_is_member" boolean, "p_occasional" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."activity_monthly_price"("p_activity" "text", "p_is_member" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."activity_monthly_price"("p_activity" "text", "p_is_member" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."activity_monthly_price"("p_activity" "text", "p_is_member" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."activity_monthly_price"("p_activity" "text", "p_is_member" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_delete_app_setting"("p_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_delete_app_setting"("p_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_delete_app_setting"("p_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_get_app_setting_meta"("p_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_get_app_setting_meta"("p_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_get_app_setting_meta"("p_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_set_app_setting"("p_key" "text", "p_value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_set_app_setting"("p_key" "text", "p_value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_set_app_setting"("p_key" "text", "p_value" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."afa_annual_fee"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."afa_annual_fee"() TO "anon";
GRANT ALL ON FUNCTION "public"."afa_annual_fee"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."afa_annual_fee"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."book_price_for"("p_course" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."book_price_for"("p_course" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."book_price_for"("p_course" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."book_price_for"("p_course" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_acollida_rate_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_acollida_rate_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_acollida_rate_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_contact_message_rate_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_contact_message_rate_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_contact_message_rate_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_form_submission_rate_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_form_submission_rate_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_form_submission_rate_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_inscripcio_duplicada"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_inscripcio_duplicada"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_inscripcio_duplicada"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_inscripcio_rate_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_inscripcio_rate_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_inscripcio_rate_limit"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."client_errors_resumen"("p_dias" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."client_errors_resumen"("p_dias" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."client_errors_resumen"("p_dias" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_inscripcions_backup"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_inscripcions_backup"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_shop_complex_order_v1"("p_customer_name" "text", "p_customer_email" "text", "p_customer_phone" "text", "p_total_amount" numeric, "p_items" "jsonb", "p_user_id" "uuid", "p_language" "text", "p_is_member" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."create_shop_complex_order_v1"("p_customer_name" "text", "p_customer_email" "text", "p_customer_phone" "text", "p_total_amount" numeric, "p_items" "jsonb", "p_user_id" "uuid", "p_language" "text", "p_is_member" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_shop_complex_order_v1"("p_customer_name" "text", "p_customer_email" "text", "p_customer_phone" "text", "p_total_amount" numeric, "p_items" "jsonb", "p_user_id" "uuid", "p_language" "text", "p_is_member" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_academic_year"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_academic_year"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_academic_year"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_academic_year"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."dar_de_alta_inscripcion"("p_inscripcion_id" "uuid", "p_motivo" "text", "p_changed_by" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dar_de_alta_inscripcion"("p_inscripcion_id" "uuid", "p_motivo" "text", "p_changed_by" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."dar_de_alta_inscripcion"("p_inscripcion_id" "uuid", "p_motivo" "text", "p_changed_by" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."dar_de_alta_inscripcion"("p_inscripcion_id" "uuid", "p_motivo" "text", "p_changed_by" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."dar_de_baja_inscripcion"("p_inscripcion_id" "uuid", "p_motivo" "text", "p_changed_by" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dar_de_baja_inscripcion"("p_inscripcion_id" "uuid", "p_motivo" "text", "p_changed_by" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."dar_de_baja_inscripcion"("p_inscripcion_id" "uuid", "p_motivo" "text", "p_changed_by" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."dar_de_baja_inscripcion"("p_inscripcion_id" "uuid", "p_motivo" "text", "p_changed_by" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."events_fill_end_date"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."events_fill_end_date"() TO "anon";
GRANT ALL ON FUNCTION "public"."events_fill_end_date"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."events_fill_end_date"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_create_payments_for_inscription"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_create_payments_for_inscription"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_create_payments_for_inscription"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_create_payments_for_inscription"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."generate_acollida_payments"("p_month" integer, "p_year" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_acollida_payments"("p_month" integer, "p_year" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_acollida_payments"("p_month" integer, "p_year" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_book_payments"("p_year" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_book_payments"("p_year" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_book_payments"("p_year" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."generate_monthly_payments"("p_month" integer, "p_year" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_monthly_payments"("p_month" integer, "p_year" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_monthly_payments"("p_month" integer, "p_year" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_monthly_payments"("p_month" integer, "p_year" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."generate_monthly_payments_only_active"("p_month" integer, "p_year" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_monthly_payments_only_active"("p_month" integer, "p_year" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_monthly_payments_only_active"("p_month" integer, "p_year" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_monthly_payments_only_active"("p_month" integer, "p_year" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_slug"("t" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_slug"("t" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_slug"("t" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_soci_payments"("p_year" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_soci_payments"("p_year" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_soci_payments"("p_year" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_db_size_bytes"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_db_size_bytes"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_db_size_bytes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_db_size_bytes"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_fee_rules"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_fee_rules"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_fee_rules"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_fee_rules"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_last_activity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_last_activity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_storage_size_bytes"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_storage_size_bytes"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_storage_size_bytes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_storage_size_bytes"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_audit_log"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_audit_log"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_audit_log"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_audit_log"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_contact_message"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_contact_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_contact_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_contact_message"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_shop_order"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_shop_order"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_shop_order"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_shop_order"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_shop_order_inventory_on_status_change"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_shop_order_inventory_on_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_shop_order_inventory_on_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_shop_order_inventory_on_status_change"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."hash_password"("password" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."hash_password"("password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."hash_password"("password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hash_password"("password" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_clicks"("p_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_clicks"("p_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_clicks"("p_slug" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."inscripcio_signatura"("p_students" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."inscripcio_signatura"("p_students" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inscripcio_signatura"("p_students" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_activity_excluded"("p_activity" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_activity_excluded"("p_activity" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_activity_excluded"("p_activity" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_activity_excluded"("p_activity" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_allowed_setting_key"("p_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_allowed_setting_key"("p_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_allowed_setting_key"("p_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_audit_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_audit_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_audit_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mask_secret"("value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."mask_secret"("value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mask_secret"("value" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_triggers_on_inscripcions"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_triggers_on_inscripcions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_triggers_on_inscripcions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_profile_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_profile_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_profile_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."record_payment_received"("p_student_name" "text", "p_student_surname" "text", "p_payment_date" "date", "p_amount" numeric, "p_bank_reference" "text", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_payment_received"("p_student_name" "text", "p_student_surname" "text", "p_payment_date" "date", "p_amount" numeric, "p_bank_reference" "text", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_payment_received"("p_student_name" "text", "p_student_surname" "text", "p_payment_date" "date", "p_amount" numeric, "p_bank_reference" "text", "p_notes" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."remove_baja_payments_for_month"("p_month" integer, "p_year" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."remove_baja_payments_for_month"("p_month" integer, "p_year" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."remove_baja_payments_for_month"("p_month" integer, "p_year" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_baja_payments_for_month"("p_month" integer, "p_year" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."rollover_acollida_payments"("p_from_month" integer, "p_from_year" integer, "p_to_month" integer, "p_to_year" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."rollover_acollida_payments"("p_from_month" integer, "p_from_year" integer, "p_to_month" integer, "p_to_year" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rollover_acollida_payments"("p_from_month" integer, "p_from_year" integer, "p_to_month" integer, "p_to_year" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_board_members_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_board_members_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_board_members_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_finance_tx_academic_year"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_finance_tx_academic_year"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_finance_tx_academic_year"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_finance_tx_academic_year"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_forms_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_forms_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_forms_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_inscripcio_academic_year"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_inscripcio_academic_year"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_inscripcio_academic_year"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_inscripcio_academic_year"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_payer_aliases_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_payer_aliases_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_payer_aliases_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_payment_academic_year"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_payment_academic_year"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_payment_academic_year"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_payment_academic_year"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_shop_order_academic_year"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_shop_order_academic_year"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_shop_order_academic_year"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_shop_order_academic_year"() TO "service_role";



GRANT ALL ON FUNCTION "public"."soft_delete_form_submission"("submission_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."soft_delete_form_submission"("submission_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."soft_delete_form_submission"("submission_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."student_monthly_fee"("p_activities" "text"[], "p_is_member" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."student_monthly_fee"("p_activities" "text"[], "p_is_member" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."student_monthly_fee"("p_activities" "text"[], "p_is_member" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."student_monthly_fee"("p_activities" "text"[], "p_is_member" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_shop_variant_stock"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_shop_variant_stock"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_shop_variant_stock"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_shop_variant_stock"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_shop_order_total"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_shop_order_total"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_shop_order_total"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";
























GRANT ALL ON TABLE "public"."acollida_inscripcions" TO "anon";
GRANT ALL ON TABLE "public"."acollida_inscripcions" TO "authenticated";
GRANT ALL ON TABLE "public"."acollida_inscripcions" TO "service_role";



GRANT ALL ON TABLE "public"."acollida_rates" TO "anon";
GRANT ALL ON TABLE "public"."acollida_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."acollida_rates" TO "service_role";



GRANT ALL ON TABLE "public"."activities" TO "anon";
GRANT ALL ON TABLE "public"."activities" TO "authenticated";
GRANT ALL ON TABLE "public"."activities" TO "service_role";



GRANT ALL ON SEQUENCE "public"."activities_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."activities_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."activities_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."admin_tasks" TO "anon";
GRANT ALL ON TABLE "public"."admin_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."admin_users" TO "anon";
GRANT ALL ON TABLE "public"."admin_users" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_users" TO "service_role";



GRANT ALL ON TABLE "public"."alert_state" TO "authenticated";
GRANT ALL ON TABLE "public"."alert_state" TO "service_role";



GRANT ALL ON TABLE "public"."app_settings" TO "anon";
GRANT ALL ON TABLE "public"."app_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."app_settings" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";
GRANT ALL ON TABLE "public"."audit_logs" TO "anon";



GRANT ALL ON TABLE "public"."bank_imports" TO "anon";
GRANT ALL ON TABLE "public"."bank_imports" TO "authenticated";
GRANT ALL ON TABLE "public"."bank_imports" TO "service_role";



GRANT ALL ON TABLE "public"."board_members" TO "anon";
GRANT ALL ON TABLE "public"."board_members" TO "authenticated";
GRANT ALL ON TABLE "public"."board_members" TO "service_role";



GRANT ALL ON TABLE "public"."client_errors" TO "anon";
GRANT ALL ON TABLE "public"."client_errors" TO "authenticated";
GRANT ALL ON TABLE "public"."client_errors" TO "service_role";



GRANT ALL ON TABLE "public"."contact_messages" TO "anon";
GRANT ALL ON TABLE "public"."contact_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_messages" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."faqs" TO "anon";
GRANT ALL ON TABLE "public"."faqs" TO "authenticated";
GRANT ALL ON TABLE "public"."faqs" TO "service_role";



GRANT ALL ON TABLE "public"."finance_transactions" TO "anon";
GRANT ALL ON TABLE "public"."finance_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."finance_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."form_submissions" TO "anon";
GRANT ALL ON TABLE "public"."form_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."form_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."forms" TO "anon";
GRANT ALL ON TABLE "public"."forms" TO "authenticated";
GRANT ALL ON TABLE "public"."forms" TO "service_role";



GRANT ALL ON TABLE "public"."inscripcions" TO "anon";
GRANT ALL ON TABLE "public"."inscripcions" TO "authenticated";
GRANT ALL ON TABLE "public"."inscripcions" TO "service_role";



GRANT ALL ON TABLE "public"."inscripcions_history" TO "anon";
GRANT ALL ON TABLE "public"."inscripcions_history" TO "authenticated";
GRANT ALL ON TABLE "public"."inscripcions_history" TO "service_role";



GRANT ALL ON TABLE "public"."menjador_menus" TO "anon";
GRANT ALL ON TABLE "public"."menjador_menus" TO "authenticated";
GRANT ALL ON TABLE "public"."menjador_menus" TO "service_role";



GRANT ALL ON TABLE "public"."menjador_rates" TO "anon";
GRANT ALL ON TABLE "public"."menjador_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."menjador_rates" TO "service_role";



GRANT ALL ON TABLE "public"."monthly_payment_generation" TO "anon";
GRANT ALL ON TABLE "public"."monthly_payment_generation" TO "authenticated";
GRANT ALL ON TABLE "public"."monthly_payment_generation" TO "service_role";



GRANT ALL ON TABLE "public"."news" TO "anon";
GRANT ALL ON TABLE "public"."news" TO "authenticated";
GRANT ALL ON TABLE "public"."news" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."payer_aliases" TO "anon";
GRANT ALL ON TABLE "public"."payer_aliases" TO "authenticated";
GRANT ALL ON TABLE "public"."payer_aliases" TO "service_role";



GRANT ALL ON TABLE "public"."payment_history" TO "anon";
GRANT ALL ON TABLE "public"."payment_history" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_history" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."shop_order_items" TO "anon";
GRANT ALL ON TABLE "public"."shop_order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."shop_order_items" TO "service_role";



GRANT ALL ON TABLE "public"."shop_orders" TO "anon";
GRANT ALL ON TABLE "public"."shop_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."shop_orders" TO "service_role";



GRANT ALL ON TABLE "public"."shop_products" TO "anon";
GRANT ALL ON TABLE "public"."shop_products" TO "authenticated";
GRANT ALL ON TABLE "public"."shop_products" TO "service_role";



GRANT ALL ON TABLE "public"."shop_variants" TO "anon";
GRANT ALL ON TABLE "public"."shop_variants" TO "authenticated";
GRANT ALL ON TABLE "public"."shop_variants" TO "service_role";



GRANT ALL ON TABLE "public"."short_urls" TO "authenticated";
GRANT ALL ON TABLE "public"."short_urls" TO "service_role";
GRANT ALL ON TABLE "public"."short_urls" TO "anon";



GRANT ALL ON TABLE "public"."site_announcements" TO "anon";
GRANT ALL ON TABLE "public"."site_announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."site_announcements" TO "service_role";



GRANT ALL ON TABLE "public"."site_config" TO "anon";
GRANT ALL ON TABLE "public"."site_config" TO "authenticated";
GRANT ALL ON TABLE "public"."site_config" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































