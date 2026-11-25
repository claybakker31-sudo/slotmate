# Changelog

All notable changes to **SlotMate** are documented in this file.

## [0.1.0] - 2026-11-25 — Milestone 1 (Foundation)

### Added
- Initialized Next.js App Router project with TypeScript and Tailwind CSS.
- Added localized routing under `src/app/[lang]/` and Next.js `src/proxy.ts` redirecting `/` to Italian (`/it`) by default (or the user's selected locale cookie).
- Added typed translation dictionaries for Italian (`it`), English (`en`), Arabic (`ar` with `rtl` direction), and Spanish (`es`).
- Built mobile-first UI (`SlotMateShell`) with interactive local demo time slots, responsive desktop grid, and mobile bottom navigation.
- Added Language Switcher (`LanguageSwitcher`) with cookie persistence.
- Added PWA foundation: `src/app/manifest.ts`, `public/sw.js`, PNG/SVG icons in `public/icons/`, `PwaFoundationCard`, and security headers in `next.config.ts`.
- Added project documentation: `README.md`, `CHANGELOG.md`, `PROJECT_STATUS.md`, and `SETUP_GUIDE.md`.
