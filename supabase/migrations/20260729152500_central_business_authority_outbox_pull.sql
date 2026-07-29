begin;

create or replace function public.list_central_business_events_v1(
  p_user_id uuid,
  p_device_id text,
  p_after_sequence bigint default 0,
  p_limit integer default 100
)
returns table (
  event_id uuid,
  event_sequence bigint,
  entity_type text,
  entity_id text,
  entity_version integer,
  operation_kind text,
  payload jsonb,
  content_hash text,
  actor_device_id text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'list_central_business_events_v1 requires service_role';
  end if;

  if p_user_id is null
    or coalesce(p_device_id, '') = ''
    or coalesce(p_after_sequence, 0) < 0
  then
    raise exception 'invalid central business event pull request';
  end if;

  v_limit := least(greatest(coalesce(p_limit, 100), 1), 500);

  return query
    select
      outbox.id,
      outbox.event_sequence,
      outbox.entity_type,
      outbox.entity_id,
      outbox.entity_version,
      outbox.operation_kind,
      outbox.payload,
      outbox.content_hash,
      outbox.actor_device_id,
      outbox.created_at
    from public.central_business_outbox as outbox
    where outbox.user_id = p_user_id
      and outbox.event_sequence > coalesce(p_after_sequence, 0)
    order by outbox.event_sequence asc
    limit v_limit;
end;
$$;

revoke all on function public.list_central_business_events_v1(
  uuid,
  text,
  bigint,
  integer
) from public, anon, authenticated;

grant execute on function public.list_central_business_events_v1(
  uuid,
  text,
  bigint,
  integer
) to service_role;

comment on function public.list_central_business_events_v1(
  uuid,
  text,
  bigint,
  integer
) is
  'Service-role-only ordered outbox pull for verified central business devices.';

commit;
