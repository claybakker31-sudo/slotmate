
-- ============================================================================
-- SlotMate Migration 0004: Booking foundation
-- Adds services, customers, appointments and waitlist management.
-- Preserves the existing multi-tenant business and time-slot structure.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 1. Supporting indexes for tenant-safe foreign keys
-- --------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS uq_business_members_business_id_id
  ON public.business_members (business_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_time_slots_business_id_id
  ON public.time_slots (business_id, id);

-- --------------------------------------------------------------------------
-- 2. Services
-- Prices are stored in minor currency units: e.g. EUR 25.00 = 2500.
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (
    char_length(trim(name)) BETWEEN 2 AND 120
  ),
  description text,
  price_minor integer NOT NULL DEFAULT 0 CHECK (price_minor >= 0),
  currency_code text NOT NULL DEFAULT 'EUR'
    CHECK (currency_code ~ '^[A-Z]{3}$'),
  duration_minutes integer NOT NULL DEFAULT 30
    CHECK (duration_minutes BETWEEN 5 AND 480),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_services_business_id_id UNIQUE (business_id, id)
);

CREATE INDEX IF NOT EXISTS idx_services_business_active
  ON public.services (business_id, is_active);

DROP TRIGGER IF EXISTS trg_services_updated_at ON public.services;
CREATE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------------------------
-- 3. Customers
-- Customer records belong to one business. Email and phone are optional.
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK (
    char_length(trim(full_name)) BETWEEN 2 AND 160
  ),
  email text,
  phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_customers_business_id_id UNIQUE (business_id, id)
);

CREATE INDEX IF NOT EXISTS idx_customers_business_name
  ON public.customers (business_id, full_name);

CREATE INDEX IF NOT EXISTS idx_customers_business_email
  ON public.customers (business_id, email)
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_business_phone
  ON public.customers (business_id, phone)
  WHERE phone IS NOT NULL;

