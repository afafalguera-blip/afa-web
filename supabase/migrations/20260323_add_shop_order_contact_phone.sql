-- Add optional phone contact to shop orders and update checkout RPC.

ALTER TABLE public.shop_orders
  ADD COLUMN IF NOT EXISTS customer_phone text;

COMMENT ON COLUMN public.shop_orders.customer_phone IS 'Customer phone number used as contact alternative to email';

CREATE OR REPLACE FUNCTION public.create_shop_complex_order_v1(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_total_amount numeric,
  p_items jsonb,
  p_user_id uuid DEFAULT NULL::uuid,
  p_language text DEFAULT 'ca'::text
)
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
  v_is_member boolean := false;
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

  -- Determine Pricing Tier (Based on whether they are logged in)
  IF v_caller_uid IS NOT NULL THEN
    v_is_member := true;
  END IF;

  -- Create the order header
  INSERT INTO shop_orders (
    customer_name,
    customer_email,
    customer_phone,
    total_amount,
    user_id,
    language,
    status
  ) VALUES (
    p_customer_name,
    v_clean_email,
    v_clean_phone,
    0,
    p_user_id,
    v_language,
    'pending'
  ) RETURNING id INTO v_order_id;

  -- Process each item (server-side validation)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO v_variant_record
    FROM shop_variants
    WHERE id = (v_item->>'variant_id')::uuid;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Variant not found: %', (v_item->>'variant_id');
    END IF;

    IF v_variant_record.stock < (v_item->>'quantity')::int THEN
      RAISE EXCEPTION 'Insufficient stock for variant. Trying to buy %, but only % left.', (v_item->>'quantity')::int, v_variant_record.stock;
    END IF;

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
$function$;

-- Compatibility wrapper (existing callers with language but no phone)
CREATE OR REPLACE FUNCTION public.create_shop_complex_order_v1(
  p_customer_name text,
  p_customer_email text,
  p_total_amount numeric,
  p_items jsonb,
  p_user_id uuid DEFAULT NULL::uuid,
  p_language text DEFAULT 'ca'::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.create_shop_complex_order_v1(
    p_customer_name,
    p_customer_email,
    NULL::text,
    p_total_amount,
    p_items,
    p_user_id,
    p_language
  );
END;
$function$;

-- Compatibility wrapper (legacy callers without language and without phone)
CREATE OR REPLACE FUNCTION public.create_shop_complex_order_v1(
  p_customer_name text,
  p_customer_email text,
  p_total_amount numeric,
  p_items jsonb,
  p_user_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.create_shop_complex_order_v1(
    p_customer_name,
    p_customer_email,
    NULL::text,
    p_total_amount,
    p_items,
    p_user_id,
    'ca'
  );
END;
$function$;
