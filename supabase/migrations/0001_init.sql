-- I Gotta Guy — core marketplace schema
-- Money is always stored as integer cents. Never use floating point for currency.

create extension if not exists "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

create type user_role as enum ('customer', 'guy', 'admin');

create type guy_status as enum ('pending', 'approved', 'rejected', 'suspended');

create type pricing_model as enum ('flat', 'hourly', 'quantity', 'sqft', 'quote');

create type job_status as enum (
  'REQUESTED',
  'MATCHING',
  'QUOTED',
  'ACCEPTED',
  'SCHEDULED',
  'EN_ROUTE',
  'ARRIVED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'DECLINED',
  'EXPIRED',
  'DISPUTED',
  'REFUNDED',
  'PAYOUT_PENDING',
  'PAYOUT_COMPLETED'
);

create type payment_status as enum ('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded');

create type payout_status as enum ('pending', 'in_transit', 'paid', 'failed');

create type transaction_type as enum (
  'charge', 'platform_fee', 'provider_payout', 'tip', 'refund',
  'discount', 'tax', 'processor_fee', 'adjustment'
);

create type ledger_account as enum ('customer', 'platform', 'provider');

-- ============================================================================
-- PROFILES (1:1 with auth.users)
-- ============================================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'customer',
  full_name text not null default '',
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table profiles is 'One row per auth user. Role drives authorization everywhere.';

-- ============================================================================
-- GUY (PROVIDER) PROFILES
-- ============================================================================

