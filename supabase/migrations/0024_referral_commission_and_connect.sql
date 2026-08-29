-- CTC referral commission: when Andre personally refers a customer to a
-- Guy, the customer enters the code "CTC" at job-completion-confirmation
-- time. That triggers a 10% commission taken OUT OF the job amount (a true
-- split of money already collected), as opposed to the standard platform
-- fee, which is a surcharge added on top of what the customer pays. These
-- are deliberately different mechanisms — see calculateReferralSplit() in
-- src/lib/domain/pricing.ts vs calculateProviderPayout().

alter type transaction_type add value if not exists 'referral_commission';

alter table jobs add column if not exists referral_code text;
alter table jobs add column if not exists referral_commission_cents int not null default 0;

comment on column jobs.referral_code is 'Code the customer entered at completion confirmation (e.g. "CTC"). Null for ordinary jobs.';
comment on column jobs.referral_commission_cents is 'Commission taken out of the provider payout for a referred job (0 for ordinary jobs).';
