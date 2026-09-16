-- Phase 4: assign a participation to a specific fair day for the route planner.
alter table public.ex_participations
  add column if not exists plan_day date;
create index if not exists ex_participations_plan_day_idx on public.ex_participations (plan_day);
