-- AUD-P1-19: leased Stripe event processing and atomic scan-pack fulfillment.

begin;

alter table public.stripe_events
  add column if not exists attempt_token uuid,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists attempt_count integer not null default 0,
  add column if not exists legacy_review_required boolean not null default false,
  add column if not exists effect_key text,
  add column if not exists effect_kind text,
  add column if not exists effect_fulfillment_contract text,
  add column if not exists effect_user_id uuid,
  add column if not exists effect_scan_credits integer,
  add column if not exists effect_ai_credit_units integer,
  add column if not exists effect_payment_status text,
  add column if not exists effect_applied_at timestamptz;

-- A pre-migration processing/failed row is ambiguous: the old worker may have
-- applied its side effect before losing the final status update. Never reclaim
-- it automatically under the new protocol.
update public.stripe_events
   set status = 'failed',
       attempt_token = null,
       lease_expires_at = null,
       legacy_review_required = true
 where status in ('processing', 'failed');

do $$
begin
  alter table public.stripe_events
    add constraint stripe_events_attempt_count_check
    check (attempt_count >= 0);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.stripe_events
    add constraint stripe_events_lease_state_check
    check (
      (
        status = 'processing'
        and attempt_count > 0
        and attempt_token is not null
        and lease_expires_at is not null
      )
      or
      (
        status <> 'processing'
        and attempt_token is null
        and lease_expires_at is null
      )
    );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.stripe_events
    add constraint stripe_events_legacy_review_state_check
    check (
      not legacy_review_required
      or (
        status = 'failed'
        and attempt_token is null
        and lease_expires_at is null
      )
    );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.stripe_events
    add constraint stripe_events_effect_state_check
    check (
      (
        effect_key is null
        and effect_kind is null
        and effect_fulfillment_contract is null
        and effect_user_id is null
        and effect_scan_credits is null
        and effect_ai_credit_units is null
        and effect_payment_status is null
        and effect_applied_at is null
      )
      or
      (
        status = 'processed'
        and effect_key is not null
        and effect_kind is not distinct from 'scan_pack'
        and effect_fulfillment_contract is not distinct from 'scan_pack_atomic_v1'
        and effect_user_id is not null
        and effect_scan_credits is not null
        and effect_scan_credits = 10
        and effect_ai_credit_units is not null
        and effect_ai_credit_units = 100
        and effect_payment_status is not distinct from 'paid'
        and effect_applied_at is not null
      )
    );
exception
  when duplicate_object then null;
end $$;

create unique index if not exists stripe_events_effect_key_unique_idx
  on public.stripe_events (effect_key)
  where effect_key is not null;

