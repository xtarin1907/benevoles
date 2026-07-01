-- Bénévoles+ — close the last security advisor WARN.
-- handle_new_user() is a trigger function (AFTER INSERT ON auth.users);
-- Postgres refuses to invoke trigger functions outside a trigger context,
-- so the RPC-exposure warning was a false positive in practice. Revoking
-- EXECUTE anyway is free (does not affect the trigger, which does not
-- check the firing role's EXECUTE grant) and leaves zero open advisors.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
