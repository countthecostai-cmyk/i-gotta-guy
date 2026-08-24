-- Stripe redelivers webhook events on timeout or an ambiguous response,
-- and the webhook handler writes real ledger rows. This table backs an
-- insert-as-lock idempotency check: the handler inserts the event id
-- before processing, and a unique-violation on redelivery means the event
-- was already processed, so side effects are skipped.
create table if not exists processed_webhook_events (
  event_id text primary key,
  processor text not null default 'stripe',
  processed_at timestamptz not null default now()
);

alter table processed_webhook_events enable row level security;

create policy "processed_webhook_events_service_only" on processed_webhook_events
  for all using (auth.uid() is null) with check (auth.uid() is null);
