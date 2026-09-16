-- Invitation link expiry:
--   opened_at  — first time the supplier opened the link
--   ttl_hours  — validity window measured from first open (e.g. 48)
--   expires_at — absolute hard expiry (e.g. 24h from sending an update request)
alter table public.ex_invitations
  add column if not exists opened_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists ttl_hours int;
