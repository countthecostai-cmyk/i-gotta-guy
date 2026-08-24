-- Distinguishes a job's completion payout from a separate tip payout row
-- (a job can legitimately have both). Without this, a naive unique
-- constraint on provider_payouts(job_id) to prevent double-paying a
-- completion payout would also incorrectly block tip payouts.
alter table provider_payouts add column if not exists type text not null default 'completion' check (type in ('completion', 'tip'));

-- Backfill the one pre-existing tip-payout row (identified by amount —
-- the only $10.00 payout among rows that predate this column).
update provider_payouts set type = 'tip' where id = '3162f048-8c63-4650-8c7a-24567cd47f43';

-- Hard backstop: at most one *completion* payout per job. Partial index
-- (not a plain unique constraint) so legitimate multiple tip-payout rows
-- per job remain allowed.
create unique index if not exists provider_payouts_one_completion_per_job
  on provider_payouts (job_id)
  where type = 'completion';
