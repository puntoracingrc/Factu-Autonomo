-- Server-authoritative free-plan quotas, one-time extras and block telemetry.

begin;

create table if not exists public.billing_quota_entitlements (
  user_id uuid not null references auth.users (id) on delete cascade,
  metric text not null check (
    metric in ('documents', 'manual_expenses', 'customers', 'suppliers', 'products')
  ),
  credit_balance integer not null default 0 check (credit_balance >= 0),
  capacity_bonus integer not null default 0 check (capacity_bonus >= 0),
  updated_at timestamptz not null default pg_catalog.clock_timestamp(),
  primary key (user_id, metric)
);

create table if not exists public.billing_quota_claims (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  metric text not null check (
    metric in ('documents', 'manual_expenses', 'customers', 'suppliers', 'products')
  ),
  period_key text not null check (
    period_key = 'lifetime' or period_key ~ '^[0-9]{4}-[0-9]{2}$'
  ),
  operation_key text not null check (
    pg_catalog.length(operation_key) between 1 and 240
  ),
  subject_id text check (
    subject_id is null or pg_catalog.length(subject_id) between 1 and 200
  ),
  state text not null check (state in ('reserved', 'committed', 'released')),
  used_credit boolean not null default false,
  source text not null default 'app' check (
    source in ('app', 'reconcile', 'automatic_customer', 'automatic_supplier')
  ),
  reserved_at timestamptz not null default pg_catalog.clock_timestamp(),
  lease_expires_at timestamptz,
  committed_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  updated_at timestamptz not null default pg_catalog.clock_timestamp(),
  constraint billing_quota_claims_operation_unique
    unique (user_id, metric, period_key, operation_key),
  constraint billing_quota_claims_lifecycle_check check (
    (
      state = 'reserved'
      and lease_expires_at is not null
      and committed_at is null
      and released_at is null
    )
    or (
      state = 'committed'
      and lease_expires_at is null
      and committed_at is not null
      and released_at is null
      and subject_id is not null
    )
    or (
      state = 'released'
      and lease_expires_at is null
      and released_at is not null
    )
  )
);

create unique index if not exists billing_quota_claims_subject_unique_idx
  on public.billing_quota_claims (user_id, metric, period_key, subject_id)
  where subject_id is not null;

create index if not exists billing_quota_claims_active_idx
  on public.billing_quota_claims (user_id, metric, period_key, state, lease_expires_at);

create table if not exists public.billing_quota_block_events (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  metric text not null check (
    metric in ('documents', 'manual_expenses', 'customers', 'suppliers', 'products')
  ),
  plan text not null check (plan in ('free', 'pro', 'pro_plus', 'trial')),
  period_key text not null,
  current_usage integer not null check (current_usage >= 0),
  included_limit integer check (included_limit is null or included_limit >= 0),
  effective_limit integer check (effective_limit is null or effective_limit >= 0),
  credit_balance integer not null default 0 check (credit_balance >= 0),
  capacity_bonus integer not null default 0 check (capacity_bonus >= 0),
  reset_at timestamptz,
  source text not null default 'app',
  created_at timestamptz not null default pg_catalog.clock_timestamp()
);

create index if not exists billing_quota_block_events_created_idx
  on public.billing_quota_block_events (created_at desc);

create index if not exists billing_quota_block_events_user_created_idx
  on public.billing_quota_block_events (user_id, created_at desc);

create index if not exists billing_quota_block_events_metric_created_idx
  on public.billing_quota_block_events (metric, created_at desc);

create table if not exists public.billing_quota_pack_purchases (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  stripe_event_id text not null unique,
  stripe_checkout_session_id text not null unique,
  pack_key text not null check (
    pack_key in ('documents_5', 'manual_expenses_10', 'contacts_5')
  ),
  quantity integer not null check (quantity > 0),
  fulfillment_contract text not null,
  purchased_at timestamptz not null default pg_catalog.clock_timestamp()
);

