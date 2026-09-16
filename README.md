# 🛍️ Canton Fair Companion

A phone-friendly, **offline-first** app for capturing everything you find at the
Canton Fair (or any large trade show): suppliers, booth numbers, contacts,
products, photos, prices and follow-up notes — all saved to **your own
database** so nothing gets lost and you can pull it up later on any device.

Built for real conditions on the ground in Guangzhou: the exhibition halls have
patchy Wi-Fi and many foreign apps are blocked, so the app works fully **with no
connection** and syncs automatically once you're back online.

## Features

- **Capture suppliers fast** — company, hall + booth number, category, contact,
  WeChat / phone / email / website, an interest rating and free notes.
- **Log products** under each supplier, with a **photo** (camera), model/SKU,
  MOQ, unit price and currency.
- **Follow-up status** — New · Quote requested · Sample requested · Ordered ·
  Not interested.
- **Search & filter** by company, booth, notes or category.
- **Works offline** — everything is written locally first and synced to your
  Supabase database when a connection is available. A status bar always shows
  whether your data is saved.
- **Export to CSV/Excel** — one tap to hand off to your team after the fair
  (UTF-8 with Chinese characters intact).
- **Installable** — add it to your home screen and it runs like a native app.
- **Private** — each account only sees its own data (enforced by row-level
  security in the database).

## Tech stack

- **React + TypeScript + Vite**
- **vite-plugin-pwa** (installable, offline app shell)
- **Supabase** — Postgres database, Auth (email + password) and Storage (photos)

## Setup

### 1. Create the Supabase project & schema

1. In the [Supabase dashboard](https://supabase.com/dashboard), create a project
   (e.g. **CantonFair**).
2. Open the **SQL Editor** and run the two migration files in order:
   - [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) —
     tables + row-level security.
   - [`supabase/migrations/0002_storage.sql`](supabase/migrations/0002_storage.sql)
     — private `photos` bucket + policies.
3. (Optional) Under **Authentication → Providers → Email**, turn off "Confirm
   email" if you want to sign in immediately without a confirmation step.

### 2. Configure the app

Copy `.env.example` to `.env` and fill in your project's values (Supabase
dashboard → **Project Settings → API**):

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://YOUR-ref.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-publishable-or-anon-key
```

The publishable/anon key is safe to ship in a client app — row-level security is
what actually protects your data.

### 3. Run it

```bash
npm install
npm run dev       # local development
npm run build     # production build in dist/
npm run preview   # preview the production build
```

Open the dev URL on your phone (same network) or deploy `dist/` to any static
host, then **Add to Home Screen**.

## How offline sync works

- Reads always come from a local cache, so the app is instant and usable with no
  signal.
- Every change (add/edit supplier or product, photo, delete) is written to the
  cache and queued in an **outbox**.
- Whenever you're online and signed in, the outbox is flushed to Supabase in
  order. New records get client-generated UUIDs, so an item created offline
  keeps the same id once it syncs.
- Photos captured offline are held (compressed) in the outbox and uploaded on
  the next sync.

## Data model

| Table       | Purpose                                              |
| ----------- | ---------------------------------------------------- |
| `suppliers` | One row per booth/company you visit.                 |
| `products`  | Products under a supplier (with a photo in Storage). |

Both are scoped to the signed-in user via row-level security.

## Roadmap ideas

- Currency converter (USD ⇄ CNY) and a running budget.
- Business-card photo → auto-fill contact fields.
- Map / hall notes and a visit plan.
- Team sharing (multiple people capturing into one workspace).
- Voice notes at the booth.
