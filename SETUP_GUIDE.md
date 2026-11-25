# SlotMate — Beginner-Friendly Setup Guide

This guide walks you through running **SlotMate** on your computer and verifying everything works.

## 1. Prerequisites

Make sure you have **Node.js** (version 20 or newer) and **npm** installed. You can check in your terminal:

```bash
node -v
npm -v
```

## 2. Install Dependencies

Inside the `SlotMate` folder, run:

```bash
npm install
```

## 3. Run the App Locally

Start the development server:

```bash
npm run dev
```

Then open your browser and visit:
- **http://localhost:3000** — Automatically redirects to Italian (`/it`), the default language.
- **http://localhost:3000/en** — English
- **http://localhost:3000/ar** — Arabic (switches page layout to Right-to-Left)
- **http://localhost:3000/es** — Spanish

## 4. Validate TypeScript & Build

To check that all TypeScript types are valid without starting the server:

```bash
npx tsc --noEmit
```

To verify the production build compiles cleanly:

```bash
npm run build
```

## 5. Checking the PWA Foundation

1. Open **http://localhost:3000/manifest.webmanifest** in your browser to see the generated Web App Manifest JSON.
2. In your browser Developer Tools (**Application** tab in Chrome/Edge), check:
   - **Manifest**: Shows `SlotMate` name, theme color, and icons.
   - **Service Workers**: Shows `/sw.js` registered and active.

> **Note:** Supabase is intentionally not connected in Milestone 1. The time slots shown in the UI are local demo data for previewing the mobile-first layout.
