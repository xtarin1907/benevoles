CREATE TYPE public.tshirt_size AS ENUM ('XS', 'S', 'M', 'L', 'XL', 'XXL');

ALTER TABLE public.profiles
  ADD COLUMN date_of_birth date,
  ADD COLUMN tshirt_size public.tshirt_size,
  ADD COLUMN address text;

GRANT UPDATE (date_of_birth, tshirt_size, address) ON public.profiles TO authenticated;

-- handle_new_user() now also seeds phone/address/tshirt_size/date_of_birth
-- from the signup form's metadata, same pattern as full_name/newsletter_consent.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _consent BOOLEAN := COALESCE((NEW.raw_user_meta_data ->> 'newsletter_consent')::boolean, false);
BEGIN
  INSERT INTO public.profiles (
    id, email, full_name, phone, address, tshirt_size, date_of_birth,
    newsletter_consent, newsletter_consent_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'phone',
    NEW.raw_user_meta_data ->> 'address',
    (NEW.raw_user_meta_data ->> 'tshirt_size')::public.tshirt_size,
    (NEW.raw_user_meta_data ->> 'date_of_birth')::date,
    _consent,
    CASE WHEN _consent THEN now() ELSE NULL END
  );
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
