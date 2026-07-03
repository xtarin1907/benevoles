-- Every 5 minutes, ask send-reminders to sweep every manifestation with
-- sms_enabled + send_mode='automatic'. URL and service-role key are stored
-- in Supabase Vault (created out-of-band, not in this file) and looked up
-- by name at call time -- never embedded as plaintext in a migration.
SELECT cron.schedule(
  'send-reminders-every-5-min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'send_reminders_url'),
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'send_reminders_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
