begin;

-- Extend the audited, owner-locked bootstrap to expenses, recurring expenses
-- and the singleton business profile without weakening its transaction,
-- idempotency, command, entity or outbox contracts.
create or replace function public.bootstrap_central_business_entities_v1(
  p_user_id uuid,
  p_device_id text,
  p_session_hash text,
  p_idempotency_key_hash text,
  p_request_hash text,
  p_snapshot_digest text,
  p_central_state_digest text,
  p_preview_digest text,
  p_entities jsonb
)
returns table (
  result_status text,
  created_count integer,
  identical_count integer,
  first_event_sequence bigint,
  last_event_sequence bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bootstrap public.central_business_bootstraps%rowtype;
  v_command public.central_business_commands%rowtype;
  v_event public.central_business_outbox%rowtype;
  v_item jsonb;
  v_entity_count integer;
  v_created_count integer := 0;
  v_identical_count integer := 0;
  v_first_event_sequence bigint;
  v_last_event_sequence bigint;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then
    raise exception using
      errcode = 'P4110',
      message = 'bootstrap_central_business_entities_v1 requires service_role';
  end if;

  if p_user_id is null
    or coalesce(p_device_id, '') = ''
    or coalesce(p_session_hash, '') = ''
    or coalesce(p_idempotency_key_hash, '') !~ '^[0-9a-f]{64}$'
    or coalesce(p_request_hash, '') !~ '^[0-9a-f]{64}$'
    or coalesce(p_snapshot_digest, '') !~ '^[0-9a-f]{64}$'
    or coalesce(p_central_state_digest, '') !~ '^[0-9a-f]{64}$'
    or coalesce(p_preview_digest, '') !~ '^[0-9a-f]{64}$'
    or p_entities is null
    or pg_catalog.jsonb_typeof(p_entities) <> 'array'
    or pg_catalog.jsonb_array_length(p_entities) > 5000
  then
    raise exception using
      errcode = 'P4110',
      message = 'invalid central business bootstrap command';
  end if;

  v_entity_count := pg_catalog.jsonb_array_length(p_entities);

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_entities) as item(value)
    where pg_catalog.jsonb_typeof(item.value) <> 'object'
      or coalesce(item.value ->> 'entityType', '') not in (
        'customer',
        'supplier',
        'product',
        'user_reminder',
        'expense',
        'recurring_expense',
        'profile'
      )
      or length(coalesce(item.value ->> 'entityId', '')) not between 1 and 200
      or pg_catalog.jsonb_typeof(item.value -> 'payload') <> 'object'
      or (
        item.value ->> 'entityType' = 'profile'
        and item.value ->> 'entityId' <> 'profile'
      )
      or (
        item.value ->> 'entityType' <> 'profile'
        and coalesce(item.value -> 'payload' ->> 'id', '')
          <> coalesce(item.value ->> 'entityId', '')
      )
      or coalesce(item.value ->> 'contentHash', '') !~ '^[0-9a-f]{64}$'
      or coalesce(item.value ->> 'idempotencyKeyHash', '')
        !~ '^[0-9a-f]{64}$'
      or coalesce(item.value ->> 'requestHash', '') !~ '^[0-9a-f]{64}$'
  ) then
    raise exception using
      errcode = 'P4110',
      message = 'invalid central business bootstrap entity';
  end if;

  if (
    select count(*)
    from (
      select
        item.value ->> 'entityType' as entity_type,
        item.value ->> 'entityId' as entity_id
      from pg_catalog.jsonb_array_elements(p_entities) as item(value)
      group by
        item.value ->> 'entityType',
        item.value ->> 'entityId'
      having count(*) > 1
    ) as duplicates
  ) > 0 then
    raise exception using
      errcode = 'P4110',
      message = 'duplicate central business bootstrap entity';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'central-business-owner:' || p_user_id::text,
      0
    )
  );

  insert into public.central_business_bootstraps (
    user_id,
    idempotency_key_hash,
    request_hash,
    snapshot_digest,
    central_state_digest,
    preview_digest,
    entity_count,
    actor_device_id,
    actor_session_hash
  )
  values (
    p_user_id,
    p_idempotency_key_hash,
    p_request_hash,
    p_snapshot_digest,
    p_central_state_digest,
    p_preview_digest,
    v_entity_count,
    p_device_id,
    p_session_hash
  )
  on conflict (user_id, idempotency_key_hash)
  do update set idempotency_key_hash = excluded.idempotency_key_hash
  returning * into v_bootstrap;

  if v_bootstrap.request_hash <> p_request_hash then
    raise exception using
      errcode = 'P4112',
      message = 'bootstrap idempotency key reused with different request';
  end if;

  if v_bootstrap.status = 'committed' then
    return query
      select
        'replayed'::text,
        v_bootstrap.created_count,
        v_bootstrap.identical_count,
        v_bootstrap.first_event_sequence,
        v_bootstrap.last_event_sequence;
    return;
  end if;

  if exists (
    select 1
    from public.central_business_entities as central
    where central.user_id = p_user_id
      and central.entity_type in (
        'customer',
        'supplier',
        'product',
        'user_reminder',
        'expense',
        'recurring_expense',
        'profile'
      )
      and not central.deleted
      and not exists (
        select 1
        from pg_catalog.jsonb_array_elements(p_entities) as item(value)
        where item.value ->> 'entityType' = central.entity_type
          and item.value ->> 'entityId' = central.entity_id
      )
  ) then
    raise exception using
      errcode = 'P4113',
      message = 'central business bootstrap contains central-only entities';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_entities) as item(value)
    join public.central_business_entities as central
      on central.user_id = p_user_id
      and central.entity_type = item.value ->> 'entityType'
      and central.entity_id = item.value ->> 'entityId'
    where central.deleted
      or central.content_hash <> item.value ->> 'contentHash'
  ) then
    raise exception using
      errcode = 'P4113',
      message = 'central business bootstrap entity conflict';
  end if;

  select count(*)::integer
    into v_identical_count
    from pg_catalog.jsonb_array_elements(p_entities) as item(value)
    join public.central_business_entities as central
      on central.user_id = p_user_id
      and central.entity_type = item.value ->> 'entityType'
      and central.entity_id = item.value ->> 'entityId'
      and not central.deleted
      and central.content_hash = item.value ->> 'contentHash';

  for v_item in
    select item.value
    from pg_catalog.jsonb_array_elements(p_entities) as item(value)
    left join public.central_business_entities as central
      on central.user_id = p_user_id
      and central.entity_type = item.value ->> 'entityType'
      and central.entity_id = item.value ->> 'entityId'
    where central.id is null
    order by item.value ->> 'entityType', item.value ->> 'entityId'
  loop
    insert into public.central_business_commands (
      user_id,
      idempotency_key_hash,
      request_hash,
      operation_kind,
      entity_type,
      entity_id,
      expected_version,
      device_id,
      session_hash
    )
    values (
      p_user_id,
      v_item ->> 'idempotencyKeyHash',
      v_item ->> 'requestHash',
      'upsert',
      v_item ->> 'entityType',
      v_item ->> 'entityId',
      0,
      p_device_id,
      p_session_hash
    )
    returning * into v_command;

    insert into public.central_business_entities (
      user_id,
      entity_type,
      entity_id,
      current_version,
      deleted,
      current_payload,
      content_hash,
      actor_device_id,
      actor_session_hash
    )
    values (
      p_user_id,
      v_item ->> 'entityType',
      v_item ->> 'entityId',
      1,
      false,
      v_item -> 'payload',
      v_item ->> 'contentHash',
      p_device_id,
      p_session_hash
    );

    insert into public.central_business_outbox (
      user_id,
      entity_type,
      entity_id,
      entity_version,
      operation_kind,
      payload,
      content_hash,
      actor_device_id
    )
    values (
      p_user_id,
      v_item ->> 'entityType',
      v_item ->> 'entityId',
      1,
      'upsert',
      v_item -> 'payload',
      v_item ->> 'contentHash',
      p_device_id
    )
    returning * into v_event;

    update public.central_business_commands
      set
        status = 'committed',
        result_entity_version = 1,
        result_event_id = v_event.id,
        completed_at = statement_timestamp()
      where id = v_command.id;

    v_created_count := v_created_count + 1;
    v_first_event_sequence := coalesce(
      v_first_event_sequence,
      v_event.event_sequence
    );
    v_last_event_sequence := v_event.event_sequence;
  end loop;

  update public.central_business_bootstraps
    set
      status = 'committed',
      created_count = v_created_count,
      identical_count = v_identical_count,
      first_event_sequence = v_first_event_sequence,
      last_event_sequence = v_last_event_sequence,
      completed_at = statement_timestamp()
    where id = v_bootstrap.id
    returning * into v_bootstrap;

  return query
    select
      'committed'::text,
      v_bootstrap.created_count,
      v_bootstrap.identical_count,
      v_bootstrap.first_event_sequence,
      v_bootstrap.last_event_sequence;
end;
$$;

revoke all on function public.bootstrap_central_business_entities_v1(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) from public, anon, authenticated;

grant execute on function public.bootstrap_central_business_entities_v1(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) to service_role;

comment on table public.central_business_bootstraps is
  'Payload-free audit record for an idempotent central business bootstrap.';

comment on function public.bootstrap_central_business_entities_v1(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) is
  'Atomically imports an exact local customer, supplier, product, reminder, expense, recurring expense and singleton profile snapshot after fail-closed conflict checks.';

commit;
