-- Enable pg_cron for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres role (required by Supabase)
GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule weekly purge of audit_logs older than 90 days (every Sunday at 03:00 UTC)
SELECT cron.schedule(
  'purge-old-audit-logs',
  '0 3 * * 0',
  $$DELETE FROM public.audit_logs WHERE created_at < NOW() - INTERVAL '90 days'$$
);
