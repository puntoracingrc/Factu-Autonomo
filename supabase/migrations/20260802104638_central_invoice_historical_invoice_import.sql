-- CENTRAL_INVOICE_AUTHORITY_HISTORICAL_IMPORT_V1
-- Scope: transactional, service-role-only registration of already-issued
-- invoices whose fiscal identity was assigned locally before the cutover.
-- It never advances the central series counter.

begin;

create or replace function public.import_central_invoice_historical_v1(
  p_user_id uuid,
  p_device_id text,
  p_session_hash text,
  p_idempotency_key_hash text,
  p_request_hash text,
  p_local_document_id text,
  p_expected_full_number text,
  p_sequence integer,
  p_environment text,
  p_issuer_nif text,
  p_series_code text,
  p_fiscal_year integer,
  p_issued_at timestamptz,
  p_document_payload jsonb,
  p_emitted_snapshot jsonb,
  p_emitted_hash text
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
  v_command public.central_invoice_commands%rowtype;
  v_document public.central_invoice_documents%rowtype;
  v_series public.central_invoice_series_state%rowtype;
  v_existing_identity public.central_invoice_identities%rowtype;
  v_identity_id uuid;
  v_outbox_id uuid;
  v_payload_number text;
  v_snapshot_number text;
  v_event_type text := 'invoice_issued';
  v_materialized_hash text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'import_central_invoice_historical_v1 requires service_role';
  end if;

  if p_user_id is null
    or coalesce(p_device_id, '') = ''
    or coalesce(p_session_hash, '') = ''
    or coalesce(p_idempotency_key_hash, '') = ''
    or coalesce(p_request_hash, '') = ''
    or coalesce(p_local_document_id, '') = ''
    or coalesce(p_expected_full_number, '') = ''
    or p_sequence is null
    or p_sequence <= 0
    or coalesce(p_environment, '') not in ('test', 'production')
    or coalesce(p_issuer_nif, '') = ''
    or coalesce(p_series_code, '') = ''
    or p_fiscal_year is null
    or p_fiscal_year < 2000
    or p_fiscal_year > 2100
    or p_issued_at is null
    or p_document_payload is null
    or p_emitted_snapshot is null
    or coalesce(p_emitted_hash, '') = ''
  then
    raise exception 'invalid central invoice historical import command';
  end if;

  if p_expected_full_number <> p_series_code || '-' || lpad(p_sequence::text, 4, '0') then
    raise exception 'historical invoice number does not match series and sequence';
  end if;

  v_payload_number := coalesce(
    p_document_payload #>> '{document,number}',
    p_document_payload ->> 'number'
  );
  if upper(btrim(coalesce(v_payload_number, ''))) <> upper(btrim(p_expected_full_number)) then
    raise exception 'historical invoice payload number mismatch';
  end if;

  v_snapshot_number := p_emitted_snapshot ->> 'number';
  if v_snapshot_number is not null
    and upper(btrim(v_snapshot_number)) <> upper(btrim(p_expected_full_number))
  then
    raise exception 'historical invoice snapshot number mismatch';
  end if;

  v_materialized_hash :=
    'sha256:' || pg_catalog.encode(
      extensions.digest(
        pg_catalog.convert_to(p_emitted_snapshot::text, 'UTF8'),
        'sha256'
      ),
      'hex'
    );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_user_id::text || ':central-historical-invoice:' || p_expected_full_number,
      0
    )
  );

  insert into public.central_invoice_commands (
    user_id,
    idempotency_key_hash,
    request_hash,
    status,
    kind,
    local_document_id,
    expected_version,
    draft_hash,
    device_id,
    session_hash
  )
  values (
    p_user_id,
    p_idempotency_key_hash,
    p_request_hash,
    'pending',
    'invoice',
    p_local_document_id,
    0,
    v_materialized_hash,
    p_device_id,
    p_session_hash
  )
  on conflict (user_id, idempotency_key_hash)
  do update set idempotency_key_hash = excluded.idempotency_key_hash
  returning * into v_command;

  if v_command.request_hash <> p_request_hash then
    raise exception 'historical invoice import idempotency key reused with different request';
  end if;

  if v_command.status = 'committed' then
    return query
      select
        'replayed'::text,
        d.id,
        i.id,
        o.id,
        i.full_number,
        i.sequence,
        d.current_version
      from public.central_invoice_documents d
      join public.central_invoice_identities i on i.id = v_command.result_identity_id
      join public.central_invoice_outbox o on o.id = v_command.result_outbox_event_id
      where d.id = v_command.result_document_id;
    return;
  end if;

  if v_command.status = 'failed' then
    update public.central_invoice_commands
      set
        status = 'pending',
        error_code = null,
        error_message = null,
        completed_at = null,
        result_document_id = null,
        result_identity_id = null,
        result_outbox_event_id = null
      where id = v_command.id;
  end if;

  select *
    into v_series
    from public.central_invoice_series_state
    where user_id = p_user_id
      and environment = p_environment
      and issuer_nif = p_issuer_nif
      and series_code = p_series_code
      and fiscal_year = p_fiscal_year
    for update;

  if not found then
    raise exception 'central invoice series state unavailable';
  end if;

  if v_series.last_sequence < p_sequence then
    raise exception 'historical invoice sequence exceeds central series state';
  end if;

  insert into public.central_invoice_documents (
    user_id,
    local_document_id,
    kind,
    current_version,
    current_payload,
    draft_hash
  )
  values (
    p_user_id,
    p_local_document_id,
    'invoice',
    0,
    p_document_payload,
    v_materialized_hash
  )
  on conflict (user_id, local_document_id) do nothing;

  select *
    into v_document
    from public.central_invoice_documents
    where user_id = p_user_id
      and local_document_id = p_local_document_id
    for update;

  if not found then
    raise exception 'central historical invoice document unavailable';
  end if;

  if v_document.kind <> 'invoice' then
    raise exception 'central historical invoice kind mismatch';
  end if;

  if v_document.lifecycle_status = 'issued' then
    select *
      into v_existing_identity
      from public.central_invoice_identities
      where document_id = v_document.id
        and user_id = p_user_id;

    if not found
      or v_existing_identity.environment <> p_environment
      or v_existing_identity.issuer_nif <> p_issuer_nif
      or v_existing_identity.series_code <> p_series_code
      or v_existing_identity.fiscal_year <> p_fiscal_year
      or v_existing_identity.sequence <> p_sequence
      or v_existing_identity.full_number <> p_expected_full_number
    then
      raise exception 'central historical invoice already issued with different identity';
    end if;

    select id
      into v_outbox_id
      from public.central_invoice_outbox
      where user_id = p_user_id
        and document_id = v_document.id
        and identity_id = v_existing_identity.id
        and event_type = v_event_type
      order by created_at asc, id asc
      limit 1;

    if not found then
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
        v_existing_identity.id,
        v_event_type,
        'central-historical-import:' || v_command.id::text,
        jsonb_build_object(
          'kind', 'invoice',
          'environment', p_environment,
          'seriesCode', p_series_code,
          'fiscalYear', p_fiscal_year,
          'sequence', p_sequence,
          'fullNumber', p_expected_full_number,
          'historicalImport', true,
          'materializedSnapshotHash', v_materialized_hash
        )
      )
      returning id into v_outbox_id;
    end if;

    update public.central_invoice_commands
      set
        status = 'committed',
        result_document_id = v_document.id,
        result_identity_id = v_existing_identity.id,
        result_outbox_event_id = v_outbox_id,
        completed_at = statement_timestamp(),
        error_code = null,
        error_message = null
      where id = v_command.id;

    return query
      select
        'already_present'::text,
        v_document.id,
        v_existing_identity.id,
        v_outbox_id,
        v_existing_identity.full_number,
        v_existing_identity.sequence,
        v_document.current_version;
    return;
  end if;

  if v_document.lifecycle_status <> 'draft' then
    raise exception 'central historical invoice document is not importable';
  end if;

  if v_document.current_version <> 0 then
    raise exception 'central historical invoice draft version mismatch';
  end if;

  if v_document.draft_hash is not null and v_document.draft_hash <> v_materialized_hash then
    raise exception 'central historical invoice draft hash mismatch';
  end if;

  if exists (
    select 1
      from public.central_invoice_identities as identity
      where identity.user_id = p_user_id
        and identity.environment = p_environment
        and identity.issuer_nif = p_issuer_nif
        and identity.series_code = p_series_code
        and identity.fiscal_year = p_fiscal_year
        and (
          identity.sequence = p_sequence
          or identity.full_number = p_expected_full_number
        )
        and identity.document_id <> v_document.id
  ) then
    raise exception 'central historical invoice identity already reserved';
  end if;

  insert into public.central_invoice_identities (
    document_id,
    user_id,
    environment,
    issuer_nif,
    series_code,
    fiscal_year,
    sequence,
    full_number,
    issued_at,
    rectifies_identity_id
  )
  values (
    v_document.id,
    p_user_id,
    p_environment,
    p_issuer_nif,
    p_series_code,
    p_fiscal_year,
    p_sequence,
    p_expected_full_number,
    p_issued_at,
    null
  )
  returning id into v_identity_id;

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
    v_identity_id,
    v_event_type,
    'central-historical-import:' || v_command.id::text,
    jsonb_build_object(
      'kind', 'invoice',
      'environment', p_environment,
      'seriesCode', p_series_code,
      'fiscalYear', p_fiscal_year,
      'sequence', p_sequence,
      'fullNumber', p_expected_full_number,
      'historicalImport', true,
      'materializedSnapshotHash', v_materialized_hash
    )
  )
  returning id into v_outbox_id;

  update public.central_invoice_documents
    set
      lifecycle_status = 'issued',
      current_version = 1,
      current_payload = p_document_payload,
      emitted_snapshot = p_emitted_snapshot,
      draft_hash = v_materialized_hash,
      emitted_hash = v_materialized_hash,
      identity_id = v_identity_id,
      locked_at = statement_timestamp(),
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
    1,
    'issue_committed',
    null,
    v_materialized_hash,
    p_device_id,
    p_session_hash,
    jsonb_build_object(
      'fullNumber', p_expected_full_number,
      'sequence', p_sequence,
      'eventType', v_event_type,
      'historicalImport', true,
      'hashSource', 'historical_snapshot_v1'
    )
  );

  update public.central_invoice_commands
    set
      status = 'committed',
      result_document_id = v_document.id,
      result_identity_id = v_identity_id,
      result_outbox_event_id = v_outbox_id,
      completed_at = statement_timestamp(),
      error_code = null,
      error_message = null
    where id = v_command.id;

  return query
    select
      'committed'::text,
      v_document.id,
      v_identity_id,
      v_outbox_id,
      p_expected_full_number,
      p_sequence,
      1;
end;
$$;

revoke all on function public.import_central_invoice_historical_v1(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  text,
  text,
  text,
  integer,
  timestamptz,
  jsonb,
  jsonb,
  text
) from public, anon, authenticated;

grant execute on function public.import_central_invoice_historical_v1(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  text,
  text,
  text,
  integer,
  timestamptz,
  jsonb,
  jsonb,
  text
) to service_role;

comment on function public.import_central_invoice_historical_v1(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  text,
  text,
  text,
  integer,
  timestamptz,
  jsonb,
  jsonb,
  text
) is
  'CENTRAL_INVOICE_AUTHORITY_HISTORICAL_IMPORT_V1 service-role-only transactional import of already-issued invoices without advancing central series state.';

commit;
