-- Per-user SMTP settings so each user sends from their OWN mailbox.
-- The password is write-only for the client: authenticated users can insert/
-- update it but never SELECT it back (defense in depth). A generated
-- password_set flag lets the UI show "configured" without reading the secret.
-- The send-email Edge Function reads the password via the service role.
create table if not exists public.ex_email_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  host text not null default '',
  port int not null default 465,
  username text not null default '',
  password text not null default '',
  from_email text not null default '',
  from_name text not null default '',
  secure boolean not null default true,
  password_set boolean generated always as (length(password) > 0) stored,
  updated_at timestamptz not null default now()
);

alter table public.ex_email_settings enable row level security;
drop policy if exists "own email settings" on public.ex_email_settings;
create policy "own email settings" on public.ex_email_settings for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Never expose this table to anonymous callers.
revoke all on public.ex_email_settings from anon;

-- A table-level SELECT grant overrides a column-level revoke, so restrict SELECT
-- to the non-secret columns only. The client can still INSERT/UPDATE the
-- password (write-only); only the service role can read it back.
revoke select on public.ex_email_settings from authenticated;
grant select (user_id, host, port, username, from_email, from_name, secure, password_set, updated_at)
  on public.ex_email_settings to authenticated;
