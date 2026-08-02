-- =============================================
-- Migration: fee_rules exclusions by activity id (instead of literal title)
-- Description: `site_config.fee_rules -> exclude_titles` coupled the monthly-fee
--   generation to the activity TITLE. Renaming an activity in the Activities
--   editor silently changed which pupils got billed, with no error anywhere.
--
--   This migration introduces `exclude_activity_ids` (stable activities.id) and
--   rewrites is_activity_excluded() to resolve the titles from the catalogue at
--   call time. BOTH keys are supported during the transition:
--     * `exclude_activity_ids` non-empty  -> ids win, titles resolved from `activities`
--     * otherwise                         -> fall back to legacy `exclude_titles`
--   so production keeps working even if the admin panel is not redeployed yet.
--
--   Callers are unchanged: student_monthly_fee() and both
--   generate_monthly_payments* generators call is_activity_excluded(text).
-- =============================================

-- ---------------------------------------------------------------
-- 1. Backfill ids on the existing config from its current titles.
--    Matching mirrors the runtime rule: an activity is excluded when its title
--    is a prefix of the stored inscription value ("Anglès" -> "Anglès (A)").
-- ---------------------------------------------------------------
UPDATE public.site_config sc
SET value = jsonb_set(
      sc.value,
      '{exclude_activity_ids}',
      COALESCE(
        (
          SELECT jsonb_agg(DISTINCT a.id)
          FROM public.activities a
          WHERE a.title IS NOT NULL
            AND a.title <> ''
            AND EXISTS (
              SELECT 1
              FROM jsonb_array_elements_text(COALESCE(sc.value->'exclude_titles', '[]'::jsonb)) AS t(title)
              WHERE t.title <> '' AND a.title ILIKE t.title || '%'
            )
        ),
        '[]'::jsonb
      ),
      true
    ),
    updated_at = now()
WHERE sc.key = 'fee_rules'
  AND NOT (sc.value ? 'exclude_activity_ids');

-- Seed the row if it is missing entirely (fresh databases).
INSERT INTO public.site_config (key, value, updated_at)
SELECT 'fee_rules',
       '{"exclude_activity_ids":[],"exclude_titles":["Anglès"],"multiactivity":{"min_activities":2,"member_price":36,"non_member_price":40}}'::jsonb,
       now()
WHERE NOT EXISTS (SELECT 1 FROM public.site_config WHERE key = 'fee_rules');

-- ---------------------------------------------------------------
-- 2. Keep the hardcoded fallback of get_fee_rules() in sync with the new shape.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_fee_rules()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT COALESCE(
    (SELECT value FROM public.site_config WHERE key = 'fee_rules'),
    '{"exclude_activity_ids":[],"exclude_titles":["Anglès"],"multiactivity":{"min_activities":2,"member_price":36,"non_member_price":40}}'::jsonb
  );
$$;
REVOKE EXECUTE ON FUNCTION public.get_fee_rules() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------
-- 3. Resolve exclusions from ids first, legacy titles second.
--    SECURITY DEFINER because it now reads `activities` on behalf of the
--    generators, which run as definer themselves.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_activity_excluded(p_activity text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
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
$$;
REVOKE EXECUTE ON FUNCTION public.is_activity_excluded(text) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.is_activity_excluded(text) IS
  'True when a stored inscription activity value belongs to an activity excluded from the AFA monthly fee. Reads site_config.fee_rules: exclude_activity_ids (stable ids, preferred) with a fallback to the legacy exclude_titles list.';
