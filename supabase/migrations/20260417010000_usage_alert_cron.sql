-- Helper function called by the usage-alert Edge Function
CREATE OR REPLACE FUNCTION public.get_db_size_bytes()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT pg_database_size(current_database())::bigint;
$$;

-- Store the alert secret in Vault (run once; value set by admin after deploy)
-- To set: SELECT vault.create_secret('REPLACE_WITH_RANDOM_SECRET', 'usage_alert_secret');
-- The same value must be added as Edge Function secret USAGE_ALERT_SECRET in Supabase Dashboard.

-- Schedule weekly usage alert every Monday at 08:00 UTC
-- Reads the secret from vault at runtime so it never appears in plaintext SQL
SELECT cron.schedule(
  'weekly-usage-alert',
  '0 8 * * 1',
  $$
  SELECT net.http_post(
    url     := 'https://zaxbtnjkidqwzqsehvld.supabase.co/functions/v1/usage-alert',
    headers := jsonb_build_object(
      'Content-Type',    'application/json',
      'x-alert-secret',  (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'usage_alert_secret' LIMIT 1)
    ),
    body    := '{}'::jsonb
  );
  $$
);
