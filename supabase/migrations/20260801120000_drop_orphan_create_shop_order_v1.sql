-- ============================================================
-- Migration: Drop orphan RPC create_shop_order_v1
-- Date: 2026-08-01
-- ============================================================
-- RPC huerfana (0 referencias en todo el repo) pero SECURITY DEFINER y
-- ejecutable por anon. Insertaba en shop_orders/shop_order_items usando
-- p_total_amount y p_price_at_time tal cual llegan del cliente, sin validar
-- precio contra shop_variants, sin comprobar que la variante existe, sin
-- descontar stock y sin el check anti-spoofing de p_user_id.
-- Es decir: pedido a 0 EUR a nombre de cualquier usuario via PostgREST.
-- El checkout real usa create_shop_complex_order_v1 (8 args), que si valida
-- precio contra BD y bloquea el spoofing de user_id.
--
-- Definicion previa (por si hiciera falta restaurarla):
--   create_shop_order_v1(p_customer_name text, p_total_amount numeric,
--     p_variant_id uuid, p_quantity integer, p_price_at_time numeric,
--     p_user_id uuid DEFAULT NULL)
--   -> INSERT shop_orders(user_id, total_amount, customer_name, status='pending')
--   -> INSERT shop_order_items(order_id, variant_id, quantity, price_at_time)
-- ============================================================

DROP FUNCTION IF EXISTS public.create_shop_order_v1(
  text, numeric, uuid, integer, numeric, uuid
);
