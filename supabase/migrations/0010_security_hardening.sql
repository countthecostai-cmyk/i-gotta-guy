-- Security hardening pass.
--
-- The app's own server actions were already careful (ownership-scoped
-- queries, admin-client for privileged writes), but several RLS UPDATE/
-- INSERT policies only had a USING clause and no WITH CHECK. USING alone
-- only restricts *which rows* a statement can touch — it does not restrict
-- *what values* can be written to them. Since the Supabase anon key is
-- public by design, any authenticated user could call the client SDK
-- directly (bypassing the Next.js app entirely) and write values these
-- policies never intended to allow — e.g. granting themselves admin,
-- self-approving as a Guy, or rewriting a job's price/status.
--
-- Fix strategy:
--   1. Trigger-based column locks on the handful of sensitive columns that
--      must only ever change via the app's trusted service-role path or an
--      admin — this is more robust than a WITH CHECK subquery (which has no
--      clean way to compare against the pre-update row).
--   2. WITH CHECK clauses added to every UPDATE/INSERT policy that was
--      missing one, matching the USING clause (defense-in-depth) or
--      tightened where the USING clause was already too broad.
--   3. handle_new_user() clamped so signup metadata can never grant admin.

-- ---------------------------------------------------------- profiles.role
-- The only legitimate non-admin, non-service-role path that changes
-- `role` is a customer self-applying to become a Guy (customer -> guy).
-- Every other role change (anything involving 'admin') must come from an
-- admin (is_admin()) or the app's service-role client (auth.uid() is null
-- for that connection, since the service key carries no user JWT `sub`).
create or replace function guard_profiles_role_change() returns trigger as $$
begin
  if new.role is distinct from old.role then
    if auth.uid() is null or is_admin() then
      return new; -- trusted service-role client, or an admin
    end if;
    if old.role = 'customer' and new.role = 'guy' then
      return new; -- customer applying to become a Guy (self-service)
    end if;
    raise exception 'Not authorized to change role.';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists guard_profiles_role_change on profiles;
create trigger guard_profiles_role_change
  before update on profiles
  for each row execute function guard_profiles_role_change();

-- ---------------------------------------------------- guy_profiles trust fields
-- Guys may freely edit bio/years_experience/is_available (self-service
-- profile fields). Everything that signals trust/verification/standing —
-- status, verification flags, payout eligibility, ratings, completed-job
-- count — must only change via an admin or the service-role client.
create or replace function guard_guy_profiles_trust_fields() returns trigger as $$
begin
  if auth.uid() is null or is_admin() then
    return new; -- trusted service-role client, or an admin
  end if;
  if new.status is distinct from old.status
    or new.identity_verified is distinct from old.identity_verified
    or new.background_check_status is distinct from old.background_check_status
    or new.stripe_payouts_enabled is distinct from old.stripe_payouts_enabled
    or new.stripe_connect_account_id is distinct from old.stripe_connect_account_id
    or new.avg_rating is distinct from old.avg_rating
    or new.rating_count is distinct from old.rating_count
    or new.completed_jobs_count is distinct from old.completed_jobs_count
    or new.approved_at is distinct from old.approved_at
  then
    raise exception 'Not authorized to change Guy trust/verification fields.';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists guard_guy_profiles_trust_fields on guy_profiles;
create trigger guard_guy_profiles_trust_fields
  before update on guy_profiles
  for each row execute function guard_guy_profiles_trust_fields();

-- ------------------------------------------------------------------- jobs
-- Every jobs.update() call in the app (accept, quote, status transitions,
-- cancel, settlement) already goes through the service-role admin client.
-- No legitimate app path updates jobs via the user-scoped client, so lock
-- status/assignment/pricing down to admin-or-service-role entirely.
create or replace function guard_jobs_protected_fields() returns trigger as $$
begin
  if auth.uid() is null or is_admin() then
    return new;
  end if;
  if new.status is distinct from old.status
    or new.guy_id is distinct from old.guy_id
    or new.service_amount_cents is distinct from old.service_amount_cents
    or new.addon_amount_cents is distinct from old.addon_amount_cents
    or new.discount_cents is distinct from old.discount_cents
    or new.tax_cents is distinct from old.tax_cents
    or new.platform_fee_cents is distinct from old.platform_fee_cents
    or new.tip_cents is distinct from old.tip_cents
    or new.total_cents is distinct from old.total_cents
    or new.promotion_id is distinct from old.promotion_id
    or new.customer_id is distinct from old.customer_id
  then
    raise exception 'Not authorized to change job status, assignment, or pricing directly.';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists guard_jobs_protected_fields on jobs;
create trigger guard_jobs_protected_fields
  before update on jobs
  for each row execute function guard_jobs_protected_fields();

-- ---------------------------------------------------- job_status_history
-- logStatus() in the app always inserts via the service-role client. No
-- legitimate app path needs a customer/guy to insert history rows
-- directly, so restrict this to admin-or-service-role to stop forged
-- audit-trail entries.
drop policy if exists "job_status_history_insert" on job_status_history;
create policy "job_status_history_insert" on job_status_history
  for insert with check (auth.uid() is null or is_admin());

-- ------------------------------------------------------------------ quotes
-- submitQuote() always inserts via the service-role client, and quotes are
-- never updated by app code — tighten both policies accordingly, and add
-- the same guy-approval + job-eligibility check `jobs_select` already uses
-- so a pending/rejected/suspended Guy can't insert quote rows at all.
drop policy if exists "quotes_insert_guy" on quotes;
create policy "quotes_insert_guy" on quotes
  for insert with check (
    auth.uid() is null or is_admin()
    or (
      guy_id = auth.uid() and is_approved_guy(auth.uid())
      and exists (
        select 1 from jobs j
        join guy_services gs on gs.guy_id = auth.uid() and gs.service_id = j.service_id and gs.active
        where j.id = quotes.job_id and j.status = 'MATCHING'
      )
    )
  );

drop policy if exists "quotes_update" on quotes;
create policy "quotes_update" on quotes
  for update using (is_admin())
  with check (auth.uid() is null or is_admin());

-- ------------------------------------------------------------ support_tickets
-- Ticket status is only ever changed by admin.ts via the service-role
-- client; users only insert tickets, never update status themselves.
drop policy if exists "support_tickets_update" on support_tickets;
create policy "support_tickets_update" on support_tickets
  for update using (is_admin())
  with check (auth.uid() is null or is_admin());

-- ------------------------------------------------------------- addresses
-- Genuinely self-service (line1/city/state/is_default etc.) — add a
-- matching WITH CHECK for defense-in-depth consistency; no column lock
-- needed since nothing here is a trust/financial field.
drop policy if exists "addresses_update_owner_or_admin" on addresses;
create policy "addresses_update_owner_or_admin" on addresses
  for update using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());

-- ---------------------------------------------------------- handle_new_user
-- Signup metadata (`options.data` on supabase.auth.signUp()) is fully
-- client-controlled — never honor a 'role' of anything other than
-- customer/guy from it, regardless of what the enum otherwise allows.
create or replace function handle_new_user() returns trigger as $$
declare
  requested_role text;
  safe_role user_role;
begin
  requested_role := new.raw_user_meta_data->>'role';
  if requested_role = 'guy' then
    safe_role := 'guy';
  else
    safe_role := 'customer';
  end if;

  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    safe_role
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;
