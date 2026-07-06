-- =============================================
-- Migration: Bank reconciliation (N43 import)
-- Description: Supports the admin "Importar extracte (Norma 43)" tool that
--   reconciles incoming transfers against pending `payments`.
--
--   Sabadell's N43 export carries the PAYER (parent) name — never the pupil
--   nor an IBAN — so the stable key we can learn is the normalized ordering
--   party name. Two tables:
--     * payer_aliases  — learned map: normalized bank name -> canonical
--                        payments.parent_name. Grows as admins confirm matches,
--                        so a payer that once needed a manual match auto-resolves
--                        next month even if the bank spells it differently.
--     * bank_imports   — one row per processed file (hash-deduped) + a summary,
--                        so the same statement isn't reconciled twice.
--
--   Admin-only, guarded by public.is_admin() (same pattern as board_members).
--   No public read: this is financial data.
-- =============================================

-- ---------------------------------------------------------------
-- 1) payer_aliases — learned "bank ordering name" -> parent_name.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payer_aliases (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alias_normalized  text NOT NULL UNIQUE,   -- normalized payer name from the N43
  parent_name       text NOT NULL,          -- canonical payments.parent_name it maps to
  hits              integer NOT NULL DEFAULT 1,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payer_aliases_alias ON public.payer_aliases(alias_normalized);

CREATE OR REPLACE FUNCTION public.set_payer_aliases_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_payer_aliases_updated_at ON public.payer_aliases;
CREATE TRIGGER trg_payer_aliases_updated_at
  BEFORE UPDATE ON public.payer_aliases
  FOR EACH ROW EXECUTE FUNCTION public.set_payer_aliases_updated_at();

ALTER TABLE public.payer_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read payer aliases" ON public.payer_aliases;
CREATE POLICY "Admins read payer aliases"
  ON public.payer_aliases FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins insert payer aliases" ON public.payer_aliases;
CREATE POLICY "Admins insert payer aliases"
  ON public.payer_aliases FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins update payer aliases" ON public.payer_aliases;
CREATE POLICY "Admins update payer aliases"
  ON public.payer_aliases FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins delete payer aliases" ON public.payer_aliases;
CREATE POLICY "Admins delete payer aliases"
  ON public.payer_aliases FOR DELETE TO authenticated USING (public.is_admin());

-- ---------------------------------------------------------------
-- 2) bank_imports — dedup + audit of each processed statement file.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bank_imports (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_hash         text NOT NULL UNIQUE,   -- SHA-256 of the raw file bytes
  filename          text,
  movements_total   integer NOT NULL DEFAULT 0,
  movements_income  integer NOT NULL DEFAULT 0,
  matched_count     integer NOT NULL DEFAULT 0,
  applied_count     integer NOT NULL DEFAULT 0,
  imported_at       timestamptz NOT NULL DEFAULT now(),
  created_by        uuid DEFAULT auth.uid()
);

CREATE INDEX IF NOT EXISTS idx_bank_imports_hash ON public.bank_imports(file_hash);

ALTER TABLE public.bank_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read bank imports" ON public.bank_imports;
CREATE POLICY "Admins read bank imports"
  ON public.bank_imports FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins insert bank imports" ON public.bank_imports;
CREATE POLICY "Admins insert bank imports"
  ON public.bank_imports FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins update bank imports" ON public.bank_imports;
CREATE POLICY "Admins update bank imports"
  ON public.bank_imports FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins delete bank imports" ON public.bank_imports;
CREATE POLICY "Admins delete bank imports"
  ON public.bank_imports FOR DELETE TO authenticated USING (public.is_admin());

COMMENT ON TABLE public.payer_aliases IS 'Learned map from normalized N43 payer name to canonical payments.parent_name.';
COMMENT ON TABLE public.bank_imports IS 'One row per reconciled N43 statement (hash-deduped) with a match/apply summary.';

-- ---------------------------------------------------------------
-- ROLLBACK
-- ---------------------------------------------------------------
-- DROP TABLE IF EXISTS public.bank_imports;
-- DROP TRIGGER IF EXISTS trg_payer_aliases_updated_at ON public.payer_aliases;
-- DROP FUNCTION IF EXISTS public.set_payer_aliases_updated_at();
-- DROP TABLE IF EXISTS public.payer_aliases;
