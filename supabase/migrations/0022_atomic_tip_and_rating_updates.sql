-- Two lost-update races found during a production-hardening pass:
--
-- 1. addTip() (src/lib/actions/jobs.ts) read jobs.tip_cents/total_cents once
--    at the top of the action, then wrote back `oldValue + newTip` at the
--    end. Two tips on the same job close enough together (two tabs, a
--    retry) both charge correctly, but the second write clobbers whatever
--    the first write added — the job's own tip_cents/total_cents silently
--    drift from the real ledger (transactions stays correct; the
--    denormalized job totals customers/admins actually read do not).
--
-- 2. submitReview() (src/lib/actions/reviews.ts) recomputed a Guy's
--    avg_rating/rating_count by reading all reviews, averaging in Node, and
--    writing the result back — two reviews landing close together can race
--    the same way.
--
-- Both are now single atomic UPDATE statements run inside Postgres, so
-- concurrent calls can't interleave a stale read with a write.

create or replace function increment_job_tip(p_job_id uuid, p_amount_cents integer)
returns jobs
language sql
security definer
set search_path = public
as $$
  update jobs
  set tip_cents = tip_cents + p_amount_cents,
      total_cents = total_cents + p_amount_cents
  where id = p_job_id
  returning *;
$$;

revoke all on function increment_job_tip(uuid, integer) from public;
grant execute on function increment_job_tip(uuid, integer) to service_role;

create or replace function recompute_guy_rating(p_guy_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update guy_profiles
  set avg_rating = agg.avg_rating,
      rating_count = agg.rating_count
  from (
    select avg(rating)::numeric(3,2) as avg_rating, count(*) as rating_count
    from reviews
    where target_id = p_guy_id
  ) agg
  where guy_profiles.id = p_guy_id;
$$;

revoke all on function recompute_guy_rating(uuid) from public;
grant execute on function recompute_guy_rating(uuid) to service_role;