create index if not exists billing_quota_pack_purchases_user_idx
  on public.billing_quota_pack_purchases (user_id, purchased_at desc);

alter table public.billing_quota_entitlements enable row level security;
alter table public.billing_quota_claims enable row level security;
alter table public.billing_quota_block_events enable row level security;
alter table public.billing_quota_pack_purchases enable row level security;

revoke all on table public.billing_quota_entitlements
  from public, anon, authenticated;
revoke all on table public.billing_quota_claims
  from public, anon, authenticated;
revoke all on table public.billing_quota_block_events
  from public, anon, authenticated;
revoke all on table public.billing_quota_pack_purchases
  from public, anon, authenticated;

grant all on table public.billing_quota_entitlements to service_role;
grant all on table public.billing_quota_claims to service_role;
grant all on table public.billing_quota_block_events to service_role;
grant all on table public.billing_quota_pack_purchases to service_role;

create or replace function public.reserve_billing_quota_claim(
  p_user_id uuid,
  p_metric text,
  p_period_key text,
  p_operation_key text,
  p_subject_id text,
  p_plan text,
  p_included_limit integer,
  p_reset_at timestamptz,
  p_source text default 'app',
  p_lease_seconds integer default 900,
  p_now timestamptz default null
)
returns table(
  allowed boolean,
  result_status text,
  claim_id uuid,
  claim_state text,
  current_usage integer,
  included_limit integer,
  effective_limit integer,
  credit_balance integer,
  capacity_bonus integer,
  reset_at timestamptz,
  lease_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := coalesce(p_now, pg_catalog.clock_timestamp());
  v_claim public.billing_quota_claims%rowtype;
  v_entitlement public.billing_quota_entitlements%rowtype;
  v_usage integer := 0;
  v_effective_limit integer;
  v_use_credit boolean := false;
  v_expired_credits integer := 0;
begin
  if auth.role() <> 'service_role' then
    raise exception 'reserve_billing_quota_claim can only be executed by service_role'
      using errcode = '42501';
  end if;
  if p_user_id is null
    or p_metric not in ('documents', 'manual_expenses', 'customers', 'suppliers', 'products')
    or p_plan not in ('free', 'pro', 'pro_plus', 'trial')
    or p_operation_key is null
    or pg_catalog.length(p_operation_key) not between 1 and 240
    or (p_subject_id is not null and pg_catalog.length(p_subject_id) not between 1 and 200)
    or p_source not in ('app', 'reconcile', 'automatic_customer', 'automatic_supplier')
    or p_lease_seconds not between 30 and 3600
    or (p_metric in ('documents', 'manual_expenses') and p_period_key !~ '^[0-9]{4}-[0-9]{2}$')
    or (p_metric in ('customers', 'suppliers', 'products') and p_period_key <> 'lifetime')
    or (p_included_limit is not null and p_included_limit < 0) then
    raise exception 'invalid billing quota reservation arguments'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_user_id::text || ':' || p_metric || ':' || p_period_key,
      0
    )
  );

  with expired as (
    update public.billing_quota_claims as claim
       set state = 'released',
           lease_expires_at = null,
           released_at = v_now,
           updated_at = v_now
     where claim.user_id = p_user_id
       and claim.metric = p_metric
       and claim.state = 'reserved'
       and claim.lease_expires_at <= v_now
     returning claim.used_credit
  )
  select pg_catalog.count(*) filter (where used_credit)::integer
    into v_expired_credits
    from expired;

  insert into public.billing_quota_entitlements (
    user_id,
    metric,
    credit_balance,
    capacity_bonus,
    updated_at
  ) values (
    p_user_id,
    p_metric,
    v_expired_credits,
    0,
    v_now
  )
  on conflict (user_id, metric) do update
     set credit_balance = public.billing_quota_entitlements.credit_balance
         + excluded.credit_balance,
         updated_at = excluded.updated_at;

  select *
    into v_entitlement
    from public.billing_quota_entitlements
   where user_id = p_user_id
     and metric = p_metric
   for update;

  select *
    into v_claim
    from public.billing_quota_claims
   where user_id = p_user_id
     and metric = p_metric
     and period_key = p_period_key
     and (
       operation_key = p_operation_key
       or (p_subject_id is not null and subject_id = p_subject_id)
     )
   order by case when operation_key = p_operation_key then 0 else 1 end
   limit 1
   for update;

  select pg_catalog.count(*)::integer
    into v_usage
    from public.billing_quota_claims as claim
   where claim.user_id = p_user_id
     and claim.metric = p_metric
     and claim.period_key = p_period_key
     and (
       claim.state = 'committed'
       or (claim.state = 'reserved' and claim.lease_expires_at > v_now)
     );

  v_effective_limit := case
    when p_included_limit is null then null
    when p_metric in ('customers', 'suppliers', 'products')
      then p_included_limit + v_entitlement.capacity_bonus
    else p_included_limit
  end;

  if v_claim.id is not null and v_claim.state in ('reserved', 'committed') then
    return query select
      true,
      'already_reserved'::text,
      v_claim.id,
      v_claim.state,
      v_usage,
      p_included_limit,
      v_effective_limit,
      v_entitlement.credit_balance,
      v_entitlement.capacity_bonus,
      p_reset_at,
      v_claim.lease_expires_at;
    return;
  end if;

  if p_included_limit is not null and v_usage >= v_effective_limit then
    if p_metric in ('documents', 'manual_expenses')
      and v_entitlement.credit_balance > 0 then
      v_use_credit := true;
    else
      insert into public.billing_quota_block_events (
        user_id,
        metric,
        plan,
        period_key,
        current_usage,
        included_limit,
        effective_limit,
        credit_balance,
        capacity_bonus,
        reset_at,
        source,
        created_at
      ) values (
        p_user_id,
        p_metric,
        p_plan,
        p_period_key,
        v_usage,
        p_included_limit,
        v_effective_limit,
        v_entitlement.credit_balance,
        v_entitlement.capacity_bonus,
        p_reset_at,
        p_source,
        v_now
      );

      return query select
        false,
        'limit_reached'::text,
        null::uuid,
        null::text,
        v_usage,
        p_included_limit,
        v_effective_limit,
        v_entitlement.credit_balance,
        v_entitlement.capacity_bonus,
        p_reset_at,
        null::timestamptz;
      return;
    end if;
  end if;

  if v_use_credit then
    update public.billing_quota_entitlements as entitlement
       set credit_balance = entitlement.credit_balance - 1,
           updated_at = v_now
     where entitlement.user_id = p_user_id
       and entitlement.metric = p_metric
       and entitlement.credit_balance > 0
     returning entitlement.* into v_entitlement;
    if not found then
      raise exception 'billing quota credit changed during reservation'
        using errcode = '40001';
    end if;
  end if;

  if v_claim.id is null then
    insert into public.billing_quota_claims (
      user_id,
      metric,
      period_key,
      operation_key,
      subject_id,
      state,
      used_credit,
      source,
      reserved_at,
      lease_expires_at,
      created_at,
      updated_at
    ) values (
      p_user_id,
      p_metric,
      p_period_key,
      p_operation_key,
      p_subject_id,
      'reserved',
      v_use_credit,
      p_source,
      v_now,
      v_now + pg_catalog.make_interval(secs => p_lease_seconds),
      v_now,
      v_now
    )
    returning * into v_claim;
  else
    update public.billing_quota_claims
       set operation_key = p_operation_key,
           subject_id = coalesce(p_subject_id, subject_id),
           state = 'reserved',
           used_credit = v_use_credit,
           source = p_source,
           reserved_at = v_now,
           lease_expires_at = v_now + pg_catalog.make_interval(secs => p_lease_seconds),
           committed_at = null,
           released_at = null,
           updated_at = v_now
     where id = v_claim.id
     returning * into v_claim;
  end if;

  return query select
    true,
    'reserved'::text,
    v_claim.id,
    v_claim.state,
    v_usage + 1,
    p_included_limit,
    v_effective_limit,
    v_entitlement.credit_balance,
    v_entitlement.capacity_bonus,
    p_reset_at,
    v_claim.lease_expires_at;
