-- SlotMate Milestone 2: Auth trigger & atomic business registration RPC
-- Allows registration and onboarding using only Supabase Auth + Anon key (no service-role key needed).

-- Helper to normalize a business name or custom slug into a URL-safe lowercase slug.
CREATE OR REPLACE FUNCTION public.slugify_text(input_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(
    both '-' FROM regexp_replace(
      regexp_replace(lower(coalesce(input_text, '')), '[^a-z0-9]+', '-', 'g'),
      '-{2,}',
      '-',
      'g'
    )
  );
$$;

-- Atomic RPC for authenticated users to register a new business tenant.
-- Creates both the business row and the owner membership row in one transaction.
CREATE OR REPLACE FUNCTION public.register_business(
  p_name text,
  p_slug text DEFAULT NULL,
  p_category text DEFAULT 'general',
  p_timezone text DEFAULT 'Europe/Rome',
  p_default_locale text DEFAULT 'it'
)
RETURNS public.businesses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_clean_name text := trim(coalesce(p_name, ''));
  v_clean_slug text := public.slugify_text(coalesce(NULLIF(trim(p_slug), ''), v_clean_name));
  v_clean_category text := coalesce(NULLIF(trim(p_category), ''), 'general');
  v_clean_timezone text := coalesce(NULLIF(trim(p_timezone), ''), 'Europe/Rome');
  v_clean_locale text := CASE
    WHEN p_default_locale IN ('it', 'en', 'ar', 'es') THEN p_default_locale
    ELSE 'it'
  END;
  v_explicit_slug boolean := NULLIF(trim(coalesce(p_slug, '')), '') IS NOT NULL;
  v_business public.businesses;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to register a business.'
      USING ERRCODE = '42501';
  END IF;

  IF char_length(v_clean_name) < 2 OR char_length(v_clean_name) > 120 THEN
    RAISE EXCEPTION 'Business name must be between 2 and 120 characters.'
      USING ERRCODE = '22023';
  END IF;

  IF char_length(v_clean_slug) < 2 THEN
    v_clean_slug := 'business-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  END IF;

  v_clean_slug := left(v_clean_slug, 72);

  IF EXISTS (SELECT 1 FROM public.businesses b WHERE b.slug = v_clean_slug) THEN
    IF v_explicit_slug THEN
      RAISE EXCEPTION 'This business URL slug is already taken. Please choose another.'
        USING ERRCODE = '23505';
    END IF;
    v_clean_slug := v_clean_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 5);
  END IF;

  -- Ensure profile exists even if user existed before trigger was installed.
  INSERT INTO public.profiles (id, preferred_locale)
  VALUES (v_user_id, v_clean_locale)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.businesses (
    name,
    slug,
    category,
    timezone,
    default_locale,
    owner_id
  )
  VALUES (
    v_clean_name,
    v_clean_slug,
    v_clean_category,
    v_clean_timezone,
    v_clean_locale,
    v_user_id
  )
  RETURNING * INTO v_business;

  INSERT INTO public.business_members (
    business_id,
    user_id,
    role
  )
  VALUES (
    v_business.id,
    v_user_id,
    'owner'
  );

  RETURN v_business;
END;
$$;

REVOKE ALL ON FUNCTION public.register_business(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_business(text, text, text, text, text) TO authenticated;

-- Trigger function: creates a profile on auth.users signup and optionally provisions
-- the user's initial business if pending_business_name metadata was provided at signup.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_locale text;
  v_full_name text;
  v_business_name text;
  v_business_slug text;
  v_business_category text;
  v_business_timezone text;
  v_business_id uuid;
BEGIN
  v_locale := CASE
    WHEN NEW.raw_user_meta_data->>'preferred_locale' IN ('it', 'en', 'ar', 'es')
      THEN NEW.raw_user_meta_data->>'preferred_locale'
    ELSE 'it'
  END;

  v_full_name := NULLIF(trim(coalesce(NEW.raw_user_meta_data->>'full_name', '')), '');

  INSERT INTO public.profiles (id, full_name, preferred_locale)
  VALUES (NEW.id, v_full_name, v_locale)
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    preferred_locale = EXCLUDED.preferred_locale;

  v_business_name := trim(coalesce(NEW.raw_user_meta_data->>'pending_business_name', ''));

  IF char_length(v_business_name) >= 2 THEN
    v_business_slug := public.slugify_text(
      coalesce(NULLIF(trim(NEW.raw_user_meta_data->>'pending_business_slug'), ''), v_business_name)
    );

    IF char_length(v_business_slug) < 2 THEN
      v_business_slug := 'business-' || substr(replace(NEW.id::text, '-', ''), 1, 6);
    END IF;

    v_business_slug := left(v_business_slug, 72);

    IF EXISTS (SELECT 1 FROM public.businesses b WHERE b.slug = v_business_slug) THEN
      v_business_slug := v_business_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 5);
    END IF;

    v_business_category := coalesce(
      NULLIF(trim(NEW.raw_user_meta_data->>'pending_business_category'), ''),
      'general'
    );
    v_business_timezone := coalesce(
      NULLIF(trim(NEW.raw_user_meta_data->>'pending_business_timezone'), ''),
      'Europe/Rome'
    );

    INSERT INTO public.businesses (
      name,
      slug,
      category,
      timezone,
      default_locale,
      owner_id
    )
    VALUES (
      left(v_business_name, 120),
      v_business_slug,
      left(v_business_category, 60),
      left(v_business_timezone, 80),
      v_locale,
      NEW.id
    )
    RETURNING id INTO v_business_id;

    INSERT INTO public.business_members (
      business_id,
      user_id,
      role
    )
    VALUES (
      v_business_id,
      NEW.id,
      'owner'
    )
    ON CONFLICT (business_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
