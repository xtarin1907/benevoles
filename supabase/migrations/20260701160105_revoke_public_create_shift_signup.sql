-- Bénévoles+ — Postgres grants EXECUTE to PUBLIC by default on function
-- creation, so the previous migration's explicit GRANT TO authenticated
-- didn't actually exclude anon -- it just added a redundant grant on top
-- of the still-standing PUBLIC one. The function already self-rejects
-- anon calls at runtime (auth.uid() IS NULL), so this was never
-- exploitable, but revoking closes the advisor WARN cleanly.
REVOKE EXECUTE ON FUNCTION public.create_shift_signup(UUID) FROM PUBLIC, anon;
