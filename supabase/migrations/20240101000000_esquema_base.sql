-- Esquema base: tablas que ninguna migración creaba.
--
-- Generado con `node scripts/dump-schema.mjs` leyendo el catálogo de
-- producción. Corresponde al estado del esquema el 2026-08-11.
--
-- Va con la fecha más antigua de todas para que un entorno nuevo cree
-- primero estas tablas y las 57 migraciones siguientes se apliquen encima.
-- Todo es idempotente (IF NOT EXISTS / DROP ... IF EXISTS), así que también
-- es inofensivo contra una base que ya las tenga.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Como hace pg_dump: sin esto, una función SQL que referencia una tabla que
-- aún no existe falla al crearse. Solo afecta a esta transacción.
SET check_function_bodies = off;

-- Stub defensivo, ver comentario en scripts/dump-schema.mjs.
CREATE OR REPLACE FUNCTION public.handle_audit_log()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $stub$
BEGIN
  -- Hasta que 20260801140000 cree audit_logs y sustituya esta funcion, no hay
  -- donde escribir: se deja pasar la fila sin auditar en vez de reventar la
  -- migracion que la esta insertando.
  RETURN COALESCE(NEW, OLD);
END;
$stub$;

-- Stub de compatibilidad, ver comentario en scripts/dump-schema.mjs.
CREATE OR REPLACE FUNCTION public.log_audit_change()
RETURNS trigger LANGUAGE plpgsql AS $stub$
BEGIN
  -- Intencionadamente sin efecto: la auditoria de verdad son los trg_audit_*.
  RETURN COALESCE(NEW, OLD);
END;
$stub$;

-- ============================ TABLAS ============================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  updated_at timestamp with time zone,
  full_name text,
  avatar_url text,
  role text DEFAULT 'familia'::text NOT NULL,
  CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'monitor'::text, 'familia'::text]))),
  CONSTRAINT username_length CHECK ((char_length(full_name) >= 3)),
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  username text NOT NULL,
  password_hash text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  last_login timestamp with time zone,
  created_by text DEFAULT 'system'::text,
  CONSTRAINT admin_users_pkey PRIMARY KEY (id),
  CONSTRAINT admin_users_username_key UNIQUE (username)
);

CREATE TABLE IF NOT EXISTS public.site_config (
  key text NOT NULL,
  value jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT site_config_pkey PRIMARY KEY (key)
);

CREATE TABLE IF NOT EXISTS public.inscripcions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  students jsonb NOT NULL,
  parent_name text NOT NULL,
  parent_dni text NOT NULL,
  parent_phone_1 text NOT NULL,
  parent_phone_2 text,
  parent_email_1 text NOT NULL,
  parent_email_2 text,
  afa_member boolean DEFAULT false NOT NULL,
  health_info text,
  image_auth_consent text,
  can_leave_alone boolean DEFAULT false,
  authorized_pickup text,
  conditions_accepted boolean DEFAULT false NOT NULL,
  form_language text DEFAULT 'ca'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'alta'::text NOT NULL,
  baja_reason text,
  baja_at timestamp with time zone,
  academic_year text,
  extra_answers jsonb DEFAULT '{}'::jsonb NOT NULL,
  CONSTRAINT inscripcions_status_check CHECK ((status = ANY (ARRAY['alta'::text, 'baja'::text]))),
  CONSTRAINT inscripcions_students_check CHECK (((jsonb_array_length(students) >= 1) AND (jsonb_array_length(students) <= 3))),
  CONSTRAINT inscripcions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.inscripcions_history (
  id bigint NOT NULL,
  inscripcion_id uuid NOT NULL,
  changed_at timestamp with time zone DEFAULT now() NOT NULL,
  changed_by text,
  action text NOT NULL,
  note text,
  previous_record jsonb NOT NULL,
  new_record jsonb NOT NULL,
  CONSTRAINT inscripcions_history_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  student_name text NOT NULL,
  student_surname text NOT NULL,
  course text NOT NULL,
  activities text[] NOT NULL,
  amount numeric(10,2) NOT NULL,
  due_date date NOT NULL,
  payment_date date,
  status text DEFAULT 'pending'::text NOT NULL,
  bank_reference text,
  notes text,
  parent_name text NOT NULL,
  parent_email text NOT NULL,
  parent_phone text NOT NULL,
  afa_member boolean DEFAULT false NOT NULL,
  payment_month integer NOT NULL,
  payment_year integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  inscripcion_id uuid,
  academic_year text,
  concept text DEFAULT 'extraescolar'::text NOT NULL,
  CONSTRAINT payments_concept_check CHECK ((concept = ANY (ARRAY['extraescolar'::text, 'acollida'::text, 'soci'::text, 'llibres'::text]))),
  CONSTRAINT payments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'overdue'::text]))),
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT uq_payments_student_month UNIQUE (student_name, student_surname, course, concept, payment_month, payment_year)
);

