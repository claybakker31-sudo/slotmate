-- SlotMate Milestone 2: Multi-tenant database schema
-- Safe to run on a fresh Supabase Free Tier project via SQL Editor or `supabase db push`.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Automatically keep updated_at timestamps current on row updates.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 1. User profiles (1-to-1 with auth.users, storing non-sensitive app preferences)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  preferred_locale text NOT NULL DEFAULT 'it' CHECK (preferred_locale IN ('it', 'en', 'ar', 'es')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 2. Businesses (each row represents an isolated tenant workspace)
CREATE TABLE IF NOT EXISTS public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) >= 2 AND char_length(trim(name)) <= 120),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' AND char_length(slug) >= 2 AND char_length(slug) <= 80),
  category text NOT NULL DEFAULT 'general' CHECK (char_length(trim(category)) >= 2 AND char_length(trim(category)) <= 60),
  timezone text NOT NULL DEFAULT 'Europe/Rome' CHECK (char_length(trim(timezone)) >= 2 AND char_length(trim(timezone)) <= 80),
  default_locale text NOT NULL DEFAULT 'it' CHECK (default_locale IN ('it', 'en', 'ar', 'es')),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON public.businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON public.businesses(status);

DROP TRIGGER IF EXISTS trg_businesses_updated_at ON public.businesses;
CREATE TRIGGER trg_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 3. Business members (connects auth.users to businesses with tenant roles)
CREATE TABLE IF NOT EXISTS public.business_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'admin', 'staff')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_business_members_business_user UNIQUE (business_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_members_user_id ON public.business_members(user_id);
CREATE INDEX IF NOT EXISTS idx_business_members_business_id ON public.business_members(business_id);

-- 4. Time slots (tenant-scoped schedule items isolated per business_id)
CREATE TABLE IF NOT EXISTS public.time_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(trim(title)) >= 2 AND char_length(trim(title)) <= 120),
  category text NOT NULL DEFAULT 'General' CHECK (char_length(trim(category)) >= 1 AND char_length(trim(category)) <= 60),
  starts_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30 CHECK (duration_minutes >= 5 AND duration_minutes <= 480),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'cancelled')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_slots_business_starts_at
  ON public.time_slots(business_id, starts_at);

DROP TRIGGER IF EXISTS trg_time_slots_updated_at ON public.time_slots;
CREATE TRIGGER trg_time_slots_updated_at
  BEFORE UPDATE ON public.time_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
