-- =============================================================
-- Migration: tornar a tancar les funcions que el GRANT en bloc va reobrir
-- Date: 2026-09-10
--
-- QUÈ HA PASSAT
-- `20260810000000_grants_por_defecto.sql` fa, entre d'altres:
--
--     GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
--
-- Es va escriure per arreglar els permisos de taula d'un entorn muntat des del
-- repositori, i per a les taules és correcte: el GRANT obre la porta i la RLS
-- decideix les files. Però les funcions no tenen RLS. Per a elles el GRANT ÉS
-- el permís, i aquella línia va tornar a concedir EXECUTE sobre **totes** les
-- funcions de public — incloses les que el hardening havia revocat expressament
-- mesos abans, perquè les migracions s'apliquen per ordre de nom i la del
-- 10-08 va després.
--
-- Van quedar reobertes a `anon` set funcions SECURITY DEFINER sense cap
-- comprovació d'autorització a dins (la revocació ERA la comprovació):
--
--   remove_baja_payments_for_month(int,int)       esborra rebuts
--   generate_monthly_payments(int,int)            crea rebuts en massa
--   generate_monthly_payments_only_active(int,int)      idem
--   dar_de_alta_inscripcion(uuid,text,text)       canvia l'estat d'una inscripció
--   dar_de_baja_inscripcion(uuid,text,text)       idem
--   get_db_size_bytes() / get_storage_size_bytes()      dades d'infraestructura
--
-- La clau `anon` és pública per disseny: viatja dins del bundle de la web. Cap
-- d'aquestes funcions retorna dades d'infants, així que no és una fuga de dades
-- personals; és integritat i destrucció.
--
-- QUÈ FA AQUESTA MIGRACIÓ
-- Repeteix, tal qual, els REVOKE anteriors al 10-08-2026. No inventa cap regla
-- nova: cada línia és la que ja hi havia a la migració que la va escriure, amb
-- el mateix conjunt de rols. Les funcions que el panell crida com a admin
-- (generar rebuts, altes i baixes, mides de la base) conserven `authenticated`,
-- que és qui les feia servir; només perden `PUBLIC` i `anon`.
--
-- Com que va després del GRANT en bloc, arregla alhora producció i qualsevol
-- entorn reconstruït des de zero.
--
-- La xarxa perquè no torni a passar és el bloc 5 de scripts/check-rls.sql, que
-- falla si una funció SECURITY DEFINER de public queda executable per `anon`
-- sense estar a la llista d'excepcions.
--
-- Idempotent: safe to re-run.
-- =============================================================

-- Funcions de trigger: ningú les ha de poder cridar directament.
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_audit_log()                             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_contact_message()                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_shop_order()                        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_shop_order_inventory_on_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_shop_variant_stock()                      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_create_payments_for_inscription()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_inscripcio_academic_year()                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_shop_order_academic_year()                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_finance_tx_academic_year()                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_payment_academic_year()                    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.events_fill_end_date()                         FROM PUBLIC, anon, authenticated;

-- Operacions d'administració: les crida el panell amb sessió d'admin, així que
-- conserven `authenticated`. La RLS de les taules que toquen segueix manant.
REVOKE EXECUTE ON FUNCTION public.dar_de_alta_inscripcion(uuid, text, text)       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.dar_de_baja_inscripcion(uuid, text, text)       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_monthly_payments(int, int)             FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_monthly_payments_only_active(int, int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.remove_baja_payments_for_month(int, int)        FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_db_size_bytes()                             FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_storage_size_bytes()                        FROM PUBLIC, anon;

-- Ajudants interns de preus i de curs: només els criden altres funcions.
REVOKE EXECUTE ON FUNCTION public.current_academic_year()                    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.activity_monthly_price(text, boolean)      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_fee_rules()                            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_activity_excluded(text)                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.student_monthly_fee(text[], boolean)       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.book_price_for(text)                       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.afa_annual_fee()                           FROM PUBLIC, anon, authenticated;
REVOKE ALL     ON FUNCTION public.hash_password(text)                        FROM PUBLIC, anon, authenticated;

-- `is_admin()` s'ha de poder avaluar dins de les polítiques RLS.
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ---------------------------------------------------------------
-- ROLLBACK
-- ---------------------------------------------------------------
-- No n'hi ha de segur: desfer això torna a obrir a `anon` funcions que
-- esborren rebuts. Si una pantalla es trenca, concedeix EXECUTE a
-- `authenticated` sobre la funció concreta que li falti, mai a `anon`.
