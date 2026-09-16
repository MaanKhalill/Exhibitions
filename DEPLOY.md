# Deploying (get your test link)

This is a static Vite build (`dist/`). Any static host works; configs for the two
easiest are already in the repo (`netlify.toml`, `vercel.json`).

You only need to set two environment variables (Supabase dashboard →
Project Settings → API):

```
VITE_SUPABASE_URL=https://hotqhqitdqbaljlrwyfv.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_VyKVx3sxfmtmJEABXH6Urw_5EFTDm9J
```

(The publishable key is safe in a client app — row-level security protects the
data.)

## Option A — Vercel (fastest with Git)

1. Go to https://vercel.com/new and import the GitHub repo `MaanKhalill/Exhibitions`.
2. **Production branch:** set it to `claude/canton-fair-trip-app-zn1lr3`
   (Settings → Git), since the work lives on that branch.
3. Add the two environment variables above.
4. Deploy. You get a link like `https://exhibitions-xxx.vercel.app`.
   Every push to the branch redeploys automatically — new phases appear on their own.

## Option B — Netlify (Git)

1. https://app.netlify.com → Add new site → Import from GitHub → `MaanKhalill/Exhibitions`.
2. Build command `npm run build`, publish directory `dist` (auto-detected from `netlify.toml`).
3. Site settings → Build & deploy → set the branch to `claude/canton-fair-trip-app-zn1lr3`.
4. Site settings → Environment variables → add the two variables above.
5. Deploy → you get a `https://xxx.netlify.app` link.

## Real email sending (your own SMTP mailbox)

The **"Send email now"** button on an invitation sends from your own mailbox via
the `send-email` Edge Function. Add these as **Edge Function secrets** in Supabase
(Dashboard → Project → **Edge Functions → Manage secrets**, or
`supabase secrets set KEY=value`):

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USERNAME=you@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=you@gmail.com
```

- **Gmail/Google Workspace:** turn on 2‑Step Verification, then create an
  **App Password** (Google Account → Security → App passwords) and use that as
  `SMTP_PASSWORD` — your normal password will not work. Host `smtp.gmail.com`,
  port `465`.
- **Outlook/Office365:** `smtp.office365.com`, port `587`.
- Other hosts: use their SMTP host/port (port `465` = implicit TLS).

The function only ever sends to the email stored on an invitation you own, so it
can't be used to send to arbitrary addresses.

## WhatsApp

The WhatsApp buttons open WhatsApp on your phone with the full bilingual message
pre‑filled — you tap send, so it goes from your own number. (Fully automated
WhatsApp sending is only possible via the paid WhatsApp Business API, not a
personal number.)

## First sign-in

The app uses email + password. On first run, tap **Create an account**, then sign
in. If sign-up seems to need email confirmation, turn it off in Supabase:
Authentication → Providers → Email → disable "Confirm email".
