-- =============================================
-- Migration: Confirmation email to the parent on new inscription
-- Description: After an inscripcions row is inserted, call the
--   `send-inscription-email` Edge Function (Resend) so the parent gets a
--   "we received your enrolment" email at parent_email_1 (+ parent_email_2).
-- Mirrors the existing send-order-email / send-contact-email webhooks.
--
-- SECURITY: the real webhook carries the project's service_role JWT in the
--   Authorization header. That secret is NOT committed here. This file is a
--   trace/placeholder — the live trigger was applied via the Management API
--   query endpoint with the real key (see memory: supabase-migrations-apply).
--   Replace <SERVICE_ROLE_KEY> before running this file manually.
-- =============================================

DROP TRIGGER IF EXISTS "send-inscription-email-webhook" ON public.inscripcions;

CREATE TRIGGER "send-inscription-email-webhook"
AFTER INSERT ON public.inscripcions
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://zaxbtnjkidqwzqsehvld.supabase.co/functions/v1/send-inscription-email',
  'POST',
  '{"Content-type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}',
  '{}',
  '5000'
);
