-- Job photos bucket: public read (URLs are shared via job_photos.url), authenticated write.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('job-photos', 'job-photos', true, 10485760, array['image/png','image/jpeg','image/jpg','image/webp','image/heic'])
on conflict (id) do nothing;

create policy "job_photos_public_read" on storage.objects
  for select using (bucket_id = 'job-photos');

create policy "job_photos_authenticated_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'job-photos');

create policy "job_photos_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'job-photos' and owner = auth.uid());

create policy "job_photos_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'job-photos' and owner = auth.uid());

-- Avatars bucket: public read, owner write.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/png','image/jpeg','image/jpg','image/webp'])
on conflict (id) do nothing;

create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_authenticated_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars');

create policy "avatars_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid());
