-- Bénévoles+ — same fix as handle_new_user() (Phase 1) and
-- create_shift_signup() (Phase 5): this is a trigger function, never
-- meant to be called directly via RPC. Postgres refuses direct trigger-
-- function invocation outside a trigger context regardless of grants, so
-- this was never exploitable -- revoking just closes the advisor WARN.
REVOKE EXECUTE ON FUNCTION public.award_points_on_signup_status_change() FROM PUBLIC, anon, authenticated;
