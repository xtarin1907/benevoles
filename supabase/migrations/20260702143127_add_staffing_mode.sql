CREATE TYPE public.staffing_mode AS ENUM ('shifts', 'postes');

ALTER TABLE public.manifestations
  ADD COLUMN staffing_mode public.staffing_mode NOT NULL DEFAULT 'shifts';

ALTER TABLE public.secteurs
  ADD COLUMN staffing_mode public.staffing_mode;

-- Existing shifts already have start_at/end_at populated -- DROP NOT NULL
-- alone is safe here, no backfill needed. A "poste ouvert" (headcount-only)
-- shift is represented as a shift row with null dates.
ALTER TABLE public.shifts
  ALTER COLUMN start_at DROP NOT NULL,
  ALTER COLUMN end_at DROP NOT NULL;
