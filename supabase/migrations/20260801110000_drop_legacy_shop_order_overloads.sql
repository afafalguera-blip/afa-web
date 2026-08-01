-- ============================================================
-- Migration: Drop legacy overloads of create_shop_complex_order_v1
-- Date: 2026-08-01
-- ============================================================
-- Convivian 4 sobrecargas de la misma RPC. Las tres antiguas NO incluyen el
-- check anti-spoofing `p_user_id != auth.uid()` que se anadio despues, asi que
-- via PostgREST se podia crear un pedido a nombre de otro usuario invocando la
-- firma vieja. El cliente (ShopService.ts:154) solo usa la de 8 argumentos.
-- ============================================================

DROP FUNCTION IF EXISTS public.create_shop_complex_order_v1(
  text, text, numeric, jsonb, uuid
);

DROP FUNCTION IF EXISTS public.create_shop_complex_order_v1(
  text, text, numeric, jsonb, uuid, text
);

DROP FUNCTION IF EXISTS public.create_shop_complex_order_v1(
  text, text, text, numeric, jsonb, uuid, text
);
