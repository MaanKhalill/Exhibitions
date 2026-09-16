-- App owner's profile (one per user): shown on the supplier form and used to
-- sign WhatsApp/email messages.
create table if not exists public.ex_profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  owner_name text not null default '',
  company_name text not null default '',
  address text not null default '',
  email text not null default '',
  whatsapp text not null default '',
  wechat text not null default '',
  phone text not null default '',
  country text not null default '',
  website text not null default '',
  bio text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists ex_profiles_updated_at on public.ex_profiles;
create trigger ex_profiles_updated_at before update on public.ex_profiles
  for each row execute function public.ex_set_updated_at();

alter table public.ex_profiles enable row level security;
drop policy if exists "ex own profile" on public.ex_profiles;
create policy "ex own profile" on public.ex_profiles for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
