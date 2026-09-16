-- Canton Fair Companion — initial schema
-- Suppliers and their products, scoped per authenticated user via RLS.

create extension if not exists pgcrypto;

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---- suppliers ----
create table if not exists public.suppliers (
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

create index if not exists suppliers_user_idx on public.suppliers (user_id);

drop trigger if exists suppliers_updated_at on public.suppliers;
create trigger suppliers_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

-- ---- products ----
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
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

create index if not exists products_supplier_idx on public.products (supplier_id);
create index if not exists products_user_idx on public.products (user_id);

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ---- row level security ----
alter table public.suppliers enable row level security;
alter table public.products enable row level security;

drop policy if exists "own suppliers" on public.suppliers;
create policy "own suppliers" on public.suppliers
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own products" on public.products;
create policy "own products" on public.products
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