end;
$$;

create or replace function public.commit_billing_quota_claim(
  p_user_id uuid,
  p_claim_id uuid,
  p_subject_id text,
  p_now timestamptz default null
)
returns table(result_status text, claim_id uuid, claim_state text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := coalesce(p_now, pg_catalog.clock_timestamp());
  v_claim public.billing_quota_claims%rowtype;
  v_existing public.billing_quota_claims%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'commit_billing_quota_claim can only be executed by service_role'
      using errcode = '42501';
  end if;
  if p_user_id is null or p_claim_id is null or p_subject_id is null
    or pg_catalog.length(p_subject_id) not between 1 and 200 then
    raise exception 'invalid billing quota commit arguments'
      using errcode = '22023';
  end if;

  select * into v_claim
    from public.billing_quota_claims
   where id = p_claim_id and user_id = p_user_id;
  if not found then
    return query select 'not_found'::text, null::uuid, null::text;
    return;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_user_id::text || ':' || v_claim.metric || ':' || v_claim.period_key,
      0
    )
  );

  select * into v_claim
    from public.billing_quota_claims
   where id = p_claim_id and user_id = p_user_id
   for update;
  if not found then
    return query select 'not_found'::text, null::uuid, null::text;
    return;
  end if;
  if v_claim.state = 'committed' and v_claim.subject_id = p_subject_id then
    return query select 'already_committed'::text, v_claim.id, v_claim.state;
    return;
  end if;
  if v_claim.state <> 'reserved' then
    return query select 'not_reserved'::text, v_claim.id, v_claim.state;
    return;
  end if;
  if v_claim.lease_expires_at <= v_now then
    update public.billing_quota_claims
       set state = 'released',
           lease_expires_at = null,
           released_at = v_now,
           updated_at = v_now
     where id = v_claim.id;
    if v_claim.used_credit then
      insert into public.billing_quota_entitlements (
        user_id, metric, credit_balance, capacity_bonus, updated_at
      ) values (p_user_id, v_claim.metric, 1, 0, v_now)
      on conflict (user_id, metric) do update
         set credit_balance = public.billing_quota_entitlements.credit_balance + 1,
             updated_at = excluded.updated_at;
    end if;
    return query select 'expired'::text, v_claim.id, 'released'::text;
    return;
  end if;

  select * into v_existing
    from public.billing_quota_claims
   where user_id = p_user_id
     and metric = v_claim.metric
     and period_key = v_claim.period_key
     and subject_id = p_subject_id
     and id <> v_claim.id
   for update;

  if found then
    update public.billing_quota_claims
       set state = 'released',
           lease_expires_at = null,
           released_at = v_now,
           updated_at = v_now
     where id = v_claim.id;
    if v_claim.used_credit then
      update public.billing_quota_entitlements
         set credit_balance = credit_balance + 1,
             updated_at = v_now
       where user_id = p_user_id and metric = v_claim.metric;
    end if;
    return query select 'already_committed'::text, v_existing.id, v_existing.state;
    return;
  end if;

  update public.billing_quota_claims
     set subject_id = p_subject_id,
         state = 'committed',
         lease_expires_at = null,
         committed_at = v_now,
         updated_at = v_now
   where id = v_claim.id
   returning * into v_claim;

  return query select 'committed'::text, v_claim.id, v_claim.state;
