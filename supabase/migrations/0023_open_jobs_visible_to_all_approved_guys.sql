-- Andre: a Guy shouldn't have to toggle a service on before jobs for it
-- show up at all — every approved Guy should see every open job in the
-- matching pool. Which services a Guy has toggled on is now purely a
-- sorting preference (applied client-side in guy/jobs/page.tsx), not a
-- visibility gate. Guys still can't see jobs that are already claimed,
-- assigned to someone else, or not yet open (jobs_select's other branches
-- — customer_id/guy_id/is_admin — are unchanged).
--
-- acceptOpenJob() and submitQuote() previously re-enforced the same
-- guy_services eligibility check server-side (since they write through the
-- service-role client, which bypasses RLS) — that check is removed in the
-- same change (src/lib/actions/jobs.ts) so the two layers can't disagree.
drop policy if exists "jobs_select" on jobs;
create policy "jobs_select" on jobs
  for select using (
    customer_id = auth.uid()
    or guy_id = auth.uid()
    or is_admin()
    or (status = 'MATCHING' and guy_id is null and is_approved_guy(auth.uid()))
  );

drop policy if exists "jobs_update" on jobs;
create policy "jobs_update" on jobs
  for update using (
    customer_id = auth.uid() or guy_id = auth.uid() or is_admin()
    or (status = 'MATCHING' and guy_id is null and is_approved_guy(auth.uid()))
  );
