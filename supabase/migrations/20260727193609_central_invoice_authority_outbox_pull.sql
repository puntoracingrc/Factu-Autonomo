-- CENTRAL_INVOICE_AUTHORITY_OUTBOX_PULL_V1
-- Scope: private service-role RPC for authenticated devices to pull central
-- invoice authority events after a cursor. It does not expose browser grants.

begin;

create or replace function public.list_central_invoice_events_v1(
  p_user_id uuid,
  p_device_id text,
  p_after_created_at timestamptz default null,
  p_after_event_id uuid default null,
  p_limit integer default 50
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
declare
  v_limit integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'list_central_invoice_events_v1 requires service_role';
  end if;

  if p_user_id is null or coalesce(p_device_id, '') = '' then
    raise exception 'invalid central invoice event pull request';
  end if;

  v_limit := least(greatest(coalesce(p_limit, 50), 1), 100);

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
    where o.user_id = p_user_id
      and d.user_id = p_user_id
      and i.user_id = p_user_id
      and d.lifecycle_status = 'issued'
      and d.identity_id = i.id
      and o.identity_id = i.id
      and (
        p_after_created_at is null
        or o.created_at > p_after_created_at
        or (
          o.created_at = p_after_created_at
          and p_after_event_id is not null
          and o.id::text > p_after_event_id::text
        )
      )
    order by o.created_at asc, o.id asc
    limit v_limit;
end;
$$;

revoke all on function public.list_central_invoice_events_v1(
  uuid,
  text,
  timestamptz,
  uuid,
  integer
) from public, anon, authenticated;

grant execute on function public.list_central_invoice_events_v1(
  uuid,
  text,
  timestamptz,
  uuid,
  integer
) to service_role;

comment on function public.list_central_invoice_events_v1(
  uuid,
  text,
  timestamptz,
  uuid,
  integer
) is
  'CENTRAL_INVOICE_AUTHORITY_OUTBOX_PULL_V1 service-role-only central invoice event pull for verified devices.';

commit;
