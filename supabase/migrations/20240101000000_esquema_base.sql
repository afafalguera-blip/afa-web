-- Esquema base: tablas que ninguna migración creaba.
--
-- Generado con `node scripts/dump-schema.mjs` leyendo el catálogo de
-- producción. Corresponde al estado del esquema el 2026-08-11.
--
-- Va con la fecha más antigua de todas para que un entorno nuevo cree
-- primero estas tablas y las 57 migraciones siguientes se apliquen encima.
-- Todo es idempotente (IF NOT EXISTS / DROP ... IF EXISTS), así que también
-- es inofensivo contra una base que ya las tenga.

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
