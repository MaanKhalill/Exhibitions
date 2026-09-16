-- Multi-Exhibition Supplier Intelligence platform — foundation schema.
-- Exhibitions are temporary workspaces; suppliers/contacts are permanent global
-- entities. Participations hold exhibition-specific data and are never
-- overwritten across exhibitions. All objects prefixed `ex_`, RLS per user, so
-- the platform is safe to add to a shared Supabase project.

create extension if not exists pgcrypto;

create or replace function public.ex_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- exhibitions (workspaces) ----------
create table if not exists public.ex_exhibitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null default '',
  edition text not null default '',
  year int,
  country text not null default '',
  city text not null default '',
  venue text not null default '',
  website text not null default '',
  opening_hours text not null default '',
  start_date date,
  end_date date,
  trip_start date,
  trip_end date,
  arrival_city text not null default '',
  departure_city text not null default '',
  hotel text not null default '',
  notes text not null default '',
  status text not null default 'planning'
    check (status in ('planning','upcoming','active','factory_visit','completed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ex_exhibitions_user_idx on public.ex_exhibitions (user_id);

drop trigger if exists ex_exhibitions_updated_at on public.ex_exhibitions;
create trigger ex_exhibitions_updated_at before update on public.ex_exhibitions
  for each row execute function public.ex_set_updated_at();

-- ---------- suppliers (global master) ----------
create table if not exists public.ex_suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company_name text not null default '',
  aliases text not null default '',
  website text not null default '',
  domain text not null default '',
  country text not null default '',
  city text not null default '',
  address text not null default '',
  phone text not null default '',
  wechat text not null default '',
  email text not null default '',
  product_summary text not null default '',
  notes text not null default '',
  first_met_exhibition_id uuid references public.ex_exhibitions (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ex_suppliers_user_idx on public.ex_suppliers (user_id);
create index if not exists ex_suppliers_domain_idx on public.ex_suppliers (domain);
create index if not exists ex_suppliers_company_idx on public.ex_suppliers (lower(company_name));

drop trigger if exists ex_suppliers_updated_at on public.ex_suppliers;
create trigger ex_suppliers_updated_at before update on public.ex_suppliers
  for each row execute function public.ex_set_updated_at();

-- ---------- contacts (people linked to a supplier) ----------
create table if not exists public.ex_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  supplier_id uuid not null references public.ex_suppliers (id) on delete cascade,
  name text not null default '',
  position text not null default '',
  phone text not null default '',
  wechat text not null default '',
  email text not null default '',
  business_card_path text,
  notes text not null default '',
  first_met_exhibition_id uuid references public.ex_exhibitions (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ex_contacts_user_idx on public.ex_contacts (user_id);
create index if not exists ex_contacts_supplier_idx on public.ex_contacts (supplier_id);

drop trigger if exists ex_contacts_updated_at on public.ex_contacts;
create trigger ex_contacts_updated_at before update on public.ex_contacts
  for each row execute function public.ex_set_updated_at();

-- ---------- participations (supplier × exhibition) ----------
create table if not exists public.ex_participations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exhibition_id uuid not null references public.ex_exhibitions (id) on delete cascade,
  supplier_id uuid not null references public.ex_suppliers (id) on delete cascade,
  hall text not null default '',
  floor text not null default '',
  area text not null default '',
  booth text not null default '',
  booth_raw text not null default '',
  booth_section text not null default '',
  booth_number text not null default '',
  booth_contact_name text not null default '',
  booth_contact_phone text not null default '',
  products_shown text not null default '',
  priority text not null default 'tbd' check (priority in ('must','worth','optional','tbd')),
  preferred_meeting timestamptz,
  confirmed_meeting timestamptz,
  meeting_fixed boolean not null default false,
  expected_duration_min int not null default 20,
  visit_status text not null default 'planned'
    check (visit_status in ('planned','confirmed','on_the_way','arrived','in_progress','completed','skipped','rescheduled','cancelled')),
  interest_level text check (interest_level in ('high','medium','low','review')),
  follow_up text not null default '',
  rating int not null default 0 check (rating between 0 and 5),
  factory_candidate boolean not null default false,
  notes text not null default '',
  discovered_onsite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exhibition_id, supplier_id)
);
create index if not exists ex_participations_user_idx on public.ex_participations (user_id);
create index if not exists ex_participations_exhibition_idx on public.ex_participations (exhibition_id);
create index if not exists ex_participations_supplier_idx on public.ex_participations (supplier_id);

drop trigger if exists ex_participations_updated_at on public.ex_participations;
create trigger ex_participations_updated_at before update on public.ex_participations
  for each row execute function public.ex_set_updated_at();

-- ---------- row level security ----------
alter table public.ex_exhibitions enable row level security;
alter table public.ex_suppliers enable row level security;
alter table public.ex_contacts enable row level security;
alter table public.ex_participations enable row level security;

drop policy if exists "ex own exhibitions" on public.ex_exhibitions;
create policy "ex own exhibitions" on public.ex_exhibitions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "ex own suppliers" on public.ex_suppliers;
create policy "ex own suppliers" on public.ex_suppliers for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "ex own contacts" on public.ex_contacts;
create policy "ex own contacts" on public.ex_contacts for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "ex own participations" on public.ex_participations;
create policy "ex own participations" on public.ex_participations for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
