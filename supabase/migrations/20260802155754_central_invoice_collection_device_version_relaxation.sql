-- CENTRAL_INVOICE_AUTHORITY_COLLECTION_STATUS_EVENTS_V2
-- Scope: keep collection status operational and cross-device without changing
-- fiscal identity, emitted snapshots or hashes.

begin;

create or replace function public.update_central_invoice_collection_v1(
  p_user_id uuid,
  p_device_id text,
  p_session_hash text,
  p_idempotency_key_hash text,
  p_request_hash text,
  p_document_id uuid,
  p_identity_id uuid,
  p_expected_version integer,
  p_status text,
  p_payment_status text,
  p_paid_at timestamptz,
  p_document_payload jsonb
)
returns table (
  result_status text,
  document_id uuid,
  identity_id uuid,
  outbox_event_id uuid,
  full_number text,
  sequence integer,
  document_version integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_document public.central_invoice_documents%rowtype;
  v_identity public.central_invoice_identities%rowtype;
  v_existing_outbox public.central_invoice_outbox%rowtype;
  v_outbox_id uuid;
  v_next_version integer;
  v_previous_hash text;
  v_next_hash text;
  v_idempotency_key text;
  v_payload_document jsonb;
  v_payload_local_document_id text;
  v_non_collection_versions_after_expected integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'update_central_invoice_collection_v1 requires service_role';
  end if;

  if p_user_id is null
    or coalesce(p_device_id, '') = ''
    or coalesce(p_session_hash, '') = ''
    or coalesce(p_idempotency_key_hash, '') = ''
    or coalesce(p_request_hash, '') = ''
    or p_document_id is null
    or p_identity_id is null
    or p_expected_version is null
    or p_expected_version <= 0
    or p_document_payload is null
    or jsonb_typeof(p_document_payload) <> 'object'
  then
    raise exception 'invalid central invoice collection command';
  end if;

  if not (
    (p_status = 'pagado' and p_payment_status = 'paid' and p_paid_at is not null)
    or (p_status = 'enviado' and p_payment_status = 'pending' and p_paid_at is null)
    or (p_status = 'vencido' and p_payment_status = 'overdue' and p_paid_at is null)
  ) then
    raise exception 'invalid central invoice collection status';
  end if;

  v_idempotency_key := 'central-collection:' || p_idempotency_key_hash;

  select *
    into v_existing_outbox
    from public.central_invoice_outbox
    where user_id = p_user_id
      and idempotency_key = v_idempotency_key;

  if v_existing_outbox.id is not null then
    if v_existing_outbox.safe_summary->>'requestHash' is distinct from p_request_hash then
      raise exception 'idempotency key reused with different collection request';
    end if;

    return query
      select
        'replayed'::text,
        d.id,
        i.id,
        v_existing_outbox.id,
        i.full_number,
        i.sequence,
        d.current_version
      from public.central_invoice_documents d
      join public.central_invoice_identities i on i.id = v_existing_outbox.identity_id
      where d.id = v_existing_outbox.document_id;
    return;
  end if;

  select *
    into v_document
    from public.central_invoice_documents
    where id = p_document_id
      and user_id = p_user_id
    for update;

  if v_document.id is null then
    raise exception 'central invoice document not found';
  end if;

  if v_document.kind <> 'invoice' then
    raise exception 'central invoice collection only supports ordinary invoices';
  end if;

  if p_expected_version > v_document.current_version then
    raise exception 'central invoice collection version mismatch';
  end if;

  if p_expected_version < v_document.current_version then
    select count(*)
      into v_non_collection_versions_after_expected
      from public.central_invoice_document_versions
      where document_id = v_document.id
        and user_id = p_user_id
        and version > p_expected_version
        and change_kind <> 'collection_status_updated';

    if coalesce(v_non_collection_versions_after_expected, 0) > 0 then
      raise exception 'central invoice collection version mismatch';
    end if;
  end if;

  if v_document.lifecycle_status not in ('issued', 'rectified') then
    raise exception 'central invoice collection requires issued document';
  end if;

  select *
    into v_identity
    from public.central_invoice_identities
    where id = p_identity_id
      and document_id = v_document.id
      and user_id = p_user_id;

  if v_identity.id is null then
    raise exception 'central invoice identity mismatch';
  end if;

  v_payload_document := case
    when p_document_payload ? 'document' then p_document_payload->'document'
    else p_document_payload
  end;
  v_payload_local_document_id := coalesce(
    nullif(v_payload_document->>'id', ''),
    nullif(p_document_payload->>'localDocumentId', '')
  );

  if jsonb_typeof(v_payload_document) <> 'object'
    or v_payload_local_document_id is null
    or v_payload_document->>'number' is distinct from v_identity.full_number
    or v_payload_document->>'type' is distinct from 'factura'
    or v_payload_document->>'status' is distinct from p_status
    or v_payload_document->>'paymentStatus' is distinct from p_payment_status
    or (
      p_paid_at is null
      and v_payload_document ? 'paidAt'
      and v_payload_document->>'paidAt' is not null
    )
    or (
      p_paid_at is not null
      and (v_payload_document->>'paidAt')::timestamptz is distinct from p_paid_at
    )
  then
    raise exception 'central invoice collection payload mismatch';
  end if;

  v_next_version := v_document.current_version + 1;
  v_previous_hash := coalesce(
    v_document.emitted_hash,
    'sha256:' || pg_catalog.encode(
      extensions.digest(
        pg_catalog.convert_to(v_document.current_payload::text, 'UTF8'),
        'sha256'
      ),
      'hex'
    )
  );
  v_next_hash := 'sha256:' || pg_catalog.encode(
    extensions.digest(
      pg_catalog.convert_to(p_document_payload::text, 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  update public.central_invoice_documents
    set
      current_version = v_next_version,
      current_payload = p_document_payload,
      updated_at = statement_timestamp()
    where id = v_document.id;

  insert into public.central_invoice_document_versions (
    document_id,
    user_id,
    version,
    change_kind,
    previous_hash,
    next_hash,
    actor_device_id,
    actor_session_hash,
    safe_summary
  )
  values (
    v_document.id,
    p_user_id,
    v_next_version,
    'collection_status_updated',
    v_previous_hash,
    v_next_hash,
    p_device_id,
    p_session_hash,
    jsonb_build_object(
      'fullNumber', v_identity.full_number,
      'sequence', v_identity.sequence,
      'eventType', 'invoice_collection_updated',
      'status', p_status,
      'paymentStatus', p_payment_status,
      'paidAt', case when p_paid_at is null then null else p_paid_at end,
      'payloadHash', v_next_hash
    )
  );

  insert into public.central_invoice_outbox (
    user_id,
    document_id,
    identity_id,
    event_type,
    idempotency_key,
    safe_summary
  )
  values (
    p_user_id,
    v_document.id,
    v_identity.id,
    'invoice_collection_updated',
    v_idempotency_key,
    jsonb_build_object(
      'kind', 'invoice',
      'fullNumber', v_identity.full_number,
      'sequence', v_identity.sequence,
      'documentVersion', v_next_version,
      'eventType', 'invoice_collection_updated',
      'status', p_status,
      'paymentStatus', p_payment_status,
      'paidAt', case when p_paid_at is null then null else p_paid_at end,
      'payloadHash', v_next_hash,
      'requestHash', p_request_hash
    )
  )
  returning id into v_outbox_id;

  return query
    select
      'committed'::text,
      v_document.id,
      v_identity.id,
      v_outbox_id,
      v_identity.full_number,
      v_identity.sequence,
      v_next_version;
end;
$$;

revoke all on function public.update_central_invoice_collection_v1(
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  integer,
  text,
  text,
  timestamptz,
  jsonb
) from public, anon, authenticated;

grant execute on function public.update_central_invoice_collection_v1(
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  integer,
  text,
  text,
  timestamptz,
  jsonb
) to service_role;

comment on function public.update_central_invoice_collection_v1(
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  integer,
  text,
  text,
  timestamptz,
  jsonb
) is
  'CENTRAL_INVOICE_AUTHORITY_COLLECTION_STATUS_EVENTS_V2 server-only operational collection status update tolerant to adopted-device local ids and collection-only stale versions.';

commit;
