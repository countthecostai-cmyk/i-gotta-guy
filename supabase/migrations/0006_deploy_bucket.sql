insert into storage.buckets (id, name, public, file_size_limit)
values ('deploy-artifacts', 'deploy-artifacts', true, 52428800)
on conflict (id) do nothing;

create policy "deploy_artifacts_public_read" on storage.objects
  for select using (bucket_id = 'deploy-artifacts');
