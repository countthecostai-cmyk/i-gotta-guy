-- Row Level Security. Every table holding user data is locked down here.
-- Rule of thumb: customers see only their own rows, guys see their own rows
-- plus the open job pool for services they offer, admins see everything.
-- The Next.js server also enforces authorization independently — RLS is the
-- last line of defense, not the only one.

create or replace function is_admin() returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql stable security definer set search_path = public;

create or replace function is_approved_guy(check_id uuid) returns boolean as $$
  select exists (
    select 1 from guy_profiles where id = check_id and status = 'approved'
  );
$$ language sql stable security definer set search_path = public;

-- ---------------------------------------------------------------- profiles
alter table profiles enable row level security;

create policy "profiles_select_self_or_admin" on profiles
  for select using (id = auth.uid() or is_admin());

create policy "profiles_update_self" on profiles
  for update using (id = auth.uid() or is_admin());

create policy "profiles_insert_self" on profiles
  for insert with check (id = auth.uid());

-- Public, minimal view of approved guys for browsing/reviews (no phone, no email).
create view public_guy_profiles
  with (security_invoker = false) as
  select
    p.id,
    p.full_name,
    p.avatar_url,
    gp.bio,
    gp.avg_rating,
    gp.rating_count,
    gp.completed_jobs_count,
    gp.identity_verified,
    gp.background_check_status,
    gp.years_experience
  from guy_profiles gp
  join profiles p on p.id = gp.id
  where gp.status = 'approved';

grant select on public_guy_profiles to authenticated, anon;

-- ------------------------------------------------------------ guy_profiles
alter table guy_profiles enable row level security;

create policy "guy_profiles_select" on guy_profiles
  for select using (
    id = auth.uid() or is_admin() or status = 'approved'
  );

create policy "guy_profiles_insert_self" on guy_profiles
  for insert with check (id = auth.uid());

create policy "guy_profiles_update_self_or_admin" on guy_profiles
  for update using (id = auth.uid() or is_admin());

-- ---------------------------------------------------------------- addresses
alter table addresses enable row level security;

create policy "addresses_select_owner_or_admin" on addresses
  for select using (user_id = auth.uid() or is_admin());

create policy "addresses_insert_owner" on addresses
  for insert with check (user_id = auth.uid());

create policy "addresses_update_owner_or_admin" on addresses
  for update using (user_id = auth.uid() or is_admin());

create policy "addresses_delete_owner_or_admin" on addresses
  for delete using (user_id = auth.uid() or is_admin());

-- ---------------------------------------------------------- guy_service_areas
alter table guy_service_areas enable row level security;

create policy "guy_service_areas_select" on guy_service_areas
  for select using (true); -- non-sensitive: radius + rough center, needed for matching UI

create policy "guy_service_areas_write_owner" on guy_service_areas
  for all using (guy_id = auth.uid() or is_admin())
  with check (guy_id = auth.uid() or is_admin());

-- ----------------------------------------------------------- guy_availability
alter table guy_availability enable row level security;

create policy "guy_availability_select" on guy_availability
  for select using (true);

create policy "guy_availability_write_owner" on guy_availability
  for all using (guy_id = auth.uid() or is_admin())
  with check (guy_id = auth.uid() or is_admin());

-- --------------------------------------------------------------- guy_services
alter table guy_services enable row level security;

create policy "guy_services_select" on guy_services
  for select using (true);

create policy "guy_services_write_owner" on guy_services
  for all using (guy_id = auth.uid() or is_admin())
  with check (guy_id = auth.uid() or is_admin());

-- ------------------------------------------------- service catalog (public read)
alter table service_categories enable row level security;
create policy "service_categories_select_active" on service_categories
  for select using (active or is_admin());
create policy "service_categories_write_admin" on service_categories
  for all using (is_admin()) with check (is_admin());

alter table services enable row level security;
create policy "services_select_active" on services
  for select using (active or is_admin());
create policy "services_write_admin" on services
  for all using (is_admin()) with check (is_admin());

alter table service_addons enable row level security;
create policy "service_addons_select_active" on service_addons
  for select using (active or is_admin());
create policy "service_addons_write_admin" on service_addons
  for all using (is_admin()) with check (is_admin());

alter table platform_fee_rules enable row level security;
create policy "platform_fee_rules_select" on platform_fee_rules
  for select using (true); -- fee transparency; no sensitive data
create policy "platform_fee_rules_write_admin" on platform_fee_rules
  for all using (is_admin()) with check (is_admin());

alter table promotions enable row level security;
create policy "promotions_select_active" on promotions
  for select using (active or is_admin());
create policy "promotions_write_admin" on promotions
  for all using (is_admin()) with check (is_admin());

-- -------------------------------------------------------------------- jobs
alter table jobs enable row level security;

create policy "jobs_select" on jobs
  for select using (
    customer_id = auth.uid()
    or guy_id = auth.uid()
    or is_admin()
    or (
      status = 'MATCHING' and guy_id is null
      and is_approved_guy(auth.uid())
      and exists (
        select 1 from guy_services gs
        where gs.guy_id = auth.uid() and gs.service_id = jobs.service_id and gs.active
      )
    )
  );

