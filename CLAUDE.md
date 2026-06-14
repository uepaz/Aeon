# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ This is NOT the Next.js you know

This project uses **Next.js 16 + React 19**, which have breaking changes from older versions — APIs, conventions, and file structure may all differ from your training data. **Read the relevant guide in `node_modules/next/dist/docs/` before writing any code, and heed deprecation notices.** (See also `AGENTS.md`.)

Notable already-applied conventions in this codebase:
- `cookies()`, `params`, and `createClient()` are **async** — always `await` them.
- Auth/data clients are created per-request, not as module singletons.

## Commands

```bash
npm run dev      # Start dev server (Turbopack) at localhost:3000
npm run build    # Production build
npm run start    # Serve the production build
npm run lint     # ESLint (eslint-config-next, core-web-vitals + typescript)

npx drizzle-kit generate   # Generate a migration from src/lib/db/schema.ts
npx drizzle-kit push       # Push schema to the database
```

There is **no test runner configured** in this project. The product spec (`../docs/Aeon技术栈.csv`) emphasizes manual multi-device testing of Supabase RLS before shipping.

## What this app is

**Aeon** — a personal/couple memory journal (MVP, built to ship in ~2 days). Core features: text+photo records, a reverse-chronological timeline with search/date filters, a month calendar highlighting days with records, a stats dashboard (days-together / record count / photo count), a virtualized photo gallery, and a PC-focused `/admin` panel. UI and all comments are in **Chinese**.

Product/tech requirements live in `../docs/` (`Aeon初级需求.csv`, `Aeon技术栈.csv`, `plan/`). Read these for feature intent and the agreed-upon technical decisions.

## Architecture

**Stack:** Next.js 16 App Router · React 19 · Supabase (Auth + Postgres + Storage + Realtime) · Drizzle ORM · Tailwind v4 · shadcn/ui (`base-nova` style, Base UI primitives) · TanStack Query/Virtual · Zod + react-hook-form.

### The Drizzle ↔ Supabase split (important)

Drizzle is used **only for schema definition and migrations** (`src/lib/db/schema.ts`, `drizzle.config.ts`). **All runtime data access — both reads and writes — goes through the Supabase JS client, not Drizzle queries.** (The tech-stack doc describes "Drizzle queries," but the actual implementation uses Supabase.) Consequences:

- Queries use **snake_case** DB column names (`user_id`, `record_date`, `storage_path`), while the Drizzle schema/TS types use camelCase. When writing `supabase.from(...)` calls, use snake_case.
- Row-level security (RLS) is the security boundary — every query/action also filters by `user_id` explicitly. Treat correct RLS as critical.

### Three Supabase clients — pick the right one

- `src/lib/supabase/server.ts` — `createClient()` (async): Server Components, Server Actions, route handlers.
- `src/lib/supabase/client.ts` — browser client: Client Components and realtime.
- `src/lib/supabase/middleware.ts` — used by `src/middleware.ts` to refresh the session and gate routes.

### Auth & routing

`src/middleware.ts` protects everything except `/login` and `/register` (redirects unauthenticated users to `/login`, and logged-in users away from auth pages). The matcher excludes static assets and images.

- Authenticated app pages live in the **`(dashboard)` route group** (`src/app/(dashboard)/...`) under a shared `layout.tsx` that renders `Sidebar` (desktop) + `BottomNav`/`MobileHeader` (mobile) and re-checks auth.
- `login/`, `register/`, `admin/`, and `auth/callback/route.ts` (OAuth code exchange) are top-level routes.
- Note: `src/app/dashboard/*` are **empty leftover directories** — the real pages are in `(dashboard)`. Don't add code there.

### Data flow pattern

- **Reads:** Server Components call query helpers in `src/lib/db/queries/*` (`timeline`, `calendar`, `gallery`, `statistics`), which use the server Supabase client.
- **Writes:** colocated Server Actions (`'use server'`) in each route's `actions.ts` (e.g. `src/app/(dashboard)/records/actions.ts`). Actions check auth, mutate via Supabase, and call `revalidatePath()` for each affected route.
- **Photos (Hybrid Storage):** By default, photos are stored using **hybrid mode** (Supabase database + MinIO files). Uploads compress client-side first (`browser-image-compression`); files are uploaded to MinIO, paths saved to Supabase `photos` table with `storage_type: 'minio'`. The `records.photo_count` column is kept in sync via Postgres RPCs `increment_photo_count` / `decrement_photo_count`. On DB-insert failure the uploaded files are rolled back from MinIO; on record delete the MinIO files are removed first.
- **Storage Configuration:** Storage mode is configured via `.env.local` (`NEXT_PUBLIC_STORAGE_TYPE=hybrid`). See `STORAGE_CONFIG.md` for details. Storage abstraction lives in `src/lib/storage/` with providers for Supabase, MinIO, and Hybrid.
- **Realtime:** `src/hooks/useRealtime.ts` subscribes to `postgres_changes` on `records`/`photos` and dispatches `window` CustomEvents (`records-updated`, `photos-updated`) that client components listen for to refetch.

### Path aliases

`@/*` → `src/*`, plus `@/components`, `@/lib`, `@/hooks`, `@/types`. shadcn aliases are configured in `components.json`.

### Schema (3 tables)

`user_settings` (anniversary date, two birthdays/names — drives the dashboard "days together"), `records` (title, content, `record_date`, JSONB `tags`, `photo_count`), `photos` (storage paths, FK to records with `onDelete: cascade`). New columns must also be applied to the live DB — see `MIGRATION_GUIDE.md` for the manual Supabase SQL Editor workflow.

## Environment

Requires `.env.local`: 
- **Supabase**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL` (Postgres connection string; uses transaction-pool mode so prepared statements are disabled in `src/lib/db/client.ts`).
- **Storage (Hybrid Mode)**: `NEXT_PUBLIC_STORAGE_TYPE=hybrid`, `NEXT_PUBLIC_MINIO_ENDPOINT`, `NEXT_PUBLIC_MINIO_PORT`, `NEXT_PUBLIC_MINIO_ACCESS_KEY`, `NEXT_PUBLIC_MINIO_SECRET_KEY`, `NEXT_PUBLIC_MINIO_BUCKET`. See `STORAGE_CONFIG.md` for setup instructions.
