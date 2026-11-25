# Supabase Setup & Multi-Tenant Architecture (Milestone 2)

SlotMate Milestone 2 uses **free Supabase services only**:

- **Supabase Auth**: Email + password authentication with SSR HTTP-only cookie sessions via `@supabase/ssr`.
- **Supabase Postgres + Row Level Security (RLS)**: Multi-tenant tables where every business and its time slots are strictly isolated per tenant.
- **Database Functions & Triggers**: Automatic profile creation on signup and atomic business registration (`public.register_business`).

---

## 1. Create a Free Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account / project.
2. Wait 1–2 minutes for the database to finish provisioning.

## 2. Run the SQL Migrations

Apply the three migration files in `supabase/migrations/` in exact order using the **SQL Editor** in your Supabase Dashboard:

1. `supabase/migrations/0001_init_multi_tenant_schema.sql`
2. `supabase/migrations/0002_row_level_security.sql`
3. `supabase/migrations/0003_auth_and_business_registration_functions.sql`

See [supabase/README.md](../supabase/README.md) for full details.

## 3. Configure Supabase Auth URLs

In your Supabase Dashboard, open **Authentication -> URL Configuration**:

- **Site URL**: `http://localhost:3000` (or your production domain when deployed)
- **Redirect URLs**: Add `http://localhost:3000/auth/callback` (and `https://your-domain.com/auth/callback` for production)

> **Beginner Tip:** If you want to test sign-up locally without waiting for confirmation emails, you can temporarily toggle off **Confirm email** under **Authentication -> Providers -> Email** in the Supabase Dashboard. Keep it enabled for production!

## 4. Multi-Tenant Data Model Overview

```text
auth.users (Supabase Auth)
   ├── 1:1 ──▶ public.profiles (full_name, preferred_locale)
   └── M:N ──▶ public.business_members (business_id, user_id, role: owner|admin|staff)
                   └── N:1 ──▶ public.businesses (id, name, slug, category, timezone, owner_id)
                                   └── 1:N ──▶ public.time_slots (business_id, title, starts_at, status)
```

### How Row Level Security (RLS) Protects Each Tenant

- Every table (`profiles`, `businesses`, `business_members`, `time_slots`) has `ENABLE ROW LEVEL SECURITY`.
- Helper functions `public.is_business_member(business_id)` and `public.has_business_role(business_id, roles)` run with `SECURITY DEFINER` and `SET search_path = public` so policies check membership cleanly without infinite recursion.
- A user logged into Business A **cannot** read, insert, update, or delete rows belonging to Business B — even if they inspect browser requests and swap a `business_id`.
