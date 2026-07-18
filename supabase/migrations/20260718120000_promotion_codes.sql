begin;

alter table public.user_subscriptions
  add column if not exists promotional_plan text,
  add column if not exists promotional_plan_ends_at timestamptz;

alter table public.user_subscriptions
  drop constraint if exists user_subscriptions_promotional_plan_check;
alter table public.user_subscriptions
  add constraint user_subscriptions_promotional_plan_check
  check (promotional_plan is null or promotional_plan in ('pro', 'pro_plus'));

alter table public.user_subscriptions
  drop constraint if exists user_subscriptions_promotional_plan_pair_check;
alter table public.user_subscriptions
  add constraint user_subscriptions_promotional_plan_pair_check
  check ((promotional_plan is null) = (promotional_plan_ends_at is null));

create table if not exists public.promo_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 80),
  code_hash text not null unique check (code_hash ~ '^[a-f0-9]{64}$'),
  code_masked text not null check (char_length(code_masked) between 8 and 32),
  status text not null default 'active' check (status in ('active', 'paused')),
  benefit_kind text not null check (
    benefit_kind in ('ai_scans', 'plan_access', 'module_access')
  ),
  benefit_plan text check (benefit_plan in ('pro', 'pro_plus')),
  benefit_scan_credits integer check (benefit_scan_credits between 1 and 10000),
  benefit_duration_days integer check (benefit_duration_days between 1 and 365),
  benefit_module_key text check (
    benefit_module_key is null or benefit_module_key ~ '^[a-z0-9][a-z0-9_-]{1,62}$'
  ),
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  max_redemptions integer not null check (max_redemptions between 1 and 100000),
  redeemed_count integer not null default 0 check (redeemed_count >= 0),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promo_campaign_window_check check (expires_at > starts_at),
  constraint promo_campaign_redemption_count_check check (redeemed_count <= max_redemptions),
  constraint promo_campaign_benefit_shape_check check (
    (benefit_kind = 'ai_scans' and benefit_scan_credits is not null and benefit_plan is null and benefit_duration_days is null and benefit_module_key is null)
    or
    (benefit_kind = 'plan_access' and benefit_scan_credits is null and benefit_plan is not null and benefit_duration_days is not null and benefit_module_key is null)
    or
    (benefit_kind = 'module_access' and benefit_scan_credits is null and benefit_plan is null and benefit_duration_days is not null and benefit_module_key is not null)
  )
);

create index if not exists promo_campaigns_status_window_idx
  on public.promo_campaigns (status, starts_at, expires_at);

create table if not exists public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.promo_campaigns (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete restrict,
  benefit_snapshot jsonb not null,
  redeemed_at timestamptz not null default now(),
  unique (campaign_id, user_id)
);

create index if not exists promo_redemptions_user_idx
  on public.promo_redemptions (user_id, redeemed_at desc);

create table if not exists public.promo_module_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  module_key text not null check (module_key ~ '^[a-z0-9][a-z0-9_-]{1,62}$'),
  valid_until timestamptz not null,
  source_redemption_id uuid not null unique
    references public.promo_redemptions (id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (user_id, module_key)
);

alter table public.promo_campaigns enable row level security;
alter table public.promo_redemptions enable row level security;
alter table public.promo_module_entitlements enable row level security;

revoke all on table public.promo_campaigns from public, anon, authenticated;
revoke all on table public.promo_redemptions from public, anon, authenticated;
revoke all on table public.promo_module_entitlements from public, anon, authenticated;
grant all on table public.promo_campaigns to service_role;
grant all on table public.promo_redemptions to service_role;
grant all on table public.promo_module_entitlements to service_role;

