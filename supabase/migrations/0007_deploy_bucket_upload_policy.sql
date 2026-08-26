create policy "deploy_artifacts_anon_upload" on storage.objects
  for insert to anon
  with check (bucket_id = 'deploy-artifacts');
create policy "deploy_artifacts_anon_update" on storage.objects
  for update to anon
  using (bucket_id = 'deploy-artifacts');
