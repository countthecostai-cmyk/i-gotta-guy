-- Multi-offer negotiation: quotes becomes an append-only event log per
-- (job_id, guy_id) thread. The latest row for a given (job_id, guy_id) pair
-- is that thread's current state. proposed_by tracks who is proposing the
-- amount_cents on that row.
alter table quotes add column proposed_by text not null default 'guy';
alter table quotes add constraint quotes_proposed_by_check check (proposed_by in ('guy','customer'));
alter table quotes add constraint quotes_status_check check (status in ('pending','accepted','declined','expired','withdrawn'));

-- Fast "latest row per (job, guy)" lookups for offer-comparison UI.
create index quotes_job_guy_created_idx on quotes(job_id, guy_id, created_at desc);
