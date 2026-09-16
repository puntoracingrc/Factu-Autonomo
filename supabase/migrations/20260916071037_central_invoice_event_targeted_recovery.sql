-- CENTRAL_INVOICE_AUTHORITY_TARGETED_EVENT_RECOVERY_V1
-- Lets an authenticated application device recover one already-confirmed
-- central event without rewinding or advancing its normal event cursor.

begin;

create or replace function public.get_central_invoice_event_v1(
  p_user_id uuid,
  p_device_id text,
  p_event_id uuid
)
returns table (
  event_id uuid,
  document_id uuid,
  identity_id uuid,
  event_type text,
  created_at timestamptz,
  full_number text,
  sequence integer,
  document_version integer,
  document_payload jsonb,
  emitted_hash text,
  safe_summary jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'get_central_invoice_event_v1 requires service_role';
  end if;

  if
    p_user_id is null
    or coalesce(p_device_id, '') = ''
    or p_event_id is null
  then
    raise exception 'invalid targeted central invoice event recovery request';
  end if;

  return query
    select
      o.id as event_id,
      d.id as document_id,
      i.id as identity_id,
      o.event_type,
      o.created_at,
      i.full_number,
      i.sequence,
      d.current_version as document_version,
      d.current_payload as document_payload,
      d.emitted_hash,
      o.safe_summary
    from public.central_invoice_outbox o
    join public.central_invoice_documents d on d.id = o.document_id
    join public.central_invoice_identities i on i.id = o.identity_id
    where o.id = p_event_id
      and o.user_id = p_user_id
      and d.user_id = p_user_id
      and i.user_id = p_user_id
      and d.lifecycle_status in ('issued', 'rectified', 'voided')
      and d.identity_id = i.id
      and o.identity_id = i.id
    limit 1;
end;
$$;

revoke all on function public.get_central_invoice_event_v1(
  uuid,
  text,
  uuid
) from public, anon, authenticated;

grant execute on function public.get_central_invoice_event_v1(
  uuid,
  text,
  uuid
) to service_role;

comment on function public.get_central_invoice_event_v1(
  uuid,
  text,
  uuid
) is
  'CENTRAL_INVOICE_AUTHORITY_TARGETED_EVENT_RECOVERY_V1 service-role-only, tenant-scoped lookup for automatic device recovery.';

commit;
