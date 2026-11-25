# SlotMate Supabase SQL Migrations

This folder contains the versioned SQL migration files for **SlotMate Milestone 2**. Everything uses **free Supabase services only** (Postgres + Row Level Security + Supabase Auth).

## Migration Order

Run the files in numerical order:

1. `migrations/0001_init_multi_tenant_schema.sql` — Creates `profiles`, `businesses`, `business_members`, `time_slots`, indexes, and `updated_at` triggers.
2. `migrations/0002_row_level_security.sql` — Enables Row Level Security (RLS) on every table and installs non-recursive `SECURITY DEFINER` membership/role helpers and tenant-isolation policies.
3. `migrations/0003_auth_and_business_registration_functions.sql` — Adds `public.register_business(...)` RPC and the `on_auth_user_created` trigger so new accounts automatically get a `profiles` row (and optional initial business workspace).

## How to Apply (Beginner-Friendly)

### Option A — Supabase Web Dashboard (No CLI required)

1. Open your free project in the [Supabase Dashboard](https://supabase.com/dashboard).
2. In the left sidebar, click **SQL Editor**.
3. Click **New query**, paste the contents of `0001_init_multi_tenant_schema.sql`, and click **Run**.
4. Repeat for `0002_row_level_security.sql` and `0003_auth_and_business_registration_functions.sql`.

### Option B — Supabase CLI (Optional)

If you use the Supabase CLI locally:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```