CREATE TABLE IF NOT EXISTS public.payment_history (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  payment_id uuid NOT NULL,
  status_change text NOT NULL,
  changed_by text NOT NULL,
  changed_at timestamp with time zone DEFAULT now(),
  notes text,
  CONSTRAINT payment_history_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.monthly_payment_generation (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  generation_date date NOT NULL,
  month integer NOT NULL,
  year integer NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  generated_at timestamp with time zone DEFAULT now() NOT NULL,
  generated_by text,
  CONSTRAINT monthly_payment_generation_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'generated'::text, 'completed'::text]))),
  CONSTRAINT monthly_payment_generation_pkey PRIMARY KEY (id),
  CONSTRAINT monthly_payment_generation_month_year_key UNIQUE (month, year)
);

CREATE TABLE IF NOT EXISTS public.acollida_rates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  horari text NOT NULL,
  preu_soci_mes text NOT NULL,
  preu_soci_ocasional text,
  preu_no_soci_mes text NOT NULL,
  preu_no_soci_ocasional text,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  horari_ca text,
  horari_es text,
  horari_en text,
  CONSTRAINT acollida_rates_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.finance_transactions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  date date DEFAULT CURRENT_DATE NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL,
  category text NOT NULL,
  description text,
  payment_method text,
  status text DEFAULT 'paid'::text,
  attachment_url text,
  reference_id uuid,
  reference_type text,
  academic_year text,
  CONSTRAINT finance_transactions_type_check CHECK ((type = ANY (ARRAY['income'::text, 'expense'::text]))),
  CONSTRAINT finance_transactions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  message text,
  type text DEFAULT 'info'::text,
  link text,
  start_at timestamp with time zone DEFAULT now() NOT NULL,
  end_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  active boolean DEFAULT true,
  translations jsonb,
  CONSTRAINT notifications_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.shop_products (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  image_url text,
  created_at timestamp with time zone DEFAULT now(),
  name_es text,
  name_ca text,
  name_en text,
  description_es text,
  description_ca text,
  description_en text,
  CONSTRAINT shop_products_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.shop_variants (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  product_id uuid,
  size text NOT NULL,
  price_member numeric(10,2) NOT NULL,
  price_non_member numeric(10,2) NOT NULL,
  stock integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shop_variants_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.shop_orders (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  status text DEFAULT 'pending'::text NOT NULL,
  total_amount numeric(10,2) NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  customer_name text,
  payment_status text DEFAULT 'pending'::text,
  delivery_status text DEFAULT 'pending'::text,
  customer_email text,
  language text DEFAULT 'ca'::text,
  customer_phone text,
  is_member boolean DEFAULT false NOT NULL,
  academic_year text,
  CONSTRAINT shop_orders_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.shop_order_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  order_id uuid,
  variant_id uuid,
  quantity integer NOT NULL,
  price_at_time numeric(10,2) NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shop_order_items_pkey PRIMARY KEY (id)
);

-- ========================= CLAVES AJENAS =========================
DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.payment_history ADD CONSTRAINT payment_history_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.shop_variants ADD CONSTRAINT shop_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES shop_products(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.shop_orders ADD CONSTRAINT shop_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.shop_order_items ADD CONSTRAINT shop_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES shop_orders(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.shop_order_items ADD CONSTRAINT shop_order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES shop_variants(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================ ÍNDICES ============================
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON public.admin_users USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON public.admin_users USING btree (username);
CREATE INDEX IF NOT EXISTS idx_inscripcions_academic_year ON public.inscripcions USING btree (academic_year);
CREATE INDEX IF NOT EXISTS idx_inscripcions_afa_member ON public.inscripcions USING btree (afa_member);
CREATE INDEX IF NOT EXISTS idx_inscripcions_created_at ON public.inscripcions USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inscripcions_parent_email ON public.inscripcions USING btree (parent_email_1);
CREATE INDEX IF NOT EXISTS idx_inscripcions_students_gin ON public.inscripcions USING gin (students);
CREATE INDEX IF NOT EXISTS inscripcions_status_idx ON public.inscripcions USING btree (status);
CREATE INDEX IF NOT EXISTS idx_inscripcions_history_changed_at ON public.inscripcions_history USING btree (changed_at DESC);
CREATE INDEX IF NOT EXISTS inscripcions_history_inscripcion_id_idx ON public.inscripcions_history USING btree (inscripcion_id);
CREATE INDEX IF NOT EXISTS idx_payments_academic_year ON public.payments USING btree (academic_year);
CREATE INDEX IF NOT EXISTS idx_payments_concept ON public.payments USING btree (concept);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON public.payments USING btree (due_date);
CREATE INDEX IF NOT EXISTS idx_payments_month_year ON public.payments USING btree (payment_month, payment_year);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments USING btree (status);
CREATE INDEX IF NOT EXISTS idx_payments_student ON public.payments USING btree (student_name, student_surname);
CREATE INDEX IF NOT EXISTS payments_inscripcion_id_idx ON public.payments USING btree (inscripcion_id);
CREATE INDEX IF NOT EXISTS payments_parent_email_idx ON public.payments USING btree (lower(parent_email));
CREATE INDEX IF NOT EXISTS idx_payment_history_payment_id ON public.payment_history USING btree (payment_id);
CREATE INDEX IF NOT EXISTS idx_finance_tx_academic_year ON public.finance_transactions USING btree (academic_year);
CREATE INDEX IF NOT EXISTS idx_shop_variants_product_id ON public.shop_variants USING btree (product_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_academic_year ON public.shop_orders USING btree (academic_year);
CREATE INDEX IF NOT EXISTS idx_shop_orders_user_id ON public.shop_orders USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_shop_order_items_order_id ON public.shop_order_items USING btree (order_id);
CREATE INDEX IF NOT EXISTS idx_shop_order_items_variant_id ON public.shop_order_items USING btree (variant_id);

-- =========================== FUNCIONES ===========================

CREATE OR REPLACE FUNCTION public.academic_year_for(p_month integer, p_year integer)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  SELECT CASE
    WHEN p_month >= 9
      THEN p_year::text || '-' || lpad(((p_year + 1) % 100)::text, 2, '0')
      ELSE (p_year - 1)::text || '-' || lpad((p_year % 100)::text, 2, '0')
  END;
$function$
;

CREATE OR REPLACE FUNCTION public.activity_monthly_price(p_activity text, p_is_member boolean)
 RETURNS numeric
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.afa_annual_fee()
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  SELECT COALESCE(
    (SELECT (value->>'annual_fee_amount')::numeric FROM public.site_config WHERE key = 'fees'),
    0
  );
$function$
;

CREATE OR REPLACE FUNCTION public.book_price_for(p_course text)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  SELECT COALESCE(
    (SELECT (value->'map'->>p_course)::numeric FROM public.site_config WHERE key = 'book_prices'),
    (SELECT (value->>'default')::numeric      FROM public.site_config WHERE key = 'book_prices'),
    0
  );
$function$
;

CREATE OR REPLACE FUNCTION public.check_contact_message_rate_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.check_form_submission_rate_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.check_inscripcio_rate_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.create_inscripcions_backup()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.create_shop_complex_order_v1(p_customer_name text, p_customer_email text, p_customer_phone text, p_total_amount numeric, p_items jsonb, p_user_id uuid DEFAULT NULL::uuid, p_language text DEFAULT 'ca'::text, p_is_member boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.current_academic_year()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  SELECT COALESCE(
    (SELECT value->>'active_year' FROM public.site_config WHERE key = 'season'),
    '2026-27'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.dar_de_alta_inscripcion(p_inscripcion_id uuid, p_motivo text DEFAULT NULL::text, p_changed_by text DEFAULT 'admin'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.dar_de_baja_inscripcion(p_inscripcion_id uuid, p_motivo text DEFAULT NULL::text, p_changed_by text DEFAULT 'admin'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.events_fill_end_date()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
    IF NEW.end_date IS NULL THEN
        NEW.end_date := NEW.event_date;
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_create_payments_for_inscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.generate_book_payments(p_year integer)
 RETURNS TABLE(success boolean, message text, payments_generated integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
END $function$
;

CREATE OR REPLACE FUNCTION public.generate_monthly_payments(p_month integer, p_year integer)
 RETURNS TABLE(success boolean, message text, payments_generated integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
END $function$
;

CREATE OR REPLACE FUNCTION public.generate_monthly_payments_only_active(p_month integer, p_year integer)
 RETURNS TABLE(success boolean, message text, payments_generated integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
END $function$
;

CREATE OR REPLACE FUNCTION public.generate_slug(t text)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  RETURN lower(regexp_replace(t, '[^a-zA-Z0-9]+', '-', 'g'));
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_soci_payments(p_year integer)
 RETURNS TABLE(success boolean, message text, payments_generated integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
END $function$
;

CREATE OR REPLACE FUNCTION public.get_db_size_bytes()
 RETURNS bigint
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  SELECT pg_database_size(current_database())::bigint;
$function$
;

CREATE OR REPLACE FUNCTION public.get_fee_rules()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  SELECT COALESCE(
    (SELECT value FROM public.site_config WHERE key = 'fee_rules'),
    '{"exclude_activity_ids":[],"exclude_titles":["Anglès"],"multiactivity":{"min_activities":2,"member_price":36,"non_member_price":40}}'::jsonb
  );
$function$
;

CREATE OR REPLACE FUNCTION public.get_storage_size_bytes()
 RETURNS bigint
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  SELECT COALESCE(
    SUM((metadata->>'size')::bigint),
    0
  )::bigint
  FROM storage.objects
  WHERE (metadata->>'size') IS NOT NULL;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_audit_log()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_contact_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_shop_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', 'familia');
  RETURN new;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_shop_order_inventory_on_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.hash_password(password text)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    -- Hash simple usando MD5 (para demo - en producción usar bcrypt)
    RETURN md5(password || 'afa_salt_2024');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_clicks(p_slug text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.short_urls
  SET clicks = clicks + 1
  WHERE slug = p_slug;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_activity_excluded(p_activity text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'coordinator')
  );
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_triggers_on_inscripcions()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.protect_profile_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.record_payment_received(p_student_name text, p_student_surname text, p_payment_date date, p_amount numeric, p_bank_reference text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS TABLE(success boolean, message text)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.remove_baja_payments_for_month(p_month integer, p_year integer)
 RETURNS TABLE(removed integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_removed int := 0;
begin
  with bajas as (
    select id, lower(coalesce(parent_email_1,'')) e1, lower(coalesce(parent_email_2,'')) e2
    from inscripcions
    where coalesce(status,'pendiente') = 'baja'
  ),
  del as (
    delete from payments p
    using bajas b
    where p.payment_month = p_month
      and p.payment_year  = p_year
      and (
            (p.inscripcion_id is not null and p.inscripcion_id = b.id)
         or (p.inscripcion_id is null and lower(coalesce(p.parent_email,'')) in (b.e1, b.e2))
      )
    returning 1
  )
  select count(*) into v_removed from del;

  return query select coalesce(v_removed,0);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rollover_acollida_payments(p_from_month integer, p_from_year integer, p_to_month integer, p_to_year integer)
 RETURNS TABLE(success boolean, message text, payments_generated integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
END $function$
;

CREATE OR REPLACE FUNCTION public.set_board_members_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_finance_tx_academic_year()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  IF NEW.academic_year IS NULL THEN
    NEW.academic_year := public.academic_year_for(
      EXTRACT(MONTH FROM NEW.date)::int,
      EXTRACT(YEAR FROM NEW.date)::int);
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_forms_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_inscripcio_academic_year()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  IF NEW.academic_year IS NULL THEN
    NEW.academic_year := public.current_academic_year();
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_payer_aliases_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_payment_academic_year()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  NEW.academic_year := public.academic_year_for(NEW.payment_month, NEW.payment_year);
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_shop_order_academic_year()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  IF NEW.academic_year IS NULL THEN
    NEW.academic_year := public.current_academic_year();
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.soft_delete_form_submission(submission_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.student_monthly_fee(p_activities text[], p_is_member boolean)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.sync_shop_variant_stock()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.update_shop_order_total()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

-- =========================== TRIGGERS ============================
-- Los trg_audit_* quedan fuera a propósito: los crea
-- 20260801140000_audit_logs_definition.sql, junto con la tabla audit_logs a
-- la que escriben. Adelantarlos aquí haría fallar las migraciones anteriores
-- que insertan en site_config.
--
-- Los webhooks a Edge Functions tampoco: su definición lleva el
-- service_role dentro de la cabecera Authorization, y esto es un fichero
-- versionado. Se gestionan fuera de banda (ver docs/deuda-tecnica.md).
DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION protect_profile_role();
DROP TRIGGER IF EXISTS trg_inscripcio_academic_year ON public.inscripcions;
CREATE TRIGGER trg_inscripcio_academic_year BEFORE INSERT ON public.inscripcions FOR EACH ROW EXECUTE FUNCTION set_inscripcio_academic_year();
DROP TRIGGER IF EXISTS trg_inscripcio_rate_limit ON public.inscripcions;
CREATE TRIGGER trg_inscripcio_rate_limit BEFORE INSERT ON public.inscripcions FOR EACH ROW EXECUTE FUNCTION check_inscripcio_rate_limit();
DROP TRIGGER IF EXISTS update_inscripcions_updated_at ON public.inscripcions;
CREATE TRIGGER update_inscripcions_updated_at BEFORE UPDATE ON public.inscripcions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_payment_academic_year ON public.payments;
CREATE TRIGGER trg_payment_academic_year BEFORE INSERT OR UPDATE OF payment_month, payment_year ON public.payments FOR EACH ROW EXECUTE FUNCTION set_payment_academic_year();
DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_monthly_payment_generation_updated_at ON public.monthly_payment_generation;
CREATE TRIGGER update_monthly_payment_generation_updated_at BEFORE UPDATE ON public.monthly_payment_generation FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_finance_tx_academic_year ON public.finance_transactions;
CREATE TRIGGER trg_finance_tx_academic_year BEFORE INSERT ON public.finance_transactions FOR EACH ROW EXECUTE FUNCTION set_finance_tx_academic_year();
DROP TRIGGER IF EXISTS on_shop_order_insert ON public.shop_orders;
CREATE TRIGGER on_shop_order_insert AFTER INSERT ON public.shop_orders FOR EACH ROW EXECUTE FUNCTION handle_new_shop_order();
DROP TRIGGER IF EXISTS tr_restore_stock_on_cancel ON public.shop_orders;
CREATE TRIGGER tr_restore_stock_on_cancel AFTER UPDATE OF payment_status ON public.shop_orders FOR EACH ROW EXECUTE FUNCTION handle_shop_order_inventory_on_status_change();
DROP TRIGGER IF EXISTS trg_shop_order_academic_year ON public.shop_orders;
CREATE TRIGGER trg_shop_order_academic_year BEFORE INSERT ON public.shop_orders FOR EACH ROW EXECUTE FUNCTION set_shop_order_academic_year();
DROP TRIGGER IF EXISTS tr_sync_stock ON public.shop_order_items;
CREATE TRIGGER tr_sync_stock AFTER INSERT OR DELETE OR UPDATE ON public.shop_order_items FOR EACH ROW EXECUTE FUNCTION sync_shop_variant_stock();
DROP TRIGGER IF EXISTS tr_update_order_total ON public.shop_order_items;
CREATE TRIGGER tr_update_order_total AFTER INSERT OR DELETE OR UPDATE ON public.shop_order_items FOR EACH ROW EXECUTE FUNCTION update_shop_order_total();

-- Omitidos por llevar credenciales en su definición:
--   send-inscription-email-webhook (webhook, lleva credenciales)
--   send-order-email-webhook (webhook, lleva credenciales)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ======================== RLS Y POLÍTICAS ========================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscripcions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscripcions_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_payment_generation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acollida_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK ((( SELECT auth.uid() AS uid) = id));
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles FOR SELECT TO authenticated
  USING (((( SELECT auth.uid() AS uid) = id) OR is_admin()));
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING ((( SELECT auth.uid() AS uid) = id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = id));
DROP POLICY IF EXISTS "Admins can read admin_users" ON public.admin_users;
CREATE POLICY "Admins can read admin_users" ON public.admin_users FOR SELECT TO authenticated
  USING (is_admin());
DROP POLICY IF EXISTS "Site Config Policy" ON public.site_config;
CREATE POLICY "Site Config Policy" ON public.site_config FOR ALL TO public
  USING ((is_admin() OR true))
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admins can delete inscriptions" ON public.inscripcions;
CREATE POLICY "Admins can delete inscriptions" ON public.inscripcions FOR DELETE TO authenticated
  USING (is_admin());
DROP POLICY IF EXISTS "Admins can select inscriptions" ON public.inscripcions;
CREATE POLICY "Admins can select inscriptions" ON public.inscripcions FOR SELECT TO authenticated
  USING (is_admin());
DROP POLICY IF EXISTS "Admins can update inscriptions" ON public.inscripcions;
CREATE POLICY "Admins can update inscriptions" ON public.inscripcions FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Public can insert inscriptions" ON public.inscripcions;
CREATE POLICY "Public can insert inscriptions" ON public.inscripcions FOR INSERT TO anon,authenticated
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anonymous insert history" ON public.inscripcions_history;
CREATE POLICY "Allow anonymous insert history" ON public.inscripcions_history FOR INSERT TO anon
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anonymous select history" ON public.inscripcions_history;
CREATE POLICY "Allow anonymous select history" ON public.inscripcions_history FOR SELECT TO anon
  USING (true);
DROP POLICY IF EXISTS "Admin manage payments" ON public.payments;
CREATE POLICY "Admin manage payments" ON public.payments FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS "payments_anon_all" ON public.payments;
CREATE POLICY "payments_anon_all" ON public.payments FOR ALL TO anon
  USING (false)
  WITH CHECK (false);
DROP POLICY IF EXISTS "Admins can manage payment_history" ON public.payment_history;
CREATE POLICY "Admins can manage payment_history" ON public.payment_history FOR ALL TO authenticated
  USING (is_admin());
DROP POLICY IF EXISTS "Admins can manage monthly_payment_generation" ON public.monthly_payment_generation;
CREATE POLICY "Admins can manage monthly_payment_generation" ON public.monthly_payment_generation FOR ALL TO authenticated
  USING (is_admin());
DROP POLICY IF EXISTS "Acollida Rates Policy" ON public.acollida_rates;
CREATE POLICY "Acollida Rates Policy" ON public.acollida_rates FOR ALL TO public
  USING ((is_admin() OR true))
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admin manage finance" ON public.finance_transactions;
CREATE POLICY "Admin manage finance" ON public.finance_transactions FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admins can delete finance_transactions" ON public.finance_transactions;
CREATE POLICY "Admins can delete finance_transactions" ON public.finance_transactions FOR DELETE TO authenticated
  USING (is_admin());
DROP POLICY IF EXISTS "Admins can insert finance_transactions" ON public.finance_transactions;
CREATE POLICY "Admins can insert finance_transactions" ON public.finance_transactions FOR INSERT TO authenticated
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admins can read finance_transactions" ON public.finance_transactions;
CREATE POLICY "Admins can read finance_transactions" ON public.finance_transactions FOR SELECT TO authenticated
  USING (is_admin());
DROP POLICY IF EXISTS "Admins can update finance_transactions" ON public.finance_transactions;
CREATE POLICY "Admins can update finance_transactions" ON public.finance_transactions FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Notifications Access Policy" ON public.notifications;
CREATE POLICY "Notifications Access Policy" ON public.notifications FOR ALL TO public
  USING ((is_admin() OR (active = true)))
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Shop Products Policy" ON public.shop_products;
CREATE POLICY "Shop Products Policy" ON public.shop_products FOR ALL TO public
  USING ((is_admin() OR true))
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Shop Variants Policy" ON public.shop_variants;
CREATE POLICY "Shop Variants Policy" ON public.shop_variants FOR ALL TO public
  USING ((is_admin() OR true))
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admins can manage shop orders" ON public.shop_orders;
CREATE POLICY "Admins can manage shop orders" ON public.shop_orders FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'coordinator'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'coordinator'::text]))))));
DROP POLICY IF EXISTS "Public can insert orders" ON public.shop_orders;
CREATE POLICY "Public can insert orders" ON public.shop_orders FOR INSERT TO anon,authenticated
  WITH CHECK (true);
DROP POLICY IF EXISTS "Users can see own orders" ON public.shop_orders;
CREATE POLICY "Users can see own orders" ON public.shop_orders FOR SELECT TO public
  USING ((( SELECT auth.uid() AS uid) = user_id));
DROP POLICY IF EXISTS "Admins can manage order items" ON public.shop_order_items;
CREATE POLICY "Admins can manage order items" ON public.shop_order_items FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'coordinator'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'coordinator'::text]))))));
DROP POLICY IF EXISTS "Public can insert items" ON public.shop_order_items;
CREATE POLICY "Public can insert items" ON public.shop_order_items FOR INSERT TO anon,authenticated
  WITH CHECK (true);
DROP POLICY IF EXISTS "Users can view their own order items" ON public.shop_order_items;
CREATE POLICY "Users can view their own order items" ON public.shop_order_items FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM shop_orders
  WHERE ((shop_orders.id = shop_order_items.order_id) AND (shop_orders.user_id = ( SELECT auth.uid() AS uid))))));
