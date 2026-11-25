# SlotMate

**SlotMate** is a mobile-first Progressive Web App (PWA) built with Next.js App Router, TypeScript, and Tailwind CSS for organizing time slots and appointments.

This repository currently contains **Milestone 1 (Foundation)**. Backend persistence and Supabase integration are intentionally postponed to Milestone 2.

## Key Features (Milestone 1)

- **Next.js App Router + TypeScript**: Strict TypeScript configuration with typed route params (`LayoutProps`, `PageProps`).
- **Tailwind CSS Mobile-First UI**: Touch-friendly bottom tab navigation on mobile screens and a responsive multi-column layout on larger screens.
- **Multi-Language Support (`it` default)**:
  - **Italian (`it`)** — Default language (`/it`)
  - **English (`en`)** — `/en`
  - **Arabic (`ar`)** — `/ar` with automatic right-to-left (`dir="rtl"`) layout
  - **Spanish (`es`)** — `/es`
- **PWA Foundation**:
  - Web App Manifest at `/manifest.webmanifest` (`src/app/manifest.ts`)
  - Custom app icons in `public/icons/` (`192x192`, `512x512`, `apple-touch-icon`, and `icon.svg`)
  - Service Worker registration (`public/sw.js`) and security headers in `next.config.ts`
  - Online/offline status indicator and install prompt support

## Project Structure

```text
SlotMate/
├── public/
│   ├── icons/                # PWA icons (PNG + SVG)
│   └── sw.js                 # Service Worker for offline shell & caching
├── src/
│   ├── app/
│   │   ├── [lang]/
│   │   │   ├── layout.tsx    # Locale root layout (lang, dir, localized metadata)
│   │   │   └── page.tsx      # Localized home page
│   │   ├── globals.css       # Tailwind CSS v4 styles
│   │   └── manifest.ts       # Next.js Web App Manifest
│   ├── components/
│   │   ├── LanguageSwitcher.tsx
│   │   ├── PwaFoundationCard.tsx
│   │   └── SlotMateShell.tsx
│   ├── i18n/
│   │   ├── dictionaries/     # it.json, en.json, ar.json, es.json
│   │   ├── config.ts         # Supported locales & direction helpers
│   │   └── get-dictionary.ts # Server-only typed dictionary loader
│   └── proxy.ts              # Redirects / to default Italian locale (/it) or saved cookie
├── CHANGELOG.md
├── PROJECT_STATUS.md
├── SETUP_GUIDE.md
└── next.config.ts
```

## Quick Commands

```bash
npm install
npm run dev
npx tsc --noEmit
npm run lint
npm run build
```

For beginner-friendly step-by-step instructions, see [SETUP_GUIDE.md](./SETUP_GUIDE.md).