end;
$$;

create or replace function public.release_billing_quota_claim(
  p_user_id uuid,
  p_claim_id uuid,
  p_now timestamptz default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := coalesce(p_now, pg_catalog.clock_timestamp());
  v_claim public.billing_quota_claims%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'release_billing_quota_claim can only be executed by service_role'
      using errcode = '42501';
  end if;
  select * into v_claim
    from public.billing_quota_claims
   where id = p_claim_id and user_id = p_user_id;
  if not found then return 'not_found'; end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_user_id::text || ':' || v_claim.metric || ':' || v_claim.period_key,
      0
    )
  );

  select * into v_claim
    from public.billing_quota_claims
   where id = p_claim_id and user_id = p_user_id
   for update;
  if not found then return 'not_found'; end if;
  if v_claim.state = 'released' then return 'already_released'; end if;
  if v_claim.state = 'committed' then return 'already_committed'; end if;

  update public.billing_quota_claims
     set state = 'released',
         lease_expires_at = null,
         released_at = v_now,
         updated_at = v_now
   where id = v_claim.id;
  if v_claim.used_credit then
    insert into public.billing_quota_entitlements (
      user_id, metric, credit_balance, capacity_bonus, updated_at
    ) values (p_user_id, v_claim.metric, 1, 0, v_now)
    on conflict (user_id, metric) do update
       set credit_balance = public.billing_quota_entitlements.credit_balance + 1,
           updated_at = excluded.updated_at;
  end if;
  return 'released';
