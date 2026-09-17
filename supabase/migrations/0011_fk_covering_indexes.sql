-- Covering indexes for foreign keys flagged by the performance linter, so
-- joins and ON DELETE cascades stay fast as data grows.
create index if not exists ex_contacts_first_met_idx on public.ex_contacts (first_met_exhibition_id);
create index if not exists ex_invitation_events_user_idx on public.ex_invitation_events (user_id);
create index if not exists ex_invitations_supplier_idx on public.ex_invitations (supplier_id);
create index if not exists ex_media_exhibition_idx on public.ex_media (exhibition_id);
create index if not exists ex_supplier_changes_invitation_idx on public.ex_supplier_changes (invitation_id);
create index if not exists ex_suppliers_first_met_idx on public.ex_suppliers (first_met_exhibition_id);
