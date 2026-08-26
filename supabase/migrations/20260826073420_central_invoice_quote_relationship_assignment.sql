-- CENTRAL_INVOICE_QUOTE_RELATIONSHIP_ASSIGNMENT_V1
-- Assigns, replaces or removes the operational quote relationship of an
-- issued invoice. Fiscal evidence remains immutable; the quote identity is
-- resolved from the same owner's central business authority.

begin;

create or replace function public.set_central_invoice_quote_relationship_v1(
  p_user_id uuid,
  p_device_id text,
  p_session_hash text,
  p_idempotency_key_hash text,
  p_request_hash text,
  p_document_id uuid,
  p_identity_id uuid,
  p_expected_version integer,
  p_quote_entity_id text
)
returns table (
  result_status text,
  document_id uuid,
  identity_id uuid,
  outbox_event_id uuid,
  full_number text,
  sequence integer,
  document_version integer,
  source_quote_document_id text,
  source_quote_number text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_document public.central_invoice_documents%rowtype;
  v_identity public.central_invoice_identities%rowtype;
  v_quote public.central_business_entities%rowtype;
  v_existing_outbox public.central_invoice_outbox%rowtype;
  v_conflicting_document_id uuid;
  v_outbox_id uuid;
  v_next_version integer;
  v_previous_hash text;
  v_next_hash text;
  v_idempotency_key text;
  v_payload_document jsonb;
  v_next_payload jsonb;
  v_quote_number text;
  v_previous_quote_id text;
  v_non_operational_versions_after_expected integer;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then
    raise exception using
      errcode = 'P4100',
      message = 'set_central_invoice_quote_relationship_v1 requires service_role';
  end if;

  if p_user_id is null
    or coalesce(p_device_id, '') = ''
    or coalesce(p_session_hash, '') = ''
    or coalesce(p_idempotency_key_hash, '') !~ '^[0-9a-f]{64}$'
    or coalesce(p_request_hash, '') !~ '^[0-9a-f]{64}$'
    or p_document_id is null
    or p_identity_id is null
    or p_expected_version is null
    or p_expected_version <= 0
    or (
      p_quote_entity_id is not null
      and length(p_quote_entity_id) not between 1 and 200
    )
  then
    raise exception using
      errcode = 'P4140',
      message = 'invalid central invoice quote relationship command';
  end if;

  v_idempotency_key := 'central-relationship:' || p_idempotency_key_hash;

  select outbox_row.*
    into v_existing_outbox
    from public.central_invoice_outbox as outbox_row
    where outbox_row.user_id = p_user_id
      and outbox_row.idempotency_key = v_idempotency_key;

  if v_existing_outbox.id is not null then
    if v_existing_outbox.safe_summary->>'requestHash'
      is distinct from p_request_hash
    then
      raise exception using
        errcode = 'P4102',
        message = 'idempotency key reused with different relationship request';
    end if;

    return query
      select
        'replayed'::text,
        document_row.id,
        identity_row.id,
        v_existing_outbox.id,
        identity_row.full_number,
        identity_row.sequence,
        coalesce(
          nullif(
            v_existing_outbox.safe_summary->>'documentVersion',
            ''
          )::integer,
          document_row.current_version
        ),
        nullif(
          v_existing_outbox.safe_summary->>'sourceQuoteDocumentId',
          ''
        ),
        nullif(
          v_existing_outbox.safe_summary->>'sourceQuoteNumber',
          ''
        )
      from public.central_invoice_documents as document_row
      join public.central_invoice_identities as identity_row
        on identity_row.id = v_existing_outbox.identity_id
      where document_row.id = v_existing_outbox.document_id
        and document_row.user_id = p_user_id
        and identity_row.user_id = p_user_id;
    return;
  end if;

  -- One relationship command per owner at a time prevents two invoices from
  -- claiming the same quote concurrently.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_user_id::text || ':central-invoice-quote-relationship',
      0
    )
  );

  select document_row.*
    into v_document
    from public.central_invoice_documents as document_row
    where document_row.id = p_document_id
      and document_row.user_id = p_user_id
    for update;

  if v_document.id is null then
    raise exception using
      errcode = 'P4141',
      message = 'central invoice document not found';
  end if;
  if v_document.kind <> 'invoice' then
    raise exception using
      errcode = 'P4140',
      message = 'central quote relationship only supports ordinary invoices';
  end if;
  if v_document.lifecycle_status not in ('issued', 'rectified', 'voided') then
    raise exception using
      errcode = 'P4140',
      message = 'central quote relationship requires an issued or closed document';
  end if;
  if p_expected_version > v_document.current_version then
    raise exception using
      errcode = 'P4103',
      message = 'central invoice relationship version mismatch';
  end if;

  if p_expected_version < v_document.current_version then
    select count(*)
      into v_non_operational_versions_after_expected
      from public.central_invoice_document_versions as version_row
      where version_row.document_id = v_document.id
        and version_row.user_id = p_user_id
        and version_row.version > p_expected_version
        and version_row.change_kind <> 'collection_status_updated';

    if coalesce(v_non_operational_versions_after_expected, 0) > 0 then
      raise exception using
        errcode = 'P4103',
        message = 'central invoice relationship version mismatch';
    end if;
  end if;

  select identity_row.*
    into v_identity
    from public.central_invoice_identities as identity_row
    where identity_row.id = p_identity_id
      and identity_row.document_id = v_document.id
      and identity_row.user_id = p_user_id;

  if v_identity.id is null then
    raise exception using
      errcode = 'P4140',
      message = 'central invoice identity mismatch';
  end if;
  if jsonb_typeof(v_document.current_payload) <> 'object' then
    raise exception using
      errcode = 'P4140',
      message = 'central invoice relationship payload mismatch';
  end if;

  v_payload_document := case
    when v_document.current_payload ? 'document'
      then v_document.current_payload->'document'
    else v_document.current_payload
  end;

  if jsonb_typeof(v_payload_document) <> 'object'
    or v_payload_document->>'number' is distinct from v_identity.full_number
    or v_payload_document->>'type' is distinct from 'factura'
    or v_payload_document ? 'rectification'
  then
    raise exception using
      errcode = 'P4140',
      message = 'central invoice relationship payload mismatch';
  end if;

  v_previous_quote_id := nullif(
    v_payload_document->>'sourceQuoteDocumentId',
    ''
  );

  if p_quote_entity_id is not null then
    select entity_row.*
      into v_quote
      from public.central_business_entities as entity_row
      where entity_row.user_id = p_user_id
        and entity_row.entity_type = 'quote'
        and entity_row.entity_id = p_quote_entity_id
        and not entity_row.deleted
      for update;

    if v_quote.id is null
      or jsonb_typeof(v_quote.current_payload) <> 'object'
      or v_quote.current_payload->>'id' is distinct from p_quote_entity_id
      or v_quote.current_payload->>'type' is distinct from 'presupuesto'
    then
      raise exception using
        errcode = 'P4141',
        message = 'central quote not found for this owner';
    end if;

    v_quote_number := nullif(v_quote.current_payload->>'number', '');
    if v_quote_number is null
      or (
        v_quote.authority_number is not null
        and v_quote.authority_number is distinct from v_quote_number
      )
    then
      raise exception using
        errcode = 'P4140',
        message = 'central quote identity mismatch';
    end if;

    select candidate.id
      into v_conflicting_document_id
      from public.central_invoice_documents as candidate
      where candidate.user_id = p_user_id
        and candidate.id <> v_document.id
        and candidate.kind = 'invoice'
        and candidate.lifecycle_status in ('issued', 'rectified', 'voided')
        and coalesce(
          candidate.current_payload #>> '{document,sourceQuoteDocumentId}',
          candidate.current_payload ->> 'sourceQuoteDocumentId'
        ) = p_quote_entity_id
      limit 1
      for update;

    if v_conflicting_document_id is not null then
      raise exception using
        errcode = 'P4142',
        message = 'central quote is already linked to another invoice';
    end if;
  else
    v_quote_number := null;
  end if;

  v_payload_document :=
    v_payload_document - 'sourceQuoteDocumentId' - 'sourceQuoteNumber';
  if p_quote_entity_id is not null then
    v_payload_document := v_payload_document || jsonb_build_object(
      'sourceQuoteDocumentId', p_quote_entity_id,
      'sourceQuoteNumber', v_quote_number
    );
  end if;
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
      'quoteLink', case
        when p_quote_entity_id is null then 'unlinked'
        when v_previous_quote_id is null then 'linked'
        else 'reassigned'
      end,
      'sourceQuoteDocumentId', p_quote_entity_id,
      'sourceQuoteNumber', v_quote_number,
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
      'quoteLink', case
        when p_quote_entity_id is null then 'unlinked'
        when v_previous_quote_id is null then 'linked'
        else 'reassigned'
      end,
      'sourceQuoteDocumentId', p_quote_entity_id,
      'sourceQuoteNumber', v_quote_number,
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
      v_next_version,
      p_quote_entity_id,
      v_quote_number;
end;
$$;

revoke all on function public.set_central_invoice_quote_relationship_v1(
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  integer,
  text
) from public, anon, authenticated;

grant execute on function public.set_central_invoice_quote_relationship_v1(
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  integer,
  text
) to service_role;

comment on function public.set_central_invoice_quote_relationship_v1(
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  integer,
  text
) is
  'Server-only operational quote assignment, reassignment and unlink. Resolves the quote inside the same owner and preserves all immutable fiscal evidence.';

commit;