end;
$$;

create or replace function public.reconcile_billing_quota_claims(
  p_user_id uuid,
  p_metric text,
  p_period_key text,
  p_subject_ids text[],
  p_replace_missing boolean default false,
  p_now timestamptz default null
)
returns table(committed_count integer, released_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := coalesce(p_now, pg_catalog.clock_timestamp());
  v_subject text;
  v_committed integer := 0;
  v_released integer := 0;
begin
  if auth.role() <> 'service_role' then
    raise exception 'reconcile_billing_quota_claims can only be executed by service_role'
      using errcode = '42501';
  end if;
  if p_user_id is null
    or p_metric not in ('documents', 'manual_expenses', 'customers', 'suppliers', 'products')
    or p_subject_ids is null
    or pg_catalog.cardinality(p_subject_ids) > 10000
    or (p_metric in ('documents', 'manual_expenses') and p_period_key !~ '^[0-9]{4}-[0-9]{2}$')
    or (p_metric in ('customers', 'suppliers', 'products') and p_period_key <> 'lifetime')
    or (p_replace_missing and p_metric not in ('customers', 'suppliers', 'products')) then
    raise exception 'invalid billing quota reconciliation arguments'
      using errcode = '22023';
  end if;

  if exists (
    select 1 from pg_catalog.unnest(p_subject_ids) as ids(subject_id)
     where subject_id is null
       or pg_catalog.length(subject_id) not between 1 and 200
  ) then
    raise exception 'invalid billing quota reconciliation subject'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_user_id::text || ':' || p_metric || ':' || p_period_key,
      0
    )
  );

  foreach v_subject in array p_subject_ids loop
    insert into public.billing_quota_claims (
      user_id,
      metric,
      period_key,
      operation_key,
      subject_id,
      state,
      used_credit,
      source,
      reserved_at,
      lease_expires_at,
      committed_at,
      created_at,
      updated_at
    ) values (
      p_user_id,
      p_metric,
      p_period_key,
      'reconcile:' || v_subject,
      v_subject,
      'committed',
      false,
      'reconcile',
      v_now,
      null,
      v_now,
      v_now,
      v_now
    )
    on conflict (user_id, metric, period_key, subject_id)
      where subject_id is not null
    do update set
      state = 'committed',
      used_credit = false,
      lease_expires_at = null,
      committed_at = coalesce(public.billing_quota_claims.committed_at, excluded.committed_at),
      released_at = null,
      updated_at = excluded.updated_at;
  end loop;

  if p_replace_missing then
    update public.billing_quota_claims
       set state = 'released',
           lease_expires_at = null,
           released_at = v_now,
           updated_at = v_now
     where user_id = p_user_id
       and metric = p_metric
       and period_key = p_period_key
       and state = 'committed'
       and subject_id is not null
       and not (subject_id = any(p_subject_ids));
    get diagnostics v_released = row_count;
  end if;

  select pg_catalog.count(*)::integer
    into v_committed
    from public.billing_quota_claims
   where user_id = p_user_id
     and metric = p_metric
     and period_key = p_period_key
     and state = 'committed';

  return query select v_committed, v_released;
