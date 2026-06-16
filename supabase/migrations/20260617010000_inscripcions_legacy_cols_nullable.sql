-- =============================================================
-- Migration: make legacy per-child columns nullable on inscripcions
-- Date: 2026-06-17
-- Health info, image consent and "can leave alone" moved into students[]
-- (per child). The old inscription-level columns are now legacy fallbacks,
-- so they must accept NULL on new inserts (the form no longer sends them).
-- =============================================================

ALTER TABLE public.inscripcions ALTER COLUMN image_auth_consent DROP NOT NULL;
ALTER TABLE public.inscripcions ALTER COLUMN can_leave_alone   DROP NOT NULL;

-- ROLLBACK (only if all rows are non-null again):
-- ALTER TABLE public.inscripcions ALTER COLUMN image_auth_consent SET NOT NULL;
-- ALTER TABLE public.inscripcions ALTER COLUMN can_leave_alone SET NOT NULL;
