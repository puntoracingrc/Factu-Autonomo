-- CENTRAL_BUSINESS_ATOMIC_BATCH_DELETE_PAYLOAD_V3
-- Converts a JSON null delete payload into SQL NULL before calling the
-- single-entity authority. The whole batch remains one transaction.

begin;

create or replace function public.mutate_central_business_batch_v1(
  p_user_id uuid,
  p_device_id text,
  p_session_hash text,
  p_operations jsonb
)
returns table (
  operation_index integer,
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
  v_count integer;
  v_distinct_count integer;
  v_item record;
  v_result record;
  v_results jsonb := '[]'::jsonb;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception using
      errcode = 'P4120',
      message = 'mutate_central_business_batch_v1 requires service_role';
  end if;

  if p_user_id is null
    or coalesce(p_device_id, '') = ''
    or coalesce(p_session_hash, '') = ''
    or p_operations is null
    or jsonb_typeof(p_operations) <> 'array'
  then
    raise exception using
      errcode = 'P4120',
      message = 'invalid central business batch command';
  end if;

  v_count := jsonb_array_length(p_operations);
  if v_count not between 1 and 100 then
    raise exception using
      errcode = 'P4120',
      message = 'invalid central business batch command';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_operations) with ordinality as item(value, ordinality)
    where jsonb_typeof(item.value) <> 'object'
      or (item.value ->> 'operationIndex') is null
      or (item.value ->> 'operationIndex') !~ '^[0-9]+$'
      or (item.value ->> 'operationIndex')::integer <> item.ordinality - 1
      or coalesce(item.value ->> 'idempotencyKeyHash', '') = ''
      or coalesce(item.value ->> 'requestHash', '') = ''
      or coalesce(item.value ->> 'operationKind', '') not in ('upsert', 'delete')
      or coalesce(item.value ->> 'entityType', '') not in (
        'customer',
        'supplier',
        'product',
        'expense',
        'recurring_expense',
        'user_reminder',
        'profile'
      )
      or length(coalesce(item.value ->> 'entityId', '')) not between 1 and 200
      or (item.value ->> 'expectedVersion') is null
      or (item.value ->> 'expectedVersion') !~ '^[0-9]+$'
      or coalesce(item.value ->> 'contentHash', '') = ''
      or (
        item.value ->> 'operationKind' = 'upsert'
        and (
          not (item.value ? 'payload')
          or jsonb_typeof(item.value -> 'payload') not in ('object', 'array')
        )
      )
      or (
        item.value ->> 'operationKind' = 'delete'
        and (
          not (item.value ? 'payload')
          or jsonb_typeof(item.value -> 'payload') <> 'null'
        )
      )
      or (
        item.value ->> 'entityType' = 'profile'
        and item.value ->> 'entityId' <> 'profile'
      )
  ) then
    raise exception using
      errcode = 'P4120',
      message = 'invalid central business batch command';
  end if;

  select count(distinct (
    item.value ->> 'entityType',
    item.value ->> 'entityId'
  ))
    into v_distinct_count
    from jsonb_array_elements(p_operations) as item(value);

  if v_distinct_count <> v_count then
    raise exception using
      errcode = 'P4121',
      message = 'central business batch repeats an entity';
  end if;

  for v_item in
    select
      (item.value ->> 'operationIndex')::integer as operation_index,
      item.value ->> 'idempotencyKeyHash' as idempotency_key_hash,
      item.value ->> 'requestHash' as request_hash,
      item.value ->> 'operationKind' as operation_kind,
      item.value ->> 'entityType' as entity_type,
      item.value ->> 'entityId' as entity_id,
      (item.value ->> 'expectedVersion')::integer as expected_version,
      case
        when item.value ->> 'operationKind' = 'delete' then null::jsonb
        else item.value -> 'payload'
      end as payload,
      item.value ->> 'contentHash' as content_hash
    from jsonb_array_elements(p_operations) as item(value)
    order by
      item.value ->> 'entityType',
      item.value ->> 'entityId',
      (item.value ->> 'operationIndex')::integer
  loop
    select *
      into strict v_result
      from public.mutate_central_business_entity_v1(
        p_user_id,
        p_device_id,
        p_session_hash,
        v_item.idempotency_key_hash,
        v_item.request_hash,
        v_item.operation_kind,
        v_item.entity_type,
        v_item.entity_id,
        v_item.expected_version,
        v_item.payload,
        v_item.content_hash
      );

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'operationIndex', v_item.operation_index,
        'resultStatus', v_result.result_status,
        'eventId', v_result.event_id,
        'eventSequence', v_result.event_sequence,
        'entityVersion', v_result.entity_version,
        'deleted', v_result.deleted,
        'contentHash', v_result.content_hash
      )
    );
  end loop;

  return query
    select
      (item.value ->> 'operationIndex')::integer,
      item.value ->> 'resultStatus',
      (item.value ->> 'eventId')::uuid,
      (item.value ->> 'eventSequence')::bigint,
      (item.value ->> 'entityVersion')::integer,
      (item.value ->> 'deleted')::boolean,
      item.value ->> 'contentHash'
    from jsonb_array_elements(v_results) as item(value)
    order by (item.value ->> 'operationIndex')::integer;
end;
$$;

revoke all on function public.mutate_central_business_batch_v1(
  uuid,
  text,
  text,
  jsonb
) from public, anon, authenticated;

grant execute on function public.mutate_central_business_batch_v1(
  uuid,
  text,
  text,
  jsonb
) to service_role;

comment on function public.mutate_central_business_batch_v1(
  uuid,
  text,
  text,
  jsonb
) is
  'Applies 1-100 distinct central business mutations atomically, including deletes represented as JSON null.';

commit;