end;
$$;

create or replace function public.release_billing_quota_subject(
  p_user_id uuid,
  p_metric text,
  p_subject_id text,
  p_now timestamptz default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := coalesce(p_now, pg_catalog.clock_timestamp());
begin
  if auth.role() <> 'service_role' then
    raise exception 'release_billing_quota_subject can only be executed by service_role'
      using errcode = '42501';
  end if;
  if p_user_id is null
    or p_metric not in ('customers', 'suppliers', 'products')
    or p_subject_id is null
    or pg_catalog.length(p_subject_id) not between 1 and 200 then
    raise exception 'invalid billing quota subject release arguments'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_user_id::text || ':' || p_metric || ':lifetime',
      0
    )
  );

  update public.billing_quota_claims
     set state = 'released',
         lease_expires_at = null,
         released_at = v_now,
         updated_at = v_now
   where user_id = p_user_id
     and metric = p_metric
     and period_key = 'lifetime'
     and subject_id = p_subject_id
     and state in ('reserved', 'committed');
  if not found then return 'not_found'; end if;
  return 'released';
end;
$$;

create or replace function public.complete_stripe_quota_pack_event(
  p_event_id text,
  p_attempt_token uuid,
  p_user_id uuid,
  p_checkout_session_id text,
  p_pack_key text,
  p_quantity integer,
  p_payment_status text,
  p_fulfillment_contract text,
  p_completed_at timestamptz default null
)
returns table(result_status text, granted_quantity integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := coalesce(p_completed_at, pg_catalog.clock_timestamp());
  v_event public.stripe_events%rowtype;
  v_purchase public.billing_quota_pack_purchases%rowtype;
  v_expected_quantity integer;
  v_effect_key text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'complete_stripe_quota_pack_event can only be executed by service_role'
      using errcode = '42501';
  end if;
  v_expected_quantity := case p_pack_key
    when 'documents_5' then 5
    when 'manual_expenses_10' then 10
    when 'contacts_5' then 5
    else null
  end;
  if p_user_id is null
    or p_checkout_session_id is null
    or p_checkout_session_id !~ '^cs_[A-Za-z0-9_]+$'
    or pg_catalog.length(p_checkout_session_id) > 255
    or v_expected_quantity is null
    or p_quantity is distinct from v_expected_quantity
    or p_payment_status is distinct from 'paid'
    or p_fulfillment_contract is distinct from 'quota_pack_atomic_v1' then
    raise exception 'invalid Stripe quota pack completion arguments'
      using errcode = '22023';
  end if;

  select * into v_event
    from public.stripe_events
   where stripe_event_id = p_event_id
     and status = 'processing'
     and attempt_token = p_attempt_token
     and lease_expires_at > v_now
   for update;
  if not found then
    return query select 'stale_attempt'::text, 0;
    return;
  end if;
  if v_event.event_type not in (
    'checkout.session.completed',
    'checkout.session.async_payment_succeeded'
  ) then
    return query select 'invalid_event_type'::text, 0;
    return;
  end if;

  v_effect_key := 'quota_pack:' || p_checkout_session_id;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_effect_key, 0)
  );

  select * into v_purchase
    from public.billing_quota_pack_purchases
   where stripe_checkout_session_id = p_checkout_session_id
   for update;
  if found then
    if v_purchase.user_id is distinct from p_user_id
      or v_purchase.pack_key is distinct from p_pack_key
      or v_purchase.quantity is distinct from p_quantity
      or v_purchase.fulfillment_contract is distinct from p_fulfillment_contract then
      return query select 'effect_conflict'::text, 0;
      return;
    end if;
  else
    if p_pack_key = 'documents_5' then
      insert into public.billing_quota_entitlements (
        user_id, metric, credit_balance, capacity_bonus, updated_at
      ) values (p_user_id, 'documents', p_quantity, 0, v_now)
      on conflict (user_id, metric) do update
         set credit_balance = public.billing_quota_entitlements.credit_balance + p_quantity,
             updated_at = excluded.updated_at;
    elsif p_pack_key = 'manual_expenses_10' then
      insert into public.billing_quota_entitlements (
        user_id, metric, credit_balance, capacity_bonus, updated_at
      ) values (p_user_id, 'manual_expenses', p_quantity, 0, v_now)
      on conflict (user_id, metric) do update
         set credit_balance = public.billing_quota_entitlements.credit_balance + p_quantity,
             updated_at = excluded.updated_at;
    else
      insert into public.billing_quota_entitlements (
        user_id, metric, credit_balance, capacity_bonus, updated_at
      ) values
        (p_user_id, 'customers', 0, p_quantity, v_now),
        (p_user_id, 'suppliers', 0, p_quantity, v_now)
      on conflict (user_id, metric) do update
         set capacity_bonus = public.billing_quota_entitlements.capacity_bonus + p_quantity,
             updated_at = excluded.updated_at;
    end if;

    insert into public.billing_quota_pack_purchases (
      user_id,
      stripe_event_id,
      stripe_checkout_session_id,
      pack_key,
      quantity,
      fulfillment_contract,
      purchased_at
    ) values (
      p_user_id,
      p_event_id,
      p_checkout_session_id,
      p_pack_key,
      p_quantity,
      p_fulfillment_contract,
      v_now
    );
  end if;

  update public.stripe_events
     set status = 'processed',
         processed_at = v_now,
         updated_at = v_now,
         error_message = null,
         attempt_token = null,
         lease_expires_at = null
   where stripe_event_id = p_event_id
     and status = 'processing'
     and attempt_token = p_attempt_token;
  if not found then
    raise exception 'Stripe quota pack attempt changed during completion'
      using errcode = '40001';
  end if;

  return query select
    case when v_purchase.id is null then 'applied' else 'already_applied' end,
    case when v_purchase.id is null then p_quantity else 0 end;
