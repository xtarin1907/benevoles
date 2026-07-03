-- pg_net doesn't support ALTER EXTENSION ... SET SCHEMA -- reinstall it
-- directly into `extensions`, matching pgcrypto/uuid-ossp. No dependents
-- yet (just installed, not referenced anywhere), so a plain drop/recreate
-- is safe.
DROP EXTENSION pg_net;
CREATE EXTENSION pg_net SCHEMA extensions;
