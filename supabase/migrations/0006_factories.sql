-- Phase 5-6: factory locations & visit logistics (one per supplier).
create table if not exists public.ex_factories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  supplier_id uuid not null unique references public.ex_suppliers (id) on delete cascade,
  city text not null default '',
  province text not null default '',
  district text not null default '',
  address text not null default '',
  lat double precision,
  lng double precision,
  map_link text not null default '',
  nearest_airport text not null default '',
  nearest_rail text not null default '',
  transfer_air_min int,
  transfer_rail_min int,
  door_rail_min int,
  door_air_min int,
  door_car_min int,
  best_mode text not null default '',
  verified text not null default 'needs' check (verified in ('verified','needs')),
  visit_possible text not null default 'tbc' check (visit_possible in ('yes','no','tbc')),
  meeting_datetime timestamptz,
  meeting_fixed boolean not null default false,
  duration_min int not null default 120,
  working_hours text not null default '',
  weekend text not null default '',
  contact_name text not null default '',
  contact_phone text not null default '',
  priority text not null default 'tbd' check (priority in ('must','worth','optional','tbd')),
  plan_day date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ex_factories_user_idx on public.ex_factories (user_id);
create index if not exists ex_factories_supplier_idx on public.ex_factories (supplier_id);

drop trigger if exists ex_factories_updated_at on public.ex_factories;
create trigger ex_factories_updated_at before update on public.ex_factories
  for each row execute function public.ex_set_updated_at();

alter table public.ex_factories enable row level security;
drop policy if exists "ex own factories" on public.ex_factories;
create policy "ex own factories" on public.ex_factories for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
