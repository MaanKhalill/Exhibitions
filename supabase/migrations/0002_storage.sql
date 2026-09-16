-- Private media bucket for the platform (business cards, product/booth photos,
-- catalogues, documents). Objects live under a folder named after the user id,
-- and RLS restricts each user to their own folder. Prefixed `ex-`/`ex ` so it is
-- safe to add to a shared Supabase project.

insert into storage.buckets (id, name, public)
values ('ex-media', 'ex-media', false)
on conflict (id) do nothing;

drop policy if exists "ex own media read" on storage.objects;
create policy "ex own media read" on storage.objects for select to authenticated
  using (bucket_id = 'ex-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "ex own media insert" on storage.objects;
create policy "ex own media insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'ex-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "ex own media update" on storage.objects;
create policy "ex own media update" on storage.objects for update to authenticated
  using (bucket_id = 'ex-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "ex own media delete" on storage.objects;
create policy "ex own media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'ex-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
