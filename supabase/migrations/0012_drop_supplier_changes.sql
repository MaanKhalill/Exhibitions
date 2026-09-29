-- Change history is no longer kept or saved: the app shows only the latest
-- contact/supplier details. Drop the change-history table and its data.
-- (The invitation-submit function no longer records changes.)
drop table if exists public.ex_supplier_changes cascade;
