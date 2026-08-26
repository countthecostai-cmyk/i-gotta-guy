create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security invoker set search_path = public;

create or replace function log_job_status_change() returns trigger as $$
begin
  if (tg_op = 'INSERT') or (old.status is distinct from new.status) then
    insert into job_status_history (job_id, status, changed_by, note)
    values (new.id, new.status, null, null);
  end if;
  return new;
end;
$$ language plpgsql security invoker set search_path = public;