create policy "jobs_insert_customer" on jobs
  for insert with check (customer_id = auth.uid());

create policy "jobs_update" on jobs
  for update using (
    customer_id = auth.uid() or guy_id = auth.uid() or is_admin()
    or (
      status = 'MATCHING' and guy_id is null and is_approved_guy(auth.uid())
      and exists (
        select 1 from guy_services gs
        where gs.guy_id = auth.uid() and gs.service_id = jobs.service_id and gs.active
      )
    )
  );

-- ------------------------------------------------------------ job_status_history
alter table job_status_history enable row level security;

create policy "job_status_history_select" on job_status_history
  for select using (
    is_admin() or exists (
      select 1 from jobs j where j.id = job_status_history.job_id
      and (j.customer_id = auth.uid() or j.guy_id = auth.uid())
    )
  );

create policy "job_status_history_insert" on job_status_history
  for insert with check (
    is_admin() or exists (
      select 1 from jobs j where j.id = job_status_history.job_id
      and (j.customer_id = auth.uid() or j.guy_id = auth.uid())
    )
  );

-- ------------------------------------------------------------------ job_photos
alter table job_photos enable row level security;

create policy "job_photos_select" on job_photos
  for select using (
    is_admin() or exists (
      select 1 from jobs j where j.id = job_photos.job_id
      and (j.customer_id = auth.uid() or j.guy_id = auth.uid())
    )
  );

create policy "job_photos_insert" on job_photos
  for insert with check (
    uploaded_by = auth.uid() and exists (
      select 1 from jobs j where j.id = job_photos.job_id
      and (j.customer_id = auth.uid() or j.guy_id = auth.uid())
    )
  );

-- ----------------------------------------------------------------------- quotes
alter table quotes enable row level security;

create policy "quotes_select" on quotes
  for select using (
    guy_id = auth.uid() or is_admin() or exists (
      select 1 from jobs j where j.id = quotes.job_id and j.customer_id = auth.uid()
    )
  );

create policy "quotes_insert_guy" on quotes
  for insert with check (guy_id = auth.uid());

create policy "quotes_update" on quotes
  for update using (
    guy_id = auth.uid() or is_admin() or exists (
      select 1 from jobs j where j.id = quotes.job_id and j.customer_id = auth.uid()
    )
  );

-- --------------------------------------------------------------------- payments
alter table payments enable row level security;

create policy "payments_select" on payments
  for select using (
    customer_id = auth.uid() or is_admin() or exists (
      select 1 from jobs j where j.id = payments.job_id and j.guy_id = auth.uid()
    )
  );
-- Inserts/updates to payments happen only via the server using the service role key.

-- ----------------------------------------------------------------- transactions
alter table transactions enable row level security;

create policy "transactions_select" on transactions
  for select using (
    is_admin() or exists (
      select 1 from jobs j where j.id = transactions.job_id
      and (j.customer_id = auth.uid() or j.guy_id = auth.uid())
    )
  );
-- Written only by the server (service role) to guarantee ledger integrity.

-- ------------------------------------------------------------- provider_payouts
alter table provider_payouts enable row level security;

create policy "provider_payouts_select" on provider_payouts
  for select using (guy_id = auth.uid() or is_admin());
-- Written only by the server (service role).

-- ----------------------------------------------------------------------- reviews
alter table reviews enable row level security;

create policy "reviews_select_all" on reviews
  for select using (true); -- reviews are public, like any marketplace

create policy "reviews_insert_participant" on reviews
  for insert with check (
    author_id = auth.uid() and exists (
      select 1 from jobs j where j.id = reviews.job_id
      and j.status = 'COMPLETED'
      and (j.customer_id = auth.uid() or j.guy_id = auth.uid())
      and (target_id = j.customer_id or target_id = j.guy_id)
      and target_id != auth.uid()
    )
  );

-- ---------------------------------------------------------------------- messages
alter table messages enable row level security;

create policy "messages_select_participant" on messages
  for select using (sender_id = auth.uid() or recipient_id = auth.uid() or is_admin());

create policy "messages_insert_participant" on messages
  for insert with check (
    sender_id = auth.uid() and exists (
      select 1 from jobs j where j.id = messages.job_id
      and (j.customer_id = auth.uid() or j.guy_id = auth.uid())
      and (recipient_id = j.customer_id or recipient_id = j.guy_id)
    )
  );

create policy "messages_update_read_receipt" on messages
  for update using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- ------------------------------------------------------------------ notifications
alter table notifications enable row level security;

create policy "notifications_select_self" on notifications
  for select using (user_id = auth.uid() or is_admin());

create policy "notifications_update_self" on notifications
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());
-- Inserted only by the server (service role) — clients never author notifications for others.

-- --------------------------------------------------------------- support_tickets
alter table support_tickets enable row level security;

create policy "support_tickets_select" on support_tickets
  for select using (user_id = auth.uid() or is_admin());

create policy "support_tickets_insert_self" on support_tickets
  for insert with check (user_id = auth.uid());

create policy "support_tickets_update" on support_tickets
  for update using (user_id = auth.uid() or is_admin());
