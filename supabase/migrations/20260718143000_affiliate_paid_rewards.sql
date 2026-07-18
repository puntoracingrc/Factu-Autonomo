-- Paid affiliate rewards: attribution is free, rewards require a verified Stripe payment.

begin;

alter table public.referral_redemptions
  add column if not exists program text not null default 'affiliate';

do $$
begin
  alter table public.referral_redemptions
    add constraint referral_redemptions_program_check
    check (program in ('affiliate', 'partner'));
exception
  when duplicate_object then null;
end $$;

-- Existing referrals owned by an active Partner belong to the Partner program.
update public.referral_redemptions redemption
   set program = 'partner'
 where exists (
   select 1
     from public.partner_accounts partner
    where partner.user_id = redemption.referrer_user_id
      and partner.status = 'active'
 );

create index if not exists referral_redemptions_referrer_program_idx
  on public.referral_redemptions (referrer_user_id, program, created_at desc);

create table if not exists public.affiliate_reward_entries (
  id uuid primary key default gen_random_uuid(),
  referral_redemption_id uuid not null
    references public.referral_redemptions (id) on delete restrict,
  referrer_user_id uuid not null references auth.users (id) on delete restrict,
  referee_user_id uuid not null references auth.users (id) on delete restrict,
  stripe_event_id text not null unique,
  stripe_invoice_id text not null unique,
  stripe_subscription_id text not null,
  stripe_customer_id text not null,
  source_plan text not null check (source_plan in ('pro', 'pro_plus')),
  source_amount_cents integer not null check (source_amount_cents >= 199),
  currency text not null check (currency = 'eur'),
  billing_reason text not null
    check (billing_reason in ('subscription_create', 'subscription_cycle')),
  scan_credits_per_user integer not null check (scan_credits_per_user > 0),
  paid_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint affiliate_reward_no_self check (referrer_user_id <> referee_user_id),
  constraint affiliate_reward_event_length check (
    char_length(stripe_event_id) between 3 and 255
  ),
  constraint affiliate_reward_invoice_length check (
    char_length(stripe_invoice_id) between 3 and 255
  ),
  constraint affiliate_reward_subscription_length check (
    char_length(stripe_subscription_id) between 3 and 255
  ),
  constraint affiliate_reward_customer_length check (
    char_length(stripe_customer_id) between 3 and 255
  )
);

create index if not exists affiliate_reward_referrer_paid_idx
  on public.affiliate_reward_entries (referrer_user_id, paid_at desc);

create index if not exists affiliate_reward_referee_paid_idx
  on public.affiliate_reward_entries (referee_user_id, paid_at desc);

alter table public.affiliate_reward_entries enable row level security;
revoke all on table public.affiliate_reward_entries from public, anon, authenticated;
grant all on table public.affiliate_reward_entries to service_role;

