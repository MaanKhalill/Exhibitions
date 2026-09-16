-- Change history: every time a supplier's stored field is overwritten by a new
-- submission, the old and new values are recorded here so nothing is ever lost.
create table if not exists public.ex_supplier_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  supplier_id uuid not null references public.ex_suppliers (id) on delete cascade,
  invitation_id uuid references public.ex_invitations (id) on delete set null,
  entity text not null default 'supplier',
  entity_label text not null default '',
  field text not null,
  old_value text not null default '',
  new_value text not null default '',
  source text not null default 'supplier_update',
  created_at timestamptz not null default now()
);
create index if not exists ex_supplier_changes_supplier_idx
  on public.ex_supplier_changes (supplier_id, created_at desc);
create index if not exists ex_supplier_changes_user_idx
  on public.ex_supplier_changes (user_id);

alter table public.ex_supplier_changes enable row level security;
drop policy if exists "ex own supplier changes" on public.ex_supplier_changes;
create policy "ex own supplier changes" on public.ex_supplier_changes for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
