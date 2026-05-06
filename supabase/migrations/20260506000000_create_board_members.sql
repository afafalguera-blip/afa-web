-- ============================================================
-- Migration: AFA board members (junta directiva)
-- Date: 2026-05-06
-- Purpose: Public-facing roster for the "Sobre AFA" page,
--          fully manageable from the admin panel.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.board_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  role          text NOT NULL,
  role_key      text NOT NULL DEFAULT 'vocal',
  bio           text,
  email         text,
  photo_url     text,
  display_order integer NOT NULL DEFAULT 0,
  is_visible    boolean NOT NULL DEFAULT true,
  translations  jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_board_members_order
  ON public.board_members (is_visible, display_order);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_board_members_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_board_members_updated_at ON public.board_members;
CREATE TRIGGER trg_board_members_updated_at
  BEFORE UPDATE ON public.board_members
  FOR EACH ROW EXECUTE FUNCTION public.set_board_members_updated_at();

-- RLS
ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read visible board members" ON public.board_members;
CREATE POLICY "Public can read visible board members"
  ON public.board_members FOR SELECT
  USING (is_visible = true);

DROP POLICY IF EXISTS "Admins can read all board members" ON public.board_members;
CREATE POLICY "Admins can read all board members"
  ON public.board_members FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert board members" ON public.board_members;
CREATE POLICY "Admins can insert board members"
  ON public.board_members FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update board members" ON public.board_members;
CREATE POLICY "Admins can update board members"
  ON public.board_members FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete board members" ON public.board_members;
CREATE POLICY "Admins can delete board members"
  ON public.board_members FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- Seed "about" section config used by /sobre-afa intro.
-- Stored in site_config so admins can edit copy in CA/ES/EN
-- without touching code.
-- ============================================================
INSERT INTO public.site_config (key, value)
VALUES (
  'board',
  jsonb_build_object(
    'translations', jsonb_build_object(
      'ca', jsonb_build_object(
        'title', 'Sobre l''AFA',
        'subtitle', 'Qui som i com ens organitzem',
        'mission', 'L''AFA (Associació de Famílies d''Alumnes) és una entitat sense ànim de lucre formada per les famílies de l''escola. Treballem per donar suport al projecte educatiu, organitzar activitats i representar les famílies davant l''escola i les administracions.',
        'composition_title', 'La Junta Directiva',
        'composition_intro', 'La Junta es renova en assemblea i està formada pels següents càrrecs:'
      ),
      'es', jsonb_build_object(
        'title', 'Sobre el AFA',
        'subtitle', 'Quiénes somos y cómo nos organizamos',
        'mission', 'El AFA (Asociación de Familias de Alumnos) es una entidad sin ánimo de lucro formada por las familias de la escuela. Trabajamos para apoyar el proyecto educativo, organizar actividades y representar a las familias ante la escuela y las administraciones.',
        'composition_title', 'La Junta Directiva',
        'composition_intro', 'La Junta se renueva en asamblea y está formada por los siguientes cargos:'
      ),
      'en', jsonb_build_object(
        'title', 'About AFA',
        'subtitle', 'Who we are and how we organize',
        'mission', 'AFA (Family Association) is a non-profit made up of the school families. We support the educational project, organize activities and represent families before the school and authorities.',
        'composition_title', 'The Board',
        'composition_intro', 'The Board is renewed at the assembly and is made up of the following roles:'
      )
    )
  )
)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- ROLLBACK
-- ============================================================
-- DROP TRIGGER IF EXISTS trg_board_members_updated_at ON public.board_members;
-- DROP FUNCTION IF EXISTS public.set_board_members_updated_at();
-- DROP TABLE IF EXISTS public.board_members;
-- DELETE FROM public.site_config WHERE key = 'board';
