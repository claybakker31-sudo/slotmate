# Environment Variables Guide

SlotMate uses Next.js built-in environment variable support. During local development, secrets and project configuration live in a file named `.env.local` in the root of the repository (right next to `package.json`).

> `.env.local` is already listed in `.gitignore`, so your keys are never committed to Git.

---

## Required Variables (Free Supabase Tier)

| Variable | Required | Exposure | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Browser + Server | Identifies your Supabase project API endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Browser + Server | Public API key used by Supabase Auth and RLS-protected Postgres queries |
| `NEXT_PUBLIC_SITE_URL` | Optional | Browser + Server | Base URL used in confirmation emails (defaults to `http://localhost:3000` locally) |

---

## Where to Find These Values in Supabase

1. Sign in to the [Supabase Dashboard](https://supabase.com/dashboard) and select your project.
2. Open **Project Settings** (the gear icon in the bottom-left sidebar).
3. For **Project URL** (`NEXT_PUBLIC_SUPABASE_URL`):
   - Go to **Data API** (or **API** under Configuration) and copy **Project URL** (looks like `https://abcdefghijklmno.supabase.co`).
4. For **Anon / Public Key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`):
   - Go to **API Keys** (or **API** -> **Project API keys**) and copy the **anon / public** key (or the **Publishable** key if your project uses the newer API keys view).

---

## Security Notes (Why We Don't Ask for Service-Role Keys or DB Passwords)

- **No `SUPABASE_SERVICE_ROLE_KEY` needed**: SlotMate enforces multi-tenant isolation in Postgres using **Row Level Security (RLS)** and safe `SECURITY DEFINER` database functions. The `anon` key respects every RLS policy automatically.
- **No database password needed**: The Next.js app communicates over HTTPS with Supabase's Data API and Auth API, not via a direct Postgres TCP connection string.
- **Never prefix secret keys with `NEXT_PUBLIC_`**: In Next.js, any variable starting with `NEXT_PUBLIC_` is bundled into browser JavaScript. Only the Project URL and Anon/Public Key are safe to expose this way.

---

## Setup Steps

1. Copy `.env.example` to `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

   *(On Windows PowerShell: `Copy-Item .env.example .env.local`)*

2. Paste your **Project URL** and **Anon/Public Key** into `.env.local`.
3. Restart `npm run dev` so Next.js reloads the environment variables.
