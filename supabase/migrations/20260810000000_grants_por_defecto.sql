-- Permisos de tabla para los roles de la API.
--
-- POR QUÉ
-- Ninguna migración concedía nada a `anon` ni a `authenticated`. En producción
-- funciona porque Supabase los reparte al crear el proyecto y nadie los tocó,
-- pero eso vivía solo en la base remota: un entorno levantado desde el
-- repositorio arrancaba con el esquema correcto y **la web sin poder leer
-- nada** — PostgREST devolvía 42501 "permission denied" en cada pantalla.
--
-- Lo detectaron los E2E la primera vez que se ejecutaron.
--
-- No debilita la seguridad: en Supabase el GRANT abre la puerta y la RLS es
-- quien decide qué filas se ven. Todas las tablas con datos sensibles tienen
-- sus políticas (ver el esquema base y las migraciones de hardening).

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Objetos que ya existen a estas alturas del histórico.
GRANT ALL ON ALL TABLES    IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Y los que se creen después, para no tener que volver a acordarse.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
