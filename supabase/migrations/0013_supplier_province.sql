-- Structured supplier address: add a province/state field.
-- (city, country and the detailed street address already exist on ex_suppliers.)
alter table public.ex_suppliers add column if not exists province text not null default '';
