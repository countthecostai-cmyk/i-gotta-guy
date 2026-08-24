-- Distinguishes a job's primary service-charge payment row from any
-- separate tip-charge payment row (addTip() inserts its own payments row
-- so tip processor fees/refund-ability are tracked independently). Without
-- this, admin refund tooling picked "most recent payment" or an
-- unqualified "the succeeded payment" for a job — which silently broke
-- (or refunded the wrong charge) for any job with a tip, since a tipped
-- job has two 'succeeded' rows.
alter table payments add column if not exists kind text not null default 'charge' check (kind in ('charge', 'tip'));

update payments p
set kind = 'tip'
where exists (
  select 1 from transactions t
  where t.job_id = p.job_id and t.type = 'tip' and t.account = 'customer' and t.amount_cents = p.amount_cents
);