create or replace function public.reserve_stripe_event_attempt(
  p_event_id text,
  p_event_type text,
  p_lease_seconds integer default 300,
  p_claimed_at timestamptz default null
)
returns table(
  result_status text,
  event_status text,
  lease_token uuid,
  attempt_number integer,
  lease_until timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := coalesce(p_claimed_at, pg_catalog.clock_timestamp());
  v_token uuid := pg_catalog.gen_random_uuid();
  v_event public.stripe_events%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'reserve_stripe_event_attempt can only be executed by service_role'
      using errcode = '42501';
  end if;

  if p_event_id is null
    or pg_catalog.length(p_event_id) < 3
    or pg_catalog.length(p_event_id) > 255
    or p_event_type is null
    or pg_catalog.length(p_event_type) < 3
    or pg_catalog.length(p_event_type) > 255
    or p_lease_seconds < 30
    or p_lease_seconds > 900 then
    raise exception 'invalid Stripe event reservation arguments'
      using errcode = '22023';
  end if;

  insert into public.stripe_events (
    stripe_event_id,
    event_type,
    status,
    attempt_token,
    lease_expires_at,
    attempt_count,
    error_message,
    updated_at
  )
  values (
    p_event_id,
    p_event_type,
    'processing',
    v_token,
    v_now + pg_catalog.make_interval(secs => p_lease_seconds),
    1,
    null,
    v_now
  )
  on conflict (stripe_event_id) do nothing;

  if found then
    return query select
      'acquired'::text,
      'processing'::text,
      v_token,
      1,
      v_now + pg_catalog.make_interval(secs => p_lease_seconds);
    return;
  end if;

  select *
    into v_event
    from public.stripe_events
   where stripe_event_id = p_event_id
   for update;

  if not found then
    raise exception 'Stripe event reservation race'
      using errcode = '40001';
  end if;

  if v_event.event_type <> p_event_type then
    return query select
      'conflict'::text,
      v_event.status,
      null::uuid,
      v_event.attempt_count,
      v_event.lease_expires_at;
    return;
  end if;

  if v_event.status = 'processed' then
    return query select
      'processed'::text,
      v_event.status,
      null::uuid,
      v_event.attempt_count,
      null::timestamptz;
    return;
  end if;

  if v_event.legacy_review_required then
    return query select
      'manual_review'::text,
      v_event.status,
      null::uuid,
      v_event.attempt_count,
      null::timestamptz;
    return;
  end if;

  if v_event.status = 'processing'
    and v_event.lease_expires_at is not null
    and v_event.lease_expires_at > v_now then
    return query select
      'busy'::text,
      v_event.status,
      null::uuid,
      v_event.attempt_count,
      v_event.lease_expires_at;
    return;
  end if;

  update public.stripe_events
     set status = 'processing',
         attempt_token = v_token,
         lease_expires_at = v_now + pg_catalog.make_interval(secs => p_lease_seconds),
         attempt_count = attempt_count + 1,
         error_message = null,
         processed_at = null,
         updated_at = v_now
   where stripe_event_id = p_event_id;

  return query select
    'acquired'::text,
    'processing'::text,
    v_token,
    v_event.attempt_count + 1,
    v_now + pg_catalog.make_interval(secs => p_lease_seconds);
end;
$$;

create or replace function public.complete_stripe_event_attempt(
  p_event_id text,
  p_attempt_token uuid,
  p_completed_at timestamptz default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := coalesce(p_completed_at, pg_catalog.clock_timestamp());
begin
  if auth.role() <> 'service_role' then
    raise exception 'complete_stripe_event_attempt can only be executed by service_role'
      using errcode = '42501';
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
     and attempt_token = p_attempt_token
     and lease_expires_at > v_now;

  if found then
    return 'processed';
  end if;
  return 'stale_attempt';
end;
$$;

create or replace function public.fail_stripe_event_attempt(
  p_event_id text,
  p_attempt_token uuid,
  p_error_code text,
  p_failed_at timestamptz default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := coalesce(p_failed_at, pg_catalog.clock_timestamp());
begin
  if auth.role() <> 'service_role' then
    raise exception 'fail_stripe_event_attempt can only be executed by service_role'
      using errcode = '42501';
  end if;

  if p_error_code is null or p_error_code !~ '^[a-z0-9_]{1,64}$' then
    raise exception 'invalid Stripe event failure code'
      using errcode = '22023';
  end if;

  update public.stripe_events
     set status = 'failed',
         error_message = p_error_code,
         updated_at = v_now,
         attempt_token = null,
         lease_expires_at = null,
         legacy_review_required = (p_error_code = 'legacy_checkout_unresolved')
   where stripe_event_id = p_event_id
     and status = 'processing'
     and attempt_token = p_attempt_token;

  if found then
    if p_error_code = 'legacy_checkout_unresolved' then
      return 'manual_review';
    end if;
    return 'failed';
  end if;
  return 'stale_attempt';
end;
$$;

create or replace function public.complete_stripe_scan_pack_event(
  p_event_id text,
  p_attempt_token uuid,
  p_user_id uuid,
  p_checkout_session_id text,
  p_scan_credits integer,
  p_units_per_scan integer,
  p_payment_status text,
  p_fulfillment_contract text,
  p_completed_at timestamptz default null
)
returns table(result_status text, credited_scan_credits integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := coalesce(p_completed_at, pg_catalog.clock_timestamp());
  v_event public.stripe_events%rowtype;
  v_effect public.stripe_events%rowtype;
  v_effect_key text;
  v_credit_units integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'complete_stripe_scan_pack_event can only be executed by service_role'
      using errcode = '42501';
  end if;

  if p_user_id is null
    or p_checkout_session_id is null
    or p_checkout_session_id !~ '^cs_[A-Za-z0-9_]+$'
    or pg_catalog.length(p_checkout_session_id) > 255
    or p_scan_credits is null
    or p_scan_credits is distinct from 10
    or p_units_per_scan is null
    or p_units_per_scan is distinct from 10
    or p_payment_status is distinct from 'paid'
    or p_fulfillment_contract is distinct from 'scan_pack_atomic_v1' then
    raise exception 'invalid Stripe scan pack completion arguments'
      using errcode = '22023';
  end if;

  v_credit_units := p_scan_credits * p_units_per_scan;
  if v_credit_units <= 0 then
    raise exception 'invalid Stripe scan pack credit total'
      using errcode = '22003';
  end if;
  v_effect_key := 'scan_pack:' || p_checkout_session_id;

  select *
    into v_event
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

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_effect_key, 0)
  );

  select *
    into v_effect
    from public.stripe_events
   where effect_key = v_effect_key
   for update;

  if found then
    if v_effect.effect_kind is distinct from 'scan_pack'
      or v_effect.effect_fulfillment_contract is distinct from p_fulfillment_contract
      or v_effect.effect_user_id is distinct from p_user_id
      or v_effect.effect_scan_credits is distinct from p_scan_credits
      or v_effect.effect_ai_credit_units is distinct from v_credit_units
      or v_effect.effect_payment_status is distinct from 'paid' then
      return query select 'effect_conflict'::text, 0;
      return;
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
      raise exception 'Stripe scan pack attempt changed during completion'
        using errcode = '40001';
    end if;

    return query select 'already_applied'::text, 0;
    return;
  end if;

  update public.user_subscriptions
     set scan_credits = scan_credits + p_scan_credits,
         ai_credit_units = ai_credit_units + v_credit_units,
         updated_at = v_now
   where user_id = p_user_id;

  if not found then
    raise exception 'Stripe scan pack subscription missing'
      using errcode = 'P0002';
  end if;

  update public.stripe_events
     set status = 'processed',
         processed_at = v_now,
         updated_at = v_now,
         error_message = null,
         attempt_token = null,
         lease_expires_at = null,
         effect_key = v_effect_key,
         effect_kind = 'scan_pack',
         effect_fulfillment_contract = p_fulfillment_contract,
         effect_user_id = p_user_id,
         effect_scan_credits = p_scan_credits,
         effect_ai_credit_units = v_credit_units,
         effect_payment_status = 'paid',
         effect_applied_at = v_now
   where stripe_event_id = p_event_id
     and status = 'processing'
     and attempt_token = p_attempt_token;

  if not found then
    raise exception 'Stripe scan pack attempt changed during completion'
      using errcode = '40001';
  end if;

  return query select 'applied'::text, p_scan_credits;
end;
$$;

revoke all on function public.reserve_stripe_event_attempt(
  text, text, integer, timestamptz
) from public, anon, authenticated;
revoke all on function public.complete_stripe_event_attempt(
  text, uuid, timestamptz
) from public, anon, authenticated;
revoke all on function public.fail_stripe_event_attempt(
  text, uuid, text, timestamptz
) from public, anon, authenticated;
revoke all on function public.complete_stripe_scan_pack_event(
  text, uuid, uuid, text, integer, integer, text, text, timestamptz
) from public, anon, authenticated;

grant execute on function public.reserve_stripe_event_attempt(
  text, text, integer, timestamptz
) to service_role;
grant execute on function public.complete_stripe_event_attempt(
  text, uuid, timestamptz
) to service_role;
grant execute on function public.fail_stripe_event_attempt(
  text, uuid, text, timestamptz
) to service_role;
grant execute on function public.complete_stripe_scan_pack_event(
  text, uuid, uuid, text, integer, integer, text, text, timestamptz
) to service_role;

commit;
