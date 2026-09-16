-- Canton Fair Companion — initial schema
-- Suppliers and their products, scoped per authenticated user via RLS.
--
-- All objects are prefixed `cf_` so the app can live safely inside a shared
-- Supabase project without colliding with anything else in it.

create extension if not exists pgcrypto;

-- updated_at helper (namespaced to avoid clobbering other apps' functions)
create or replace function public.cf_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---- suppliers ----
create table if not exists public.cf_suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company_name text not null default '',
  hall text not null default '',
  booth text not null default '',
  category text not null default '',
  contact_name text not null default '',
  phone text not null default '',
  wechat text not null default '',
  email text not null default '',
  website text not null default '',
  rating int not null default 0 check (rating between 0 and 5),
  status text not null default 'new'
    check (status in ('new', 'quote', 'sample', 'ordered', 'skip')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cf_suppliers_user_idx on public.cf_suppliers (user_id);

drop trigger if exists cf_suppliers_updated_at on public.cf_suppliers;
create trigger cf_suppliers_updated_at
  before update on public.cf_suppliers
  for each row execute function public.cf_set_updated_at();

-- ---- products ----
create table if not exists public.cf_products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.cf_suppliers (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null default '',
  model text not null default '',
  moq text not null default '',
  unit_price text not null default '',
  currency text not null default 'USD',
  notes text not null default '',
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cf_products_supplier_idx on public.cf_products (supplier_id);
create index if not exists cf_products_user_idx on public.cf_products (user_id);

drop trigger if exists cf_products_updated_at on public.cf_products;
create trigger cf_products_updated_at
  before update on public.cf_products
  for each row execute function public.cf_set_updated_at();

-- ---- row level security ----
alter table public.cf_suppliers enable row level security;
alter table public.cf_products enable row level security;

drop policy if exists "cf own suppliers" on public.cf_suppliers;
create policy "cf own suppliers" on public.cf_suppliers
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "cf own products" on public.cf_products;
create policy "cf own products" on public.cf_products
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
