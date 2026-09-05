-- =============================================================
-- Migration: el cost del servei, i si el mes el cobreix
-- Date: 2026-09-06
--
-- El monitoratge del mati costa 500 EUR cada mes, amb ratio fix: el cost no es
-- mou tant si venen deu infants com si en venen dos. Aixo no ho sabia el
-- sistema, aixi que la graella d'ocupacio deia quantes places quedaven lliures
-- pero no que cada placa buida son 2,50 EUR que ningu paga.
--
-- Amb el cost a dins, la pestanya Ocupacio pot respondre l'unica pregunta que
-- de veritat decideix si el servei segueix: aquest mes, el que s'ha confirmat
-- paga el que costa?
--
-- El cost va per sala i es editable, com les places. Si els 500 EUR resulten
-- ser nomes de la franja de 7:30 i no de tot el mati, es canvia des del panell
-- sense tocar codi.
--
-- Idempotent: safe to re-run.
-- =============================================================

ALTER TABLE public.acollida_capacity
  ADD COLUMN IF NOT EXISTS monthly_cost numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.acollida_capacity.monthly_cost IS
  'Cost mensual del monitoratge d''aquesta sala, en euros. És fix: no depèn de quants infants vinguin, i per això una plaça buida és diners que ningú paga.';

UPDATE public.acollida_capacity SET monthly_cost = 500 WHERE capacity_group = 'mati' AND monthly_cost = 0;

-- ---------------------------------------------------------------
-- Ingressos previstos del mes, sala per sala.
--
-- Es fa servir `acollida_month_amount()`, el mateix que genera els rebuts, de
-- manera que la xifra que ensenya el panell es exactament la que es cobrara:
-- una previsio calculada d'una altra manera acabaria dient una cosa diferent
-- del rebut i ningu sabria quina de les dues creure.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.acollida_month_coverage(p_month integer, p_year integer)
RETURNS TABLE(capacity_group text, confirmed integer, revenue numeric, monthly_cost numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT
    c.capacity_group,
    count(i.id)::int AS confirmed,
    coalesce(sum(public.acollida_month_amount(i.id, p_month, p_year)), 0) AS revenue,
    c.monthly_cost
  FROM public.acollida_capacity c
  LEFT JOIN public.acollida_rates r ON r.capacity_group = c.capacity_group
  LEFT JOIN public.acollida_inscripcions i
    ON i.rate_id = r.id
   AND i.status = 'confirmada'
   AND i.academic_year = public.academic_year_for(p_month, p_year)
  GROUP BY c.capacity_group, c.monthly_cost
  ORDER BY c.capacity_group;
$$;

COMMENT ON FUNCTION public.acollida_month_coverage(integer, integer) IS
  'Ingrés previst del mes contra el cost del monitoratge, per sala. Surt de la mateixa funció que genera els rebuts.';

REVOKE EXECUTE ON FUNCTION public.acollida_month_coverage(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acollida_month_coverage(integer, integer) TO authenticated;