create table guy_profiles (
  id uuid primary key references profiles(id) on delete cascade,
  status guy_status not null default 'pending',
  bio text default '',
  years_experience int,
  identity_verified boolean not null default false,
  background_check_status text not null default 'none', -- none | pending | passed | failed
  stripe_connect_account_id text,
  stripe_payouts_enabled boolean not null default false,
  is_available boolean not null default true, -- provider-controlled pause toggle
  avg_rating numeric(3,2),
  rating_count int not null default 0,
  completed_jobs_count int not null default 0,
  applied_at timestamptz not null default now(),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- ADDRESSES
-- ============================================================================

create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  label text default 'Home',
  line1 text not null,
  line2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  lat double precision,
  lng double precision,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index addresses_user_id_idx on addresses(user_id);

-- Provider service areas: simple radius-from-point model, expandable later.
create table guy_service_areas (
  id uuid primary key default gen_random_uuid(),
  guy_id uuid not null references guy_profiles(id) on delete cascade,
  center_lat double precision not null,
  center_lng double precision not null,
  radius_miles numeric(5,1) not null default 15,
  postal_code text,
  city text,
  state text,
  created_at timestamptz not null default now()
);

create index guy_service_areas_guy_id_idx on guy_service_areas(guy_id);

create table guy_availability (
  id uuid primary key default gen_random_uuid(),
  guy_id uuid not null references guy_profiles(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6), -- 0 = Sunday
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  unique (guy_id, day_of_week, start_time, end_time)
);

-- ============================================================================
-- SERVICE CATALOG (data-driven — never hard-code categories in the frontend)
-- ============================================================================

create table service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text default '',
  icon text default '',
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references service_categories(id) on delete restrict,
  name text not null,
  slug text not null unique,
  short_description text default '',
  description text default '',
  pricing_model pricing_model not null default 'flat',
  base_price_cents int not null default 0,
  min_price_cents int not null default 0,
  unit_label text, -- e.g. 'per hour', 'per sq ft', 'per item'
  request_fields jsonb not null default '[]'::jsonb, -- dynamic form schema for this service
  image_url text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index services_category_id_idx on services(category_id);

create table service_addons (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services(id) on delete cascade,
  name text not null,
  price_cents int not null default 0,
  active boolean not null default true,
  sort_order int not null default 0
);

create index service_addons_service_id_idx on service_addons(service_id);

-- Which services a Guy offers, with optional custom pricing overrides.
create table guy_services (
  guy_id uuid not null references guy_profiles(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  custom_base_price_cents int,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (guy_id, service_id)
);

-- ============================================================================
-- PRICING / FEE RULES (centralized business rules — never scattered in UI)
-- ============================================================================

create table platform_fee_rules (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references services(id) on delete cascade, -- null = global default
  fee_type text not null default 'percent', -- percent | flat
  fee_value numeric(8,2) not null default 15.00, -- 15.00 = 15% if percent, or cents if flat
  min_fee_cents int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table promotions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text default '',
  discount_type text not null default 'percent', -- percent | flat
  discount_value numeric(8,2) not null default 0,
  max_uses int,
  used_count int not null default 0,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- JOBS
-- ============================================================================

create table jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles(id) on delete restrict,
  service_id uuid not null references services(id) on delete restrict,
  guy_id uuid references guy_profiles(id) on delete set null,
  address_id uuid not null references addresses(id) on delete restrict,
  -- Denormalized, low-precision location shown to guys browsing open jobs
  -- before they accept. Full street address lives only in `addresses`,
  -- which is RLS-restricted to the owner + assigned guy + admin.
  city text not null,
  state text not null,
  postal_code text not null,

  status job_status not null default 'REQUESTED',

  description text default '',
  details jsonb not null default '{}'::jsonb, -- answers to the service's dynamic request_fields
  addon_ids uuid[] not null default '{}',
  quantity numeric(10,2), -- e.g. sq ft, hours, item count depending on pricing_model

  requested_at timestamptz not null default now(),
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  is_asap boolean not null default false,

  -- pricing snapshot at time of request/acceptance — the source of truth for this job
  service_amount_cents int not null default 0,
  addon_amount_cents int not null default 0,
  discount_cents int not null default 0,
  tax_cents int not null default 0,
  platform_fee_cents int not null default 0,
  tip_cents int not null default 0,
  total_cents int not null default 0, -- what the customer pays: service+addon-discount+tax+platform_fee (+tip added post-completion)

  promotion_id uuid references promotions(id) on delete set null,

  cancelled_by uuid references profiles(id),
  cancellation_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index jobs_customer_id_idx on jobs(customer_id);
create index jobs_guy_id_idx on jobs(guy_id);
create index jobs_status_idx on jobs(status);
create index jobs_service_id_idx on jobs(service_id);

create table job_status_history (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  status job_status not null,
  changed_by uuid references profiles(id),
  note text,
  created_at timestamptz not null default now()
);

create index job_status_history_job_id_idx on job_status_history(job_id);

create table job_photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  url text not null,
  stage text not null default 'request', -- request | before | after
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index job_photos_job_id_idx on job_photos(job_id);

-- Custom quotes for pricing_model = 'quote' services
create table quotes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  guy_id uuid not null references guy_profiles(id) on delete cascade,
  amount_cents int not null,
  note text default '',
  status text not null default 'pending', -- pending | accepted | declined | expired
  created_at timestamptz not null default now()
);

create index quotes_job_id_idx on quotes(job_id);

-- ============================================================================
-- PAYMENTS & LEDGER
-- Every financial fact is a transaction row. Payments track the customer-facing
-- charge; provider_payouts tracks money leaving the platform to a Guy.
-- Platform revenue = sum(platform_fee) - sum(refunded platform_fee) - processor fees it absorbs.
-- ============================================================================

create table payments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete restrict,
  customer_id uuid not null references profiles(id) on delete restrict,
  amount_cents int not null, -- gross amount charged to customer (service+addon-discount+tax+platform_fee+tip)
  currency text not null default 'usd',
  status payment_status not null default 'pending',
  processor text not null default 'stripe',
  processor_payment_intent_id text,
  processor_fee_cents int not null default 0,
  refunded_cents int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_job_id_idx on payments(job_id);
create index payments_customer_id_idx on payments(customer_id);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete restrict,
  payment_id uuid references payments(id) on delete set null,
  type transaction_type not null,
  account ledger_account not null,
  amount_cents int not null, -- always positive; direction implied by type/account
  description text default '',
  created_at timestamptz not null default now()
);

create index transactions_job_id_idx on transactions(job_id);
create index transactions_type_idx on transactions(type);

create table provider_payouts (
  id uuid primary key default gen_random_uuid(),
  guy_id uuid not null references guy_profiles(id) on delete restrict,
  job_id uuid not null references jobs(id) on delete restrict,
  amount_cents int not null,
  status payout_status not null default 'pending',
  processor_transfer_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index provider_payouts_guy_id_idx on provider_payouts(guy_id);
create index provider_payouts_job_id_idx on provider_payouts(job_id);

-- ============================================================================
-- REVIEWS
-- ============================================================================

create table reviews (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  target_id uuid not null references profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text default '',
  created_at timestamptz not null default now(),
  unique (job_id, author_id)
);

create index reviews_target_id_idx on reviews(target_id);

-- ============================================================================
-- MESSAGING (job-scoped)
-- ============================================================================

create table messages (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index messages_job_id_idx on messages(job_id);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text default '',
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on notifications(user_id, read_at);

-- ============================================================================
-- SUPPORT
-- ============================================================================

create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  job_id uuid references jobs(id) on delete set null,
  subject text not null,
  body text not null,
  status text not null default 'open', -- open | in_progress | resolved | closed
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index support_tickets_user_id_idx on support_tickets(user_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on profiles for each row execute function set_updated_at();
create trigger set_updated_at before update on guy_profiles for each row execute function set_updated_at();
create trigger set_updated_at before update on services for each row execute function set_updated_at();
create trigger set_updated_at before update on jobs for each row execute function set_updated_at();
create trigger set_updated_at before update on payments for each row execute function set_updated_at();
create trigger set_updated_at before update on support_tickets for each row execute function set_updated_at();

-- Auto-create a profile row when a new auth user signs up.
create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'customer')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Log every job status change automatically.
create or replace function log_job_status_change() returns trigger as $$
begin
  if (tg_op = 'INSERT') or (old.status is distinct from new.status) then
    insert into job_status_history (job_id, status, changed_by, note)
    values (new.id, new.status, null, null);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger job_status_change_trigger
  after insert or update of status on jobs
  for each row execute function log_job_status_change();
