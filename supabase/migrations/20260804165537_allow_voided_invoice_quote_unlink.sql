-- CENTRAL_INVOICE_AUTHORITY_ALLOW_VOIDED_QUOTE_UNLINK_V1
-- Operational quote links may be removed from an annulled invoice without
-- changing its immutable fiscal snapshot, identity, totals or lifecycle.

begin;

create or replace function public.unlink_central_invoice_quote_v1(
  p_user_id uuid,
  p_device_id text,
  p_session_hash text,
  p_idempotency_key_hash text,
  p_request_hash text,
  p_document_id uuid,
  p_identity_id uuid,
  p_expected_version integer
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
  v_next_payload jsonb;
  v_non_operational_versions_after_expected integer;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then
    raise exception 'unlink_central_invoice_quote_v1 requires service_role';
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
  then
    raise exception 'invalid central invoice quote unlink command';
  end if;

  v_idempotency_key := 'central-relationship:' || p_idempotency_key_hash;

  select outbox_row.*
    into v_existing_outbox
    from public.central_invoice_outbox as outbox_row
    where outbox_row.user_id = p_user_id
      and outbox_row.idempotency_key = v_idempotency_key;

  if v_existing_outbox.id is not null then
    if v_existing_outbox.safe_summary->>'requestHash' is distinct from p_request_hash then
      raise exception 'idempotency key reused with different relationship request';
    end if;

    return query
      select
        'replayed'::text,
        document_row.id,
        identity_row.id,
        v_existing_outbox.id,
        identity_row.full_number,
        identity_row.sequence,
        document_row.current_version
      from public.central_invoice_documents as document_row
      join public.central_invoice_identities as identity_row
        on identity_row.id = v_existing_outbox.identity_id
      where document_row.id = v_existing_outbox.document_id
        and document_row.user_id = p_user_id;
    return;
  end if;

  select document_row.*
    into v_document
    from public.central_invoice_documents as document_row
    where document_row.id = p_document_id
      and document_row.user_id = p_user_id
    for update;

  if v_document.id is null then
    raise exception 'central invoice document not found';
  end if;
  if v_document.kind <> 'invoice' then
    raise exception 'central quote unlink only supports ordinary invoices';
  end if;
  if v_document.lifecycle_status not in ('issued', 'rectified', 'voided') then
    raise exception 'central quote unlink requires an issued or closed document';
  end if;
  if p_expected_version > v_document.current_version then
    raise exception 'central invoice relationship version mismatch';
  end if;

  if p_expected_version < v_document.current_version then
    select count(*)
      into v_non_operational_versions_after_expected
      from public.central_invoice_document_versions as version_row
      where version_row.document_id = v_document.id
        and version_row.user_id = p_user_id
        and version_row.version > p_expected_version
        and version_row.change_kind not in (
          'collection_status_updated',
          'quote_relationship_updated'
        );

    if coalesce(v_non_operational_versions_after_expected, 0) > 0 then
      raise exception 'central invoice relationship version mismatch';
    end if;
  end if;

  select identity_row.*
    into v_identity
    from public.central_invoice_identities as identity_row
    where identity_row.id = p_identity_id
      and identity_row.document_id = v_document.id
      and identity_row.user_id = p_user_id;

  if v_identity.id is null then
    raise exception 'central invoice identity mismatch';
  end if;
  if jsonb_typeof(v_document.current_payload) <> 'object' then
    raise exception 'central invoice relationship payload mismatch';
  end if;

  v_payload_document := case
    when v_document.current_payload ? 'document'
      then v_document.current_payload->'document'
    else v_document.current_payload
  end;

  if jsonb_typeof(v_payload_document) <> 'object'
    or v_payload_document->>'number' is distinct from v_identity.full_number
    or v_payload_document->>'type' is distinct from 'factura'
  then
    raise exception 'central invoice relationship payload mismatch';
  end if;

  v_payload_document :=
    (v_payload_document - 'sourceQuoteDocumentId' - 'sourceQuoteNumber');
  v_payload_document := jsonb_set(
    v_payload_document,
    '{updatedAt}',
    to_jsonb(statement_timestamp()::text),
    true
  );
  v_next_payload := case
    when v_document.current_payload ? 'document'
      then jsonb_set(
        v_document.current_payload,
        '{document}',
        v_payload_document,
        false
      )
    else v_payload_document
  end;

  v_next_version := v_document.current_version + 1;
  v_previous_hash := 'sha256:' || pg_catalog.encode(
    extensions.digest(
      pg_catalog.convert_to(v_document.current_payload::text, 'UTF8'),
      'sha256'
    ),
    'hex'
  );
  v_next_hash := 'sha256:' || pg_catalog.encode(
    extensions.digest(
      pg_catalog.convert_to(v_next_payload::text, 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  update public.central_invoice_documents as document_row
    set
      current_version = v_next_version,
      current_payload = v_next_payload,
      updated_at = statement_timestamp()
    where document_row.id = v_document.id;

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
    'quote_relationship_updated',
    v_previous_hash,
    v_next_hash,
    p_device_id,
    p_session_hash,
    jsonb_build_object(
      'fullNumber', v_identity.full_number,
      'sequence', v_identity.sequence,
      'eventType', 'invoice_relationship_updated',
      'quoteLink', 'unlinked',
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
    'invoice_relationship_updated',
    v_idempotency_key,
    jsonb_build_object(
      'kind', 'invoice',
      'fullNumber', v_identity.full_number,
      'sequence', v_identity.sequence,
      'documentVersion', v_next_version,
      'eventType', 'invoice_relationship_updated',
      'quoteLink', 'unlinked',
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

revoke all on function public.unlink_central_invoice_quote_v1(
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  integer
) from public, anon, authenticated;

grant execute on function public.unlink_central_invoice_quote_v1(
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  integer
) to service_role;

comment on function public.unlink_central_invoice_quote_v1(
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  integer
) is
  'Server-only operational quote unlink. Preserves emitted snapshot, hash, PDF, fiscal identity, number, totals and rectification chain.';

commit;