create or replace function public.grant_paid_affiliate_reward(
  p_referee_user_id uuid,
  p_stripe_event_id text,
  p_stripe_invoice_id text,
  p_stripe_subscription_id text,
  p_stripe_customer_id text,
  p_source_plan text,
  p_source_amount_cents integer,
  p_currency text,
  p_billing_reason text,
  p_paid_at timestamptz,
  p_scan_credits integer default 5,
  p_units_per_scan integer default 10
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_redemption public.referral_redemptions%rowtype;
  v_existing public.affiliate_reward_entries%rowtype;
  v_updated integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'grant_paid_affiliate_reward requires service_role'
      using errcode = '42501';
  end if;

  if p_referee_user_id is null
    or p_stripe_event_id is null
    or char_length(p_stripe_event_id) not between 3 and 255
    or p_stripe_invoice_id is null
    or char_length(p_stripe_invoice_id) not between 3 and 255
    or p_stripe_subscription_id is null
    or char_length(p_stripe_subscription_id) not between 3 and 255
    or p_stripe_customer_id is null
    or char_length(p_stripe_customer_id) not between 3 and 255
    or p_source_plan not in ('pro', 'pro_plus')
    or p_source_amount_cents < 199
    or p_currency <> 'eur'
    or p_billing_reason not in ('subscription_create', 'subscription_cycle')
    or p_paid_at is null
    or p_scan_credits <= 0
    or p_units_per_scan <= 0
  then
    return 'not_eligible';
  end if;

  select *
    into v_redemption
    from public.referral_redemptions
   where referee_user_id = p_referee_user_id
     and program = 'affiliate'
   for update;

  if not found then
    return 'not_attributed';
  end if;

  -- The paid subscription row is server-owned and must match the signed invoice.
  perform 1
    from public.user_subscriptions
   where user_id = p_referee_user_id
     and stripe_subscription_id = p_stripe_subscription_id
     and stripe_customer_id = p_stripe_customer_id
     and plan = p_source_plan
     and status = 'active'
     and stripe_customer_id is not null
     and (current_period_end is null or current_period_end >= p_paid_at);

  if not found then
    return 'not_eligible';
  end if;

  select *
    into v_existing
    from public.affiliate_reward_entries
   where stripe_invoice_id = p_stripe_invoice_id
      or stripe_event_id = p_stripe_event_id
   limit 1;

  if found then
    if v_existing.referee_user_id <> p_referee_user_id
      or v_existing.referrer_user_id <> v_redemption.referrer_user_id
      or v_existing.stripe_invoice_id <> p_stripe_invoice_id
      or v_existing.stripe_event_id <> p_stripe_event_id
      or v_existing.stripe_subscription_id <> p_stripe_subscription_id
      or v_existing.stripe_customer_id <> p_stripe_customer_id
      or v_existing.source_plan <> p_source_plan
      or v_existing.source_amount_cents <> p_source_amount_cents
      or v_existing.currency <> p_currency
      or v_existing.billing_reason <> p_billing_reason
      or v_existing.scan_credits_per_user <> p_scan_credits
    then
      raise exception 'affiliate reward identity conflict'
        using errcode = '23514';
    end if;
    return 'already_applied';
  end if;

  insert into public.affiliate_reward_entries (
    referral_redemption_id,
    referrer_user_id,
    referee_user_id,
    stripe_event_id,
    stripe_invoice_id,
    stripe_subscription_id,
    stripe_customer_id,
    source_plan,
    source_amount_cents,
    currency,
    billing_reason,
    scan_credits_per_user,
    paid_at
  ) values (
    v_redemption.id,
    v_redemption.referrer_user_id,
    v_redemption.referee_user_id,
    p_stripe_event_id,
    p_stripe_invoice_id,
    p_stripe_subscription_id,
    p_stripe_customer_id,
    p_source_plan,
    p_source_amount_cents,
    p_currency,
    p_billing_reason,
    p_scan_credits,
    p_paid_at
  );

  insert into public.user_subscriptions (user_id, plan, status)
  values (v_redemption.referrer_user_id, 'free', 'inactive')
  on conflict (user_id) do nothing;

  update public.user_subscriptions
     set scan_trial_remaining = scan_trial_remaining + case
           when (
             (plan in ('pro', 'pro_plus') and status = 'active'
               and (current_period_end is null or current_period_end >= p_paid_at))
             or (plan = 'trial' and status = 'trialing'
               and trial_ends_at is not null and trial_ends_at >= p_paid_at)
           ) then 0 else p_scan_credits end,
         scan_credits = scan_credits + case
           when (
             (plan in ('pro', 'pro_plus') and status = 'active'
               and (current_period_end is null or current_period_end >= p_paid_at))
             or (plan = 'trial' and status = 'trialing'
               and trial_ends_at is not null and trial_ends_at >= p_paid_at)
           ) then p_scan_credits else 0 end,
         ai_credit_units = ai_credit_units + case
           when (
             (plan in ('pro', 'pro_plus') and status = 'active'
               and (current_period_end is null or current_period_end >= p_paid_at))
             or (plan = 'trial' and status = 'trialing'
               and trial_ends_at is not null and trial_ends_at >= p_paid_at)
           ) then p_scan_credits * p_units_per_scan else 0 end,
         updated_at = now()
   where user_id in (v_redemption.referrer_user_id, v_redemption.referee_user_id);

  get diagnostics v_updated = row_count;
  if v_updated <> 2 then
    raise exception 'affiliate reward recipients unavailable'
      using errcode = 'P0001';
  end if;

  return 'applied';
end;
$$;

revoke all on function public.grant_paid_affiliate_reward(
  uuid, text, text, text, text, text, integer, text, text, timestamptz, integer, integer
) from public, anon, authenticated;

grant execute on function public.grant_paid_affiliate_reward(
  uuid, text, text, text, text, text, integer, text, text, timestamptz, integer, integer
) to service_role;

comment on table public.affiliate_reward_entries is
  'Private append-only ledger. One affiliate reward per verified eligible Stripe invoice.';

notify pgrst, 'reload schema';

commit;
