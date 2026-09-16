-- Private storage bucket for product photos.
-- Objects live under a folder named after the user's id, and RLS restricts
-- each user to their own folder. Bucket + policies are prefixed `cf-`/`cf `
-- so they are safe to add to a shared Supabase project.

insert into storage.buckets (id, name, public)
values ('cf-photos', 'cf-photos', false)
on conflict (id) do nothing;

drop policy if exists "cf own photos read" on storage.objects;
create policy "cf own photos read" on storage.objects
  for select to authenticated
  using (bucket_id = 'cf-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "cf own photos insert" on storage.objects;
create policy "cf own photos insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'cf-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "cf own photos update" on storage.objects;
create policy "cf own photos update" on storage.objects
  for update to authenticated
  using (bucket_id = 'cf-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "cf own photos delete" on storage.objects;
create policy "cf own photos delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'cf-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
