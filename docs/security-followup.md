# Supabase advisors — pendientes

Última revisión: 2026-05-06. Tras aplicar las migraciones
`20260506010000_fix_board_advisors`, `20260506020000_security_hardening`
y `20260506030000_storage_listing_lockdown`, quedan **31 warnings**.
Ninguno es crítico — están listados aquí por si se quieren atacar más adelante.

---

## 1. SECURITY DEFINER funcs ejecutables por `authenticated` (15)

Funciones admin-only que el rol `authenticated` puede invocar vía
`/rest/v1/rpc/...`. Es **intencional**: el panel admin se autentica con
sesión Supabase y se apoya en `is_admin()` en RLS para autorizar.

Funciones afectadas (todas requieren rol admin internamente o tocan
tablas con RLS admin-only):
- `create_shop_complex_order_v1` (4 sobrecargas), `create_shop_order_v1`
- `dar_de_alta_inscripcion`, `dar_de_baja_inscripcion`
- `fn_create_payments_for_inscription`
- `generate_monthly_payments`, `generate_monthly_payments_only_active`
- `remove_baja_payments_for_month`
- `get_db_size_bytes`, `get_storage_size_bytes`
- `handle_audit_log`, `handle_new_*`
- `is_admin`

**Acción recomendada (si se quiere atacar):** añadir un check explícito
`IF NOT public.is_admin() THEN RAISE EXCEPTION ...` al inicio de las RPC
admin para defensa en profundidad.

---

## 2. SECURITY DEFINER funcs ejecutables por `anon` (8)

Subset del anterior que sigue accesible a anon. Son las del flujo
público:
- `create_shop_complex_order_v1` x4 — checkout botiga sin login.
- `create_shop_order_v1` — variante simple del checkout.
- `increment_clicks(slug)` — contador de short URLs.
- `is_admin()` — anon llamando devuelve `false`, no fuga datos.

**Acción recomendada:** ninguna. Si se cierra el checkout a `authenticated`,
revocar `EXECUTE` de `anon` en las 5 funciones de shop.

---

## 3. `rls_policy_always_true` (5)

Políticas RLS con `WITH CHECK = true` en formularios públicos:
- `inscripcions` INSERT (2 policies duplicadas: `Anyone can submit
  inscriptions` + `Public can insert inscriptions`).
- `inscripcions_history` INSERT (alimentada por trigger).
- `shop_orders` INSERT, `shop_order_items` INSERT.

**Acción recomendada:**
- Borrar la policy duplicada en `inscripcions` (una de las dos).
- Mitigar abuso con rate-limit/captcha en app (Cloudflare Turnstile o similar).
- Las trigger-fed (`inscripcions_history`) son seguras: el trigger
  controla qué se inserta. Se puede sustituir la policy por
  `WITH CHECK (current_user = 'supabase_admin')` o moverlo a SECURITY
  DEFINER trigger.

---

## 4. `extension_in_public` (1)

`pg_net` instalado en schema `public`. Best practice: moverlo a
`extensions`.

```sql
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pg_net SET SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
```

**Riesgo:** mínimo. Solo afecta organización del esquema.

---

## 5. Auth — config en dashboard (2)

No son SQL. Hay que tocarlas en Supabase Dashboard → Authentication →
Settings:

- **`auth_leaked_password_protection`**: activar HaveIBeenPwned check
  para bloquear contraseñas comprometidas.
- **`auth_insufficient_mfa_options`**: habilitar TOTP/MFA al menos para
  el rol admin.

URL: `https://supabase.com/dashboard/project/zaxbtnjkidqwzqsehvld/auth/providers`

---

## Performance advisors (no incluidos en los 31 anteriores)

Algunas mejoras pendientes que el linter de performance reporta:

- **Tablas backup sin uso** (`*_backup_*`): ~30 índices unused. Si los
  backups ya no se consultan, se pueden DROP las tablas enteras.
- **`auth_rls_initplan`** en 8 RLS (`shop_orders`, `shop_order_items`,
  `admin_tasks`, `short_urls`): usar `(SELECT auth.uid())` en vez de
  `auth.uid()` para que Postgres lo evalúe una vez por query, no por
  fila.
- **`multiple_permissive_policies`** en `activities`, `shop_orders`,
  `shop_order_items`, `inscripcions`, `finance_transactions`: colapsar
  policies que se solapan en una sola con `OR`.
- **FK sin índice**: `admin_tasks_created_by_fkey`.
- **Índices unused** en tablas activas: revisar cuáles se pueden tirar
  (`idx_news_published_*`, `idx_payments_*`, `idx_admin_tasks_*`...).

---

## Histórico de migraciones aplicadas

| Fecha       | Migración                                  | Qué arregla                                                  |
|-------------|--------------------------------------------|--------------------------------------------------------------|
| 2026-05-06  | `20260506000000_create_board_members`      | Tabla y RLS de Junta Directiva                               |
| 2026-05-06  | `20260506010000_fix_board_advisors`        | search_path + colapso de policies en `board_members`         |
| 2026-05-06  | `20260506020000_security_hardening`        | Cierra fuga de `admin_users.password_hash`, revoca anon RPCs |
| 2026-05-06  | `20260506030000_storage_listing_lockdown`  | Quita listing público en 4 buckets, cierra INSERT `invoices` |
