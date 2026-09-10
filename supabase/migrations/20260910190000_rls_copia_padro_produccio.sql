-- =============================================================
-- Migration: RLS a la còpia del padró, també a producció
-- Date: 2026-09-10
--
-- URGENT. `children_backup_20260910` és llegible ara mateix per qualsevol amb
-- la clau `anon`, que viatja dins del bundle públic de la web. Comprovat contra
-- producció: una petició anònima a
--
--     GET /rest/v1/children_backup_20260910?select=name&limit=1
--
-- retorna 200 amb el nom d'un infant. La taula és una còpia sencera del cens:
-- noms, cursos, correus i telèfons de menors.
--
-- PER QUÈ NO HO ARREGLA JA LA 20260910160000
-- Aquella migració crea la còpia amb `CREATE TABLE ... AS SELECT`, que no
-- hereta la RLS de l'origen, i amb els GRANT per defecte
-- (20260810000000_grants_por_defecto.sql dona SELECT a `anon` sobre tot public)
-- la còpia neix oberta. Se li va afegir l'`ALTER TABLE ... ENABLE ROW LEVEL
-- SECURITY` quan el CI ho va aturar, però a producció la 160000 ja constava
-- aplicada d'abans, feta a mà: `supabase db push` se la saltarà i l'ALTER no hi
-- arribarà mai. Per això va en una migració pròpia, amb versió nova.
--
-- Sense cap política: aquí no hi ha d'entrar ningú excepte service_role. La
-- còpia és una xarxa de seguretat per si la partició del padró surt malament,
-- no una taula de consulta.
--
-- Es pot esborrar la taula quan el padró del curs 26-27 estigui importat i
-- revisat, i com a molt tard el 2026-12-31; mentre existeixi, que estigui
-- tancada.
--
-- Idempotent: safe to re-run. Fa servir to_regclass perquè no peti als entorns
-- on la còpia ja no hi sigui.
-- =============================================================

DO $$
BEGIN
  IF to_regclass('public.children_backup_20260910') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.children_backup_20260910 ENABLE ROW LEVEL SECURITY';
    RAISE NOTICE 'RLS activada a children_backup_20260910.';
  ELSE
    RAISE NOTICE 'children_backup_20260910 ja no existeix: res a fer.';
  END IF;
END $$;

-- ---------------------------------------------------------------
-- ROLLBACK
-- ---------------------------------------------------------------
-- No. Desfer-ho torna a publicar el cens d'infants.