create or replace function public.redeem_promo_code(
  p_user_id uuid,
  p_code_hash text,
  p_now timestamptz default now()
)
returns table (
  result_status text,
  campaign_name text,
  benefit_kind text,
  benefit_plan text,
  benefit_scan_credits integer,
  benefit_duration_days integer,
  benefit_module_key text,
  benefit_ends_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  campaign public.promo_campaigns%rowtype;
  subscription public.user_subscriptions%rowtype;
  redemption_id uuid;
  entitlement_end timestamptz;
begin
  if auth.role() <> 'service_role' then
    raise exception 'redeem_promo_code can only be executed by service_role'
      using errcode = '42501';
  end if;
  if p_user_id is null or p_code_hash !~ '^[a-f0-9]{64}$' then
    return query select 'invalid_code', null::text, null::text, null::text,
      null::integer, null::integer, null::text, null::timestamptz;
    return;
  end if;

  select * into campaign
  from public.promo_campaigns
  where code_hash = p_code_hash
  for update;
  if not found then
    return query select 'invalid_code', null::text, null::text, null::text,
      null::integer, null::integer, null::text, null::timestamptz;
    return;
  end if;
  if campaign.status <> 'active' then
    return query select 'inactive', campaign.name, campaign.benefit_kind,
      campaign.benefit_plan, campaign.benefit_scan_credits,
      campaign.benefit_duration_days, campaign.benefit_module_key, null::timestamptz;
    return;
  end if;
  if campaign.starts_at > p_now then
    return query select 'not_started', campaign.name, campaign.benefit_kind,
      campaign.benefit_plan, campaign.benefit_scan_credits,
      campaign.benefit_duration_days, campaign.benefit_module_key, null::timestamptz;
    return;
  end if;
  if campaign.expires_at <= p_now then
    return query select 'expired', campaign.name, campaign.benefit_kind,
      campaign.benefit_plan, campaign.benefit_scan_credits,
      campaign.benefit_duration_days, campaign.benefit_module_key, null::timestamptz;
    return;
  end if;
  if campaign.redeemed_count >= campaign.max_redemptions then
    return query select 'exhausted', campaign.name, campaign.benefit_kind,
      campaign.benefit_plan, campaign.benefit_scan_credits,
      campaign.benefit_duration_days, campaign.benefit_module_key, null::timestamptz;
    return;
  end if;
  if exists (
    select 1 from public.promo_redemptions
    where campaign_id = campaign.id and user_id = p_user_id
  ) then
    return query select 'already_redeemed', campaign.name, campaign.benefit_kind,
      campaign.benefit_plan, campaign.benefit_scan_credits,
      campaign.benefit_duration_days, campaign.benefit_module_key, null::timestamptz;
    return;
  end if;

  insert into public.user_subscriptions (user_id, plan, status)
  values (p_user_id, 'free', 'inactive')
  on conflict (user_id) do nothing;
  select * into subscription
  from public.user_subscriptions where user_id = p_user_id for update;

  if campaign.benefit_kind = 'plan_access' then
    if subscription.plan in ('pro', 'pro_plus')
       and subscription.status in ('active', 'trialing')
       and (subscription.current_period_end is null or subscription.current_period_end >= p_now) then
      return query select 'paid_plan_active', campaign.name, campaign.benefit_kind,
        campaign.benefit_plan, campaign.benefit_scan_credits,
        campaign.benefit_duration_days, campaign.benefit_module_key, null::timestamptz;
      return;
    end if;
    if subscription.promotional_plan is not null
       and subscription.promotional_plan_ends_at >= p_now then
      return query select 'promo_plan_active', campaign.name, campaign.benefit_kind,
        campaign.benefit_plan, campaign.benefit_scan_credits,
        campaign.benefit_duration_days, campaign.benefit_module_key,
        subscription.promotional_plan_ends_at;
      return;
    end if;
  end if;

  if campaign.benefit_kind = 'module_access' then
    return query select 'unsupported_module', campaign.name, campaign.benefit_kind,
      campaign.benefit_plan, campaign.benefit_scan_credits,
      campaign.benefit_duration_days, campaign.benefit_module_key, null::timestamptz;
    return;
  end if;

  entitlement_end := case
    when campaign.benefit_duration_days is null then null
    else p_now + make_interval(days => campaign.benefit_duration_days)
  end;

  insert into public.promo_redemptions (
    campaign_id, user_id, benefit_snapshot, redeemed_at
  ) values (
    campaign.id,
    p_user_id,
    jsonb_build_object(
      'kind', campaign.benefit_kind,
      'plan', campaign.benefit_plan,
      'scanCredits', campaign.benefit_scan_credits,
      'durationDays', campaign.benefit_duration_days,
      'moduleKey', campaign.benefit_module_key
    ),
    p_now
  ) returning id into redemption_id;

  if campaign.benefit_kind = 'ai_scans' then
    update public.user_subscriptions
    set scan_credits = scan_credits + campaign.benefit_scan_credits,
        ai_credit_units = ai_credit_units + (campaign.benefit_scan_credits * 10),
        updated_at = p_now
    where user_id = p_user_id;
  elsif campaign.benefit_kind = 'plan_access' then
    update public.user_subscriptions
    set promotional_plan = campaign.benefit_plan,
        promotional_plan_ends_at = entitlement_end,
        updated_at = p_now
    where user_id = p_user_id;
  end if;

  update public.promo_campaigns
  set redeemed_count = redeemed_count + 1, updated_at = p_now
  where id = campaign.id;

  return query select 'applied', campaign.name, campaign.benefit_kind,
    campaign.benefit_plan, campaign.benefit_scan_credits,
    campaign.benefit_duration_days, campaign.benefit_module_key, entitlement_end;
end;
$$;

revoke all on function public.redeem_promo_code(uuid, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.redeem_promo_code(uuid, text, timestamptz)
  to service_role;

comment on table public.promo_campaigns is
  'Campanas promocionales administradas. El codigo bearer solo se conserva como SHA-256 y mascara.';
comment on table public.promo_redemptions is
  'Canjes idempotentes con snapshot inmutable del beneficio aplicado.';
comment on column public.user_subscriptions.promotional_plan is
  'Derecho promocional separado del plan y del estado gestionados por Stripe.';

commit;