end;
$$;

revoke all on function public.reserve_billing_quota_claim(
  uuid, text, text, text, text, text, integer, timestamptz, text, integer, timestamptz
) from public, anon, authenticated;
revoke all on function public.commit_billing_quota_claim(
  uuid, uuid, text, timestamptz
) from public, anon, authenticated;
revoke all on function public.release_billing_quota_claim(
  uuid, uuid, timestamptz
) from public, anon, authenticated;
revoke all on function public.reconcile_billing_quota_claims(
  uuid, text, text, text[], boolean, timestamptz
) from public, anon, authenticated;
revoke all on function public.release_billing_quota_subject(
  uuid, text, text, timestamptz
) from public, anon, authenticated;
revoke all on function public.complete_stripe_quota_pack_event(
  text, uuid, uuid, text, text, integer, text, text, timestamptz
) from public, anon, authenticated;

grant execute on function public.reserve_billing_quota_claim(
  uuid, text, text, text, text, text, integer, timestamptz, text, integer, timestamptz
) to service_role;
grant execute on function public.commit_billing_quota_claim(
  uuid, uuid, text, timestamptz
) to service_role;
grant execute on function public.release_billing_quota_claim(
  uuid, uuid, timestamptz
) to service_role;
grant execute on function public.reconcile_billing_quota_claims(
  uuid, text, text, text[], boolean, timestamptz
) to service_role;
grant execute on function public.release_billing_quota_subject(
  uuid, text, text, timestamptz
) to service_role;
grant execute on function public.complete_stripe_quota_pack_event(
  text, uuid, uuid, text, text, integer, text, text, timestamptz
) to service_role;

commit;
