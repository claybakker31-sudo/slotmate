-- SlotMate Milestone 2: Row Level Security (RLS) helper functions & policies
-- Uses SECURITY DEFINER helpers so policies never trigger infinite recursion on business_members.

-- 1. Membership helper: true if current authenticated user belongs to target_business_id.
CREATE OR REPLACE FUNCTION public.is_business_member(target_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_members bm
    WHERE bm.business_id = target_business_id
      AND bm.user_id = auth.uid()
  );
$$;

-- 2. Role helper: true if current authenticated user has one of allowed_roles in target_business_id.
CREATE OR REPLACE FUNCTION public.has_business_role(
  target_business_id uuid,
  allowed_roles text[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_members bm
    WHERE bm.business_id = target_business_id
      AND bm.user_id = auth.uid()
      AND bm.role = ANY (allowed_roles)
  );
$$;

-- 3. Co-member helper: true if current user and target_user_id belong to at least one shared business.
CREATE OR REPLACE FUNCTION public.shares_business_with(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_members mine
    INNER JOIN public.business_members theirs
      ON mine.business_id = theirs.business_id
    WHERE mine.user_id = auth.uid()
      AND theirs.user_id = target_user_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_business_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_business_role(uuid, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.shares_business_with(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_business_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_business_role(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_business_with(uuid) TO authenticated;

-- Enable RLS on all application tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "profiles_select_self_or_teammate" ON public.profiles;
CREATE POLICY "profiles_select_self_or_teammate"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR public.shares_business_with(id)
  );

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- BUSINESSES POLICIES (Tenant isolation)
-- ============================================================================
DROP POLICY IF EXISTS "businesses_select_member" ON public.businesses;
CREATE POLICY "businesses_select_member"
  ON public.businesses
  FOR SELECT
  TO authenticated
  USING (public.is_business_member(id));

DROP POLICY IF EXISTS "businesses_insert_owner" ON public.businesses;
CREATE POLICY "businesses_insert_owner"
  ON public.businesses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "businesses_update_owner_or_admin" ON public.businesses;
CREATE POLICY "businesses_update_owner_or_admin"
  ON public.businesses
  FOR UPDATE
  TO authenticated
  USING (public.has_business_role(id, ARRAY['owner', 'admin']))
  WITH CHECK (public.has_business_role(id, ARRAY['owner', 'admin']));

DROP POLICY IF EXISTS "businesses_delete_owner" ON public.businesses;
CREATE POLICY "businesses_delete_owner"
  ON public.businesses
  FOR DELETE
  TO authenticated
  USING (public.has_business_role(id, ARRAY['owner']));

-- ============================================================================
-- BUSINESS MEMBERS POLICIES (Tenant membership & role management)
-- ============================================================================
DROP POLICY IF EXISTS "business_members_select_same_tenant" ON public.business_members;
CREATE POLICY "business_members_select_same_tenant"
  ON public.business_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_business_member(business_id)
  );

DROP POLICY IF EXISTS "business_members_insert_owner_or_admin" ON public.business_members;
CREATE POLICY "business_members_insert_owner_or_admin"
  ON public.business_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      public.has_business_role(business_id, ARRAY['owner'])
      AND role IN ('owner', 'admin', 'staff')
    )
    OR (
      public.has_business_role(business_id, ARRAY['admin'])
      AND role IN ('admin', 'staff')
    )
  );

DROP POLICY IF EXISTS "business_members_update_owner_only" ON public.business_members;
CREATE POLICY "business_members_update_owner_only"
  ON public.business_members
  FOR UPDATE
  TO authenticated
  USING (public.has_business_role(business_id, ARRAY['owner']))
  WITH CHECK (public.has_business_role(business_id, ARRAY['owner']));

DROP POLICY IF EXISTS "business_members_delete_owner_or_self" ON public.business_members;
CREATE POLICY "business_members_delete_owner_or_self"
  ON public.business_members
  FOR DELETE
  TO authenticated
  USING (
    public.has_business_role(business_id, ARRAY['owner'])
    OR (user_id = auth.uid() AND role <> 'owner')
  );

-- ============================================================================
-- TIME SLOTS POLICIES (Strict multi-tenant isolation by business_id)
-- ============================================================================
DROP POLICY IF EXISTS "time_slots_select_member" ON public.time_slots;
CREATE POLICY "time_slots_select_member"
  ON public.time_slots
  FOR SELECT
  TO authenticated
  USING (public.is_business_member(business_id));

DROP POLICY IF EXISTS "time_slots_insert_member" ON public.time_slots;
CREATE POLICY "time_slots_insert_member"
  ON public.time_slots
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_business_role(business_id, ARRAY['owner', 'admin', 'staff'])
    AND (created_by IS NULL OR created_by = auth.uid())
  );

DROP POLICY IF EXISTS "time_slots_update_member" ON public.time_slots;
CREATE POLICY "time_slots_update_member"
  ON public.time_slots
  FOR UPDATE
  TO authenticated
  USING (public.has_business_role(business_id, ARRAY['owner', 'admin', 'staff']))
  WITH CHECK (public.has_business_role(business_id, ARRAY['owner', 'admin', 'staff']));

DROP POLICY IF EXISTS "time_slots_delete_owner_or_admin" ON public.time_slots;
CREATE POLICY "time_slots_delete_owner_or_admin"
  ON public.time_slots
  FOR DELETE
  TO authenticated
  USING (public.has_business_role(business_id, ARRAY['owner', 'admin']));