DROP TRIGGER IF EXISTS trg_customers_updated_at ON public.customers;
CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------------------------
-- 4. Appointments
-- Snapshots preserve the service name, price and duration at booking time.
-- Composite foreign keys prevent cross-business references.
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,

  customer_id uuid NOT NULL,
  service_id uuid NOT NULL,
  staff_member_id uuid,
  time_slot_id uuid,

  service_name_snapshot text NOT NULL,
  price_minor integer NOT NULL CHECK (price_minor >= 0),
  currency_code text NOT NULL DEFAULT 'EUR'
    CHECK (currency_code ~ '^[A-Z]{3}$'),
  duration_minutes integer NOT NULL
    CHECK (duration_minutes BETWEEN 5 AND 480),

  starts_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'confirmed'
    CHECK (status IN (
      'pending',
      'confirmed',
      'cancelled',
      'completed',
      'no_show'
    )),

  customer_notes text,
  cancellation_reason text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_appointments_customer
    FOREIGN KEY (business_id, customer_id)
    REFERENCES public.customers (business_id, id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_appointments_service
    FOREIGN KEY (business_id, service_id)
    REFERENCES public.services (business_id, id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_appointments_staff
    FOREIGN KEY (business_id, staff_member_id)
    REFERENCES public.business_members (business_id, id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_appointments_time_slot
    FOREIGN KEY (business_id, time_slot_id)
    REFERENCES public.time_slots (business_id, id)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_appointments_business_starts
  ON public.appointments (business_id, starts_at);

CREATE INDEX IF NOT EXISTS idx_appointments_business_status
  ON public.appointments (business_id, status);

CREATE INDEX IF NOT EXISTS idx_appointments_customer
  ON public.appointments (business_id, customer_id);

CREATE INDEX IF NOT EXISTS idx_appointments_staff
  ON public.appointments (business_id, staff_member_id);

-- A non-cancelled appointment cannot reuse the same specific time slot.
CREATE UNIQUE INDEX IF NOT EXISTS uq_appointments_active_time_slot
  ON public.appointments (business_id, time_slot_id)
  WHERE time_slot_id IS NOT NULL AND status <> 'cancelled';

DROP TRIGGER IF EXISTS trg_appointments_updated_at ON public.appointments;
CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------------------------
-- 5. Waitlist
-- Offers require owner/admin approval.
-- The approval function below sets a 30-minute acceptance deadline.
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.waitlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,

  customer_id uuid NOT NULL,
  service_id uuid NOT NULL,
  preferred_staff_member_id uuid,

  preferred_after timestamptz,
  preferred_before timestamptz,

  status text NOT NULL DEFAULT 'waiting'
    CHECK (status IN (
      'waiting',
      'offer_pending',
      'accepted',
      'declined',
      'expired',
      'cancelled'
    )),

  offered_time_slot_id uuid,
  approved_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  approved_at timestamptz,
  offer_expires_at timestamptz,

  customer_notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_waitlist_customer
    FOREIGN KEY (business_id, customer_id)
    REFERENCES public.customers (business_id, id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_waitlist_service
    FOREIGN KEY (business_id, service_id)
    REFERENCES public.services (business_id, id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_waitlist_staff
    FOREIGN KEY (business_id, preferred_staff_member_id)
    REFERENCES public.business_members (business_id, id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_waitlist_offered_slot
    FOREIGN KEY (business_id, offered_time_slot_id)
    REFERENCES public.time_slots (business_id, id)
    ON DELETE RESTRICT,

  CONSTRAINT chk_waitlist_preferred_window
    CHECK (
      preferred_after IS NULL
      OR preferred_before IS NULL
      OR preferred_before > preferred_after
    ),

  CONSTRAINT chk_waitlist_offer_approval
    CHECK (
      status <> 'offer_pending'
      OR (
        offered_time_slot_id IS NOT NULL
        AND approved_by IS NOT NULL
        AND approved_at IS NOT NULL
        AND offer_expires_at IS NOT NULL
      )
    ),

  CONSTRAINT uq_waitlist_business_id_id UNIQUE (business_id, id)
);

CREATE INDEX IF NOT EXISTS idx_waitlist_business_status
  ON public.waitlist_entries (business_id, status);

CREATE INDEX IF NOT EXISTS idx_waitlist_customer
  ON public.waitlist_entries (business_id, customer_id);

-- Prevent two active offers for the same slot.
CREATE UNIQUE INDEX IF NOT EXISTS uq_waitlist_one_pending_offer_per_slot
  ON public.waitlist_entries (business_id, offered_time_slot_id)
  WHERE status = 'offer_pending';

DROP TRIGGER IF EXISTS trg_waitlist_updated_at ON public.waitlist_entries;
CREATE TRIGGER trg_waitlist_updated_at
  BEFORE UPDATE ON public.waitlist_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------------------------
-- 6. Prevent records from being moved between business tenants.
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_business_id_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.business_id IS DISTINCT FROM OLD.business_id THEN
    RAISE EXCEPTION 'A record cannot be moved between businesses.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_services_business_immutable ON public.services;
CREATE TRIGGER trg_services_business_immutable
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.prevent_business_id_change();

DROP TRIGGER IF EXISTS trg_customers_business_immutable ON public.customers;
CREATE TRIGGER trg_customers_business_immutable
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.prevent_business_id_change();

DROP TRIGGER IF EXISTS trg_appointments_business_immutable ON public.appointments;
CREATE TRIGGER trg_appointments_business_immutable
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.prevent_business_id_change();

DROP TRIGGER IF EXISTS trg_waitlist_business_immutable ON public.waitlist_entries;
CREATE TRIGGER trg_waitlist_business_immutable
  BEFORE UPDATE ON public.waitlist_entries
  FOR EACH ROW EXECUTE FUNCTION public.prevent_business_id_change();

-- --------------------------------------------------------------------------
-- 7. Row Level Security
-- --------------------------------------------------------------------------

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;

-- SERVICES: all business members can read; owner/admin can manage.
DROP POLICY IF EXISTS "services_select_member" ON public.services;
CREATE POLICY "services_select_member"
  ON public.services FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

DROP POLICY IF EXISTS "services_insert_admin" ON public.services;
CREATE POLICY "services_insert_admin"
  ON public.services FOR INSERT TO authenticated
  WITH CHECK (
    public.has_business_role(business_id, ARRAY['owner', 'admin'])
  );

DROP POLICY IF EXISTS "services_update_admin" ON public.services;
CREATE POLICY "services_update_admin"
  ON public.services FOR UPDATE TO authenticated
  USING (public.has_business_role(business_id, ARRAY['owner', 'admin']))
  WITH CHECK (public.has_business_role(business_id, ARRAY['owner', 'admin']));

DROP POLICY IF EXISTS "services_delete_admin" ON public.services;
CREATE POLICY "services_delete_admin"
  ON public.services FOR DELETE TO authenticated
  USING (public.has_business_role(business_id, ARRAY['owner', 'admin']));

-- CUSTOMERS: members can read/create/update; owner/admin can delete.
DROP POLICY IF EXISTS "customers_select_member" ON public.customers;
CREATE POLICY "customers_select_member"
  ON public.customers FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

DROP POLICY IF EXISTS "customers_insert_member" ON public.customers;
CREATE POLICY "customers_insert_member"
  ON public.customers FOR INSERT TO authenticated
  WITH CHECK (public.is_business_member(business_id));

DROP POLICY IF EXISTS "customers_update_member" ON public.customers;
CREATE POLICY "customers_update_member"
  ON public.customers FOR UPDATE TO authenticated
  USING (public.is_business_member(business_id))
  WITH CHECK (public.is_business_member(business_id));

DROP POLICY IF EXISTS "customers_delete_admin" ON public.customers;
CREATE POLICY "customers_delete_admin"
  ON public.customers FOR DELETE TO authenticated
  USING (public.has_business_role(business_id, ARRAY['owner', 'admin']));

-- APPOINTMENTS: all members can read/create/update; owner/admin can delete.
DROP POLICY IF EXISTS "appointments_select_member" ON public.appointments;
CREATE POLICY "appointments_select_member"
  ON public.appointments FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

DROP POLICY IF EXISTS "appointments_insert_member" ON public.appointments;
CREATE POLICY "appointments_insert_member"
  ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (
    public.is_business_member(business_id)
    AND (created_by IS NULL OR created_by = auth.uid())
  );

DROP POLICY IF EXISTS "appointments_update_member" ON public.appointments;
CREATE POLICY "appointments_update_member"
  ON public.appointments FOR UPDATE TO authenticated
  USING (public.is_business_member(business_id))
  WITH CHECK (public.is_business_member(business_id));

DROP POLICY IF EXISTS "appointments_delete_admin" ON public.appointments;
CREATE POLICY "appointments_delete_admin"
  ON public.appointments FOR DELETE TO authenticated
  USING (public.has_business_role(business_id, ARRAY['owner', 'admin']));

-- WAITLIST: members can read/add waiting entries.
-- Only owner/admin can update, approve or remove entries.
DROP POLICY IF EXISTS "waitlist_select_member" ON public.waitlist_entries;
CREATE POLICY "waitlist_select_member"
  ON public.waitlist_entries FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

DROP POLICY IF EXISTS "waitlist_insert_waiting_member" ON public.waitlist_entries;
CREATE POLICY "waitlist_insert_waiting_member"
  ON public.waitlist_entries FOR INSERT TO authenticated
  WITH CHECK (
    public.is_business_member(business_id)
    AND status = 'waiting'
    AND offered_time_slot_id IS NULL
    AND approved_by IS NULL
    AND approved_at IS NULL
    AND offer_expires_at IS NULL
  );

DROP POLICY IF EXISTS "waitlist_update_admin" ON public.waitlist_entries;
CREATE POLICY "waitlist_update_admin"
  ON public.waitlist_entries FOR UPDATE TO authenticated
  USING (public.has_business_role(business_id, ARRAY['owner', 'admin']))
  WITH CHECK (public.has_business_role(business_id, ARRAY['owner', 'admin']));

DROP POLICY IF EXISTS "waitlist_delete_admin" ON public.waitlist_entries;
CREATE POLICY "waitlist_delete_admin"
  ON public.waitlist_entries FOR DELETE TO authenticated
  USING (public.has_business_role(business_id, ARRAY['owner', 'admin']));

-- --------------------------------------------------------------------------
-- 8. Owner/admin approval function for a waitlist offer.
-- Locks the entry and slot, checks service duration and slot availability,
-- and creates a 30-minute offer. It does NOT send a notification yet.
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.approve_waitlist_offer(
  p_waitlist_entry_id uuid,
  p_time_slot_id uuid
)
RETURNS public.waitlist_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_entry public.waitlist_entries;
  v_slot public.time_slots;
  v_service public.services;
  v_updated public.waitlist_entries;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required.'
      USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_entry
  FROM public.waitlist_entries
  WHERE id = p_waitlist_entry_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Waitlist entry not found.';
  END IF;

  IF NOT public.has_business_role(
    v_entry.business_id,
    ARRAY['owner', 'admin']
  ) THEN
    RAISE EXCEPTION 'Only a business owner or admin can approve an offer.'
      USING ERRCODE = '42501';
  END IF;

  IF v_entry.status <> 'waiting' THEN
    RAISE EXCEPTION 'This waitlist entry is not waiting for an offer.';
  END IF;

  SELECT *
  INTO v_slot
  FROM public.time_slots
  WHERE id = p_time_slot_id
    AND business_id = v_entry.business_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Time slot not found for this business.';
  END IF;

  IF v_slot.status <> 'available' THEN
    RAISE EXCEPTION 'This time slot is not available.';
  END IF;

  -- Reserve the slot immediately so it cannot be offered or booked twice
  -- while the customer has 30 minutes to respond.
  UPDATE public.time_slots
  SET status = 'reserved'
  WHERE id = p_time_slot_id
    AND business_id = v_entry.business_id
    AND status = 'available';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This time slot was taken before the offer could be reserved.';
  END IF;

  SELECT *
  INTO v_service
  FROM public.services
  WHERE id = v_entry.service_id
    AND business_id = v_entry.business_id;

  IF NOT FOUND OR NOT v_service.is_active THEN
    RAISE EXCEPTION 'The requested service is unavailable.';
  END IF;

  IF v_slot.duration_minutes <> v_service.duration_minutes THEN
    RAISE EXCEPTION 'The time slot duration does not match the service.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.business_id = v_entry.business_id
      AND a.time_slot_id = p_time_slot_id
      AND a.status <> 'cancelled'
  ) THEN
    RAISE EXCEPTION 'This time slot already has an appointment.';
  END IF;

  UPDATE public.waitlist_entries
  SET
    status = 'offer_pending',
    offered_time_slot_id = p_time_slot_id,
    approved_by = auth.uid(),
    approved_at = now(),
    offer_expires_at = now() + interval '30 minutes'
  WHERE id = v_entry.id
  RETURNING * INTO v_updated;

  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_waitlist_offer(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_waitlist_offer(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_waitlist_offer(uuid, uuid) TO authenticated;

-- --------------------------------------------------------------------------
-- 9. Expire an unanswered offer and release its reserved time slot.
-- This is an owner/admin operation for now; automated expiry scheduling
-- and customer acceptance will be connected in the booking workflow phase.
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.expire_waitlist_offer(
  p_waitlist_entry_id uuid
)
RETURNS public.waitlist_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_entry public.waitlist_entries;
  v_updated public.waitlist_entries;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required.'
      USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_entry
  FROM public.waitlist_entries
  WHERE id = p_waitlist_entry_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Waitlist entry not found.';
  END IF;

  IF NOT public.has_business_role(
    v_entry.business_id,
    ARRAY['owner', 'admin']
  ) THEN
    RAISE EXCEPTION 'Only a business owner or admin can expire an offer.'
      USING ERRCODE = '42501';
  END IF;

  IF v_entry.status <> 'offer_pending' THEN
    RAISE EXCEPTION 'This waitlist entry has no pending offer.';
  END IF;

  IF v_entry.offer_expires_at > now() THEN
    RAISE EXCEPTION 'This offer has not reached its 30-minute expiry time.';
  END IF;

  -- Release the slot only if no appointment has claimed it.
  UPDATE public.time_slots ts
  SET status = 'available'
  WHERE ts.id = v_entry.offered_time_slot_id
    AND ts.business_id = v_entry.business_id
    AND ts.status = 'reserved'
    AND NOT EXISTS (
      SELECT 1
      FROM public.appointments a
      WHERE a.business_id = v_entry.business_id
        AND a.time_slot_id = v_entry.offered_time_slot_id
        AND a.status <> 'cancelled'
    );

  UPDATE public.waitlist_entries
  SET status = 'expired'
  WHERE id = v_entry.id
  RETURNING * INTO v_updated;

  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_waitlist_offer(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.expire_waitlist_offer(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.expire_waitlist_offer(uuid) TO authenticated;

-- --------------------------------------------------------------------------
-- 10. Table permissions
-- RLS policies above determine which rows each user can access.
-- --------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.services,
     public.customers,
     public.appointments,
     public.waitlist_entries
  TO authenticated;

COMMIT;

-- Migration 0004 complete.
