begin;

create or replace function public.mutate_central_business_entity_v1(
  p_user_id uuid,
  p_device_id text,
  p_session_hash text,
  p_idempotency_key_hash text,
  p_request_hash text,
  p_operation_kind text,
  p_entity_type text,
  p_entity_id text,
  p_expected_version integer,
  p_payload jsonb,
  p_content_hash text
)
returns table (
  result_status text,
  event_id uuid,
  event_sequence bigint,
  entity_version integer,
  deleted boolean,
  content_hash text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_command public.central_business_commands%rowtype;
  v_entity public.central_business_entities%rowtype;
  v_event public.central_business_outbox%rowtype;
  v_next_version integer;
  v_deleted boolean;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception using
      errcode = 'P4100',
      message = 'mutate_central_business_entity_v1 requires service_role';
  end if;

  if p_user_id is null
    or coalesce(p_device_id, '') = ''
    or coalesce(p_session_hash, '') = ''
    or coalesce(p_idempotency_key_hash, '') = ''
    or coalesce(p_request_hash, '') = ''
    or coalesce(p_operation_kind, '') not in ('upsert', 'delete')
    or coalesce(p_entity_type, '') not in (
      'customer',
      'supplier',
      'product',
      'expense',
      'recurring_expense',
      'user_reminder',
      'profile'
    )
    or length(coalesce(p_entity_id, '')) not between 1 and 200
    or p_expected_version is null
    or p_expected_version < 0
    or coalesce(p_content_hash, '') = ''
    or (p_operation_kind = 'upsert' and p_payload is null)
    or (p_operation_kind = 'delete' and p_payload is not null)
  then
    raise exception using
      errcode = 'P4100',
      message = 'invalid central business mutation command';
  end if;

  if p_entity_type = 'profile' and p_entity_id <> 'profile' then
    raise exception using
      errcode = 'P4100',
      message = 'central business profile identifier mismatch';
  end if;

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
    p_idempotency_key_hash,
    p_request_hash,
    p_operation_kind,
    p_entity_type,
    p_entity_id,
    p_expected_version,
    p_device_id,
    p_session_hash
  )
  on conflict (user_id, idempotency_key_hash)
  do update set idempotency_key_hash = excluded.idempotency_key_hash
  returning * into v_command;

  if v_command.request_hash <> p_request_hash then
    raise exception using
      errcode = 'P4102',
      message = 'idempotency key reused with different request';
  end if;

  if v_command.status = 'committed' then
    return query
      select
        'replayed'::text,
        outbox.id,
        outbox.event_sequence,
        command.result_entity_version,
        outbox.operation_kind = 'delete',
        outbox.content_hash
      from public.central_business_commands as command
      join public.central_business_outbox as outbox
        on outbox.id = command.result_event_id
      where command.id = v_command.id;
    return;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_user_id::text || ':' || p_entity_type || ':' || p_entity_id,
      0
    )
  );

  select *
    into v_entity
    from public.central_business_entities
    where user_id = p_user_id
      and entity_type = p_entity_type
      and entity_id = p_entity_id
    for update;

  if p_expected_version = 0 then
    if found then
      raise exception using
        errcode = 'P4103',
        message = 'central business entity version mismatch';
    end if;
    if p_operation_kind = 'delete' then
      raise exception using
        errcode = 'P4104',
        message = 'central business entity not found';
    end if;
    v_next_version := 1;
  else
    if not found or v_entity.current_version <> p_expected_version then
      raise exception using
        errcode = 'P4103',
        message = 'central business entity version mismatch';
    end if;
    v_next_version := v_entity.current_version + 1;
  end if;

  v_deleted := p_operation_kind = 'delete';

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
    p_entity_type,
    p_entity_id,
    v_next_version,
    v_deleted,
    p_payload,
    p_content_hash,
    p_device_id,
    p_session_hash
  )
  on conflict (user_id, entity_type, entity_id)
  do update set
    current_version = excluded.current_version,
    deleted = excluded.deleted,
    current_payload = excluded.current_payload,
    content_hash = excluded.content_hash,
    actor_device_id = excluded.actor_device_id,
    actor_session_hash = excluded.actor_session_hash,
    updated_at = statement_timestamp();

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
    p_entity_type,
    p_entity_id,
    v_next_version,
    p_operation_kind,
    p_payload,
    p_content_hash,
    p_device_id
  )
  returning * into v_event;

  update public.central_business_commands
    set
      status = 'committed',
      result_entity_version = v_next_version,
      result_event_id = v_event.id,
      completed_at = statement_timestamp()
    where id = v_command.id;

  return query
    select
      'committed'::text,
      v_event.id,
      v_event.event_sequence,
      v_next_version,
      v_deleted,
      p_content_hash;
end;
$$;

revoke all on function public.mutate_central_business_entity_v1(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  jsonb,
  text
) from public, anon, authenticated;

grant execute on function public.mutate_central_business_entity_v1(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  jsonb,
  text
) to service_role;

comment on function public.mutate_central_business_entity_v1(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  jsonb,
  text
) is
  'Versioned central mutation with stable P4102 idempotency, P4103 version conflict and P4104 not-found SQLSTATE codes.';

commit;
