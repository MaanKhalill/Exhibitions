# 🌏 Exhibition Supplier Intelligence

A permanent, **multi-exhibition** supplier-intelligence and trip-optimization
platform. Exhibitions are temporary operating workspaces; **suppliers, contacts,
factories, media and relationship history are permanent global entities**. The
value grows with every exhibition you attend rather than ending when a trip is
over.

First workspace: **Canton Fair · Autumn 2026** (Guangzhou, 14–28 Oct 2026).

Built for real conditions on the ground: patchy hall Wi-Fi and blocked foreign
apps, so capture is designed to be fast, one-handed and offline-tolerant.

---

## Status — Phase 1 (Foundation) ✅

The platform is delivered in phases (see the roadmap below). **Phase 1 is
built:**

- **Multi-exhibition workspaces** — create, edit, and switch between exhibitions
  from a persistent switcher; full workspace details (venue, fair/trip dates,
  arrival/departure city, hotel, status).
- **Canton Fair Autumn 2026 onboarding** — one tap to create the first workspace,
  prefilled with the trip dates (stored as data, never hardcoded logic).
- **Global supplier directory** — permanent supplier master records with
  free-text products (no forced categories), searchable across all exhibitions.
- **Global contacts** linked to suppliers.
- **Participations** — a supplier's exhibition-specific data (hall, booth, parsed
  booth string, priority, meeting, visit status, evaluation, rating, factory
  candidate). **One supplier ↔ many exhibitions; history is never overwritten.**
- **Fast add + duplicate detection** — “Possible existing supplier found” matches
  by name, domain, phone and WeChat; you choose *Link* or *Create new* (never
  auto-merged).
- **Home dashboard** with live counts, and a full navigation surface (upcoming
  phases are shown as *Soon*).
- **Installable PWA** with offline app shell.

Later phases (Invitations & public forms, live capture & scanning, booth route
planner, factory map & route optimization, global search, calendar, follow-ups,
analytics) are stubbed in the navigation and backed by the same data model.

## Architecture

- **Exhibition** = a temporary workspace (`ex_exhibitions`).
- **Supplier** = a permanent global master record (`ex_suppliers`).
- **Contact** = a permanent person linked to a supplier (`ex_contacts`).
- **Participation** = one supplier at one exhibition (`ex_participations`,
  unique per `exhibition × supplier`) holding all exhibition-specific data.

Everything is scoped to the signed-in admin by Postgres **row-level security**.

## Tech stack

- **React + TypeScript + Vite**, **React Router**, **TanStack Query**
- **vite-plugin-pwa** (installable, offline app shell)
- **Supabase** — Postgres, Auth (email + password), Storage (`ex-media`)

## Setup

All database objects are prefixed `ex_` (tables, function, policies) and use an
`ex-media` bucket, so the platform can live safely inside a shared Supabase
project without touching anything else in it.

1. In the [Supabase dashboard](https://supabase.com/dashboard), pick a project.
2. In the **SQL Editor**, run the migrations in order:
   - [`supabase/migrations/0001_foundation.sql`](supabase/migrations/0001_foundation.sql)
   - [`supabase/migrations/0002_storage.sql`](supabase/migrations/0002_storage.sql)
3. (Optional) **Authentication → Providers → Email**: turn off “Confirm email” to
   sign in without a confirmation step (project-wide — only on a project you own).

Then configure the app (Supabase dashboard → **Project Settings → API**):

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://YOUR-ref.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-publishable-or-anon-key
```

Run it:

```bash
npm install
npm run dev       # local development
npm run build     # production build in dist/
npm run preview   # preview the production build
```

Open the dev URL on your phone (same network) or deploy `dist/` to any static
host, then **Add to Home Screen**.

## Roadmap

| Phase | Scope | State |
| ----- | ----- | ----- |
| 1 | Multi-exhibition foundation, global suppliers/contacts/participations | ✅ Built |
| 2 | Invitations & bilingual public supplier forms, WhatsApp/email, reminders | Planned |
| 3 | Live capture & media: card/QR/barcode scan, photos, catalogues, offline queue | Planned |
| 4 | Booth route planner: proximity routing, fixed/flexible meetings, Today view | Planned |
| 5–6 | Factory map, city clustering, intercity transport optimization, departure safety | Planned |
| 7–8 | Global search & timeline, Google Calendar, follow-ups, analytics | Planned |

## Design principles (from the brief)

- One supplier = one permanent global identity, even across many exhibitions.
- Historical exhibition data is never overwritten.
- Products are free text — no predefined category taxonomy.
- Nothing hardcoded: suppliers, products, cities and future exhibitions are all
  created from the UI.
- Capture favours speed and one-handed use; planning stays manually editable.
