-- Datos mínimos para levantar un entorno usable en local y en los E2E.
--
-- `supabase start` lo ejecuta después de las migraciones (ver [db.seed] en
-- config.toml). NUNCA se aplica a producción: `db push` solo mira
-- supabase/migrations.
--
-- Objetivo: que la web arranque con contenido y que exista un admin con el que
-- poder entrar al panel. Nada de datos reales.

-- ------------------------------------------------------------------
-- Usuario admin de pruebas
-- ------------------------------------------------------------------
-- La contraseña se cifra con crypt() igual que hace GoTrue. El trigger
-- on_auth_user_created creará su fila en profiles con rol 'familia'.
-- Las columnas de token van a cadena vacía, no a NULL: GoTrue las lee sin
-- comprobar nulos y con NULL el login falla sin decir por qué.
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token,
    email_change, email_change_token_new, email_change_token_current,
    phone_change, phone_change_token, reauthentication_token,
    is_super_admin, is_sso_user, is_anonymous
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated', 'authenticated',
    'admin@example.test',
    crypt('provaE2E!2026', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Admin de proves"}'::jsonb,
    '', '', '', '', '', '', '', '',
    false, false, false
)
ON CONFLICT (id) DO NOTHING;

-- GoTrue necesita la identidad asociada para que funcione el login por email.
INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '{"sub":"11111111-1111-1111-1111-111111111111","email":"admin@example.test","email_verified":true}'::jsonb,
    'email', NOW(), NOW(), NOW()
)
ON CONFLICT (provider, provider_id) DO NOTHING;

-- Ascenderlo a admin. protect_profile_role() deja pasar los cambios sin claims
-- JWT (conexión directa), que es el caso del seed.
UPDATE public.profiles
   SET role = 'admin', full_name = 'Admin de proves'
 WHERE id = '11111111-1111-1111-1111-111111111111';

-- ------------------------------------------------------------------
-- Contenido mínimo
-- ------------------------------------------------------------------
-- `category` es NOT NULL y no hay is_active: la visibilidad se controla con
-- inscription_enabled. Columnas verificadas contra el esquema real.
INSERT INTO public.activities (title, title_ca, category, description, price, inscription_enabled)
SELECT 'Anglès', 'Anglès', 'idiomes', 'Activitat de prova per als tests.', 30, true
 WHERE NOT EXISTS (SELECT 1 FROM public.activities);

INSERT INTO public.site_config (key, value)
VALUES
    ('season', '{"academic_year":"2026-27"}'::jsonb),
    ('branding', '{"site_name":"AFA Falguera (proves)"}'::jsonb)
ON CONFLICT (key) DO NOTHING;
