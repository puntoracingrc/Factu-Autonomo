-- CENTRAL_INVOICE_AUTHORITY_MATERIALIZED_SNAPSHOT_V1
-- Scope: replace provisional browser invoice numbers inside the private
-- central authority ledger before a fiscal issue command is committed.

begin;

create or replace function public.central_invoice_authority_materialize_full_number_v1(
  p_value jsonb,
  p_full_number text,
  p_pending_marker text default '__CENTRAL_AUTHORITY_FULL_NUMBER__'
)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if p_value is null then
    return null;
  end if;

  if coalesce(p_full_number, '') = ''
    or coalesce(p_pending_marker, '') = ''
  then
    raise exception 'central invoice materialization requires number and marker';
  end if;

  case jsonb_typeof(p_value)
    when 'string' then
      if p_value = pg_catalog.to_jsonb(p_pending_marker) then
        return pg_catalog.to_jsonb(p_full_number);
      end if;
      return p_value;
    when 'array' then
      select coalesce(
        jsonb_agg(
          public.central_invoice_authority_materialize_full_number_v1(
            element.value,
            p_full_number,
            p_pending_marker
          )
          order by element.ordinality
        ),
        '[]'::jsonb
      )
        into v_result
        from jsonb_array_elements(p_value) with ordinality as element(value, ordinality);
      return v_result;
    when 'object' then
      select coalesce(
        jsonb_object_agg(
          entry.key,
          public.central_invoice_authority_materialize_full_number_v1(
            entry.value,
            p_full_number,
            p_pending_marker
          )
        ),
        '{}'::jsonb
      )
        into v_result
        from jsonb_each(p_value) as entry(key, value);
      return v_result;
    else
      return p_value;
  end case;
end;
$$;

revoke all on function public.central_invoice_authority_materialize_full_number_v1(
  jsonb,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.central_invoice_authority_materialize_full_number_v1(
  jsonb,
  text,
  text
) to service_role;

comment on function public.central_invoice_authority_materialize_full_number_v1(
  jsonb,
  text,
  text
) is
  'CENTRAL_INVOICE_AUTHORITY_MATERIALIZED_SNAPSHOT_V1 private recursive JSONB final invoice number materializer.';

create or replace function public.issue_central_invoice_v1(
  p_user_id uuid,
  p_device_id text,
  p_session_hash text,
  p_idempotency_key_hash text,
  p_request_hash text,
  p_kind text,
  p_local_document_id text,
  p_expected_version integer,
  p_draft_hash text,
  p_environment text,
  p_issuer_nif text,
  p_series_code text,
  p_fiscal_year integer,
  p_issued_at timestamptz,
  p_document_payload jsonb,
  p_emitted_snapshot jsonb,
  p_emitted_hash text,
  p_rectifies_identity_id uuid default null
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
  v_identity_id uuid;
  v_outbox_id uuid;
  v_next_sequence integer;
  v_next_version integer;
  v_full_number text;
  v_event_type text;
  v_pending_marker text := '__CENTRAL_AUTHORITY_FULL_NUMBER__';
  v_materialized_payload jsonb;
  v_materialized_snapshot jsonb;
  v_materialized_hash text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'issue_central_invoice_v1 requires service_role';
  end if;

  if p_user_id is null
    or coalesce(p_device_id, '') = ''
    or coalesce(p_session_hash, '') = ''
    or coalesce(p_idempotency_key_hash, '') = ''
    or coalesce(p_request_hash, '') = ''
    or coalesce(p_kind, '') not in ('invoice', 'rectification')
    or coalesce(p_local_document_id, '') = ''
    or p_expected_version is null
    or p_expected_version < 0
    or coalesce(p_draft_hash, '') = ''
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
    raise exception 'invalid central invoice issue command';
  end if;

  if p_kind = 'rectification' and p_rectifies_identity_id is null then
    raise exception 'rectification requires rectified identity';
  end if;

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
    p_kind,
    p_local_document_id,
    p_expected_version,
    p_draft_hash,
    p_device_id,
    p_session_hash
  )
  on conflict (user_id, idempotency_key_hash)
  do update set idempotency_key_hash = excluded.idempotency_key_hash
  returning * into v_command;

  if v_command.request_hash <> p_request_hash then
    raise exception 'idempotency key reused with different request';
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

  if p_expected_version = 0 then
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
      p_kind,
      0,
      p_document_payload,
      p_draft_hash
    )
    on conflict (user_id, local_document_id) do nothing;
  end if;

  select *
    into v_document
    from public.central_invoice_documents
    where user_id = p_user_id
      and local_document_id = p_local_document_id
    for update;

  if v_document.id is null then
    raise exception 'central invoice draft not found';
  end if;

  if v_document.kind <> p_kind then
    raise exception 'central invoice draft kind mismatch';
  end if;

  if v_document.lifecycle_status = 'issued' then
    raise exception 'central invoice draft is already issued';
  end if;

  if v_document.current_version <> p_expected_version then
    raise exception 'central invoice draft version mismatch';
  end if;

  if v_document.draft_hash is not null and v_document.draft_hash <> p_draft_hash then
    raise exception 'central invoice draft hash mismatch';
  end if;

  insert into public.central_invoice_series_state (
    user_id,
    environment,
    issuer_nif,
    series_code,
    fiscal_year
  )
  values (
    p_user_id,
    p_environment,
    p_issuer_nif,
    p_series_code,
    p_fiscal_year
  )
  on conflict (
    user_id,
    environment,
    issuer_nif,
    series_code,
    fiscal_year
  ) do nothing;

  select *
    into v_series
    from public.central_invoice_series_state
    where user_id = p_user_id
      and environment = p_environment
      and issuer_nif = p_issuer_nif
      and series_code = p_series_code
      and fiscal_year = p_fiscal_year
    for update;

  v_next_sequence := v_series.last_sequence + 1;
  v_next_version := v_document.current_version + 1;
  v_full_number := p_series_code || '-' || lpad(v_next_sequence::text, 4, '0');
  v_event_type := case
    when p_kind = 'rectification' then 'rectification_issued'
    else 'invoice_issued'
  end;
  v_materialized_payload :=
    public.central_invoice_authority_materialize_full_number_v1(
      p_document_payload,
      v_full_number,
      v_pending_marker
    );
  v_materialized_snapshot :=
    public.central_invoice_authority_materialize_full_number_v1(
      p_emitted_snapshot,
      v_full_number,
      v_pending_marker
    );

  if position(v_pending_marker in v_materialized_payload::text) > 0
    or position(v_pending_marker in v_materialized_snapshot::text) > 0
  then
    raise exception 'central invoice snapshot materialization incomplete';
  end if;

  if position(pg_catalog.to_jsonb(v_full_number)::text in v_materialized_payload::text) = 0
    or position(pg_catalog.to_jsonb(v_full_number)::text in v_materialized_snapshot::text) = 0
  then
    raise exception 'central invoice materialized number missing';
  end if;

  v_materialized_hash :=
    'sha256:' || pg_catalog.encode(
      extensions.digest(
        pg_catalog.convert_to(v_materialized_snapshot::text, 'UTF8'),
        'sha256'
      ),
      'hex'
    );

  update public.central_invoice_series_state
    set
      last_sequence = v_next_sequence,
      state_version = state_version + 1,
      updated_at = statement_timestamp()
    where id = v_series.id;

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
    v_next_sequence,
    v_full_number,
    p_issued_at,
    p_rectifies_identity_id
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
    'central-issue:' || v_command.id::text,
    jsonb_build_object(
      'kind', p_kind,
      'environment', p_environment,
      'seriesCode', p_series_code,
      'fiscalYear', p_fiscal_year,
      'sequence', v_next_sequence,
      'fullNumber', v_full_number,
      'materializedSnapshotHash', v_materialized_hash
    )
  )
  returning id into v_outbox_id;

  update public.central_invoice_documents
    set
      lifecycle_status = 'issued',
      current_version = v_next_version,
      current_payload = v_materialized_payload,
      emitted_snapshot = v_materialized_snapshot,
      draft_hash = p_draft_hash,
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
    v_next_version,
    case
      when p_kind = 'rectification' then 'rectification_committed'
      else 'issue_committed'
    end,
    v_document.emitted_hash,
    v_materialized_hash,
    p_device_id,
    p_session_hash,
    jsonb_build_object(
      'fullNumber', v_full_number,
      'sequence', v_next_sequence,
      'eventType', v_event_type,
      'hashSource', 'server_materialized_snapshot_v1'
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
      v_full_number,
      v_next_sequence,
      v_next_version;
end;
$$;

revoke all on function public.issue_central_invoice_v1(
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
  text,
  integer,
  timestamptz,
  jsonb,
  jsonb,
  text,
  uuid
) from public, anon, authenticated;

grant execute on function public.issue_central_invoice_v1(
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
  text,
  integer,
  timestamptz,
  jsonb,
  jsonb,
  text,
  uuid
) to service_role;

comment on function public.issue_central_invoice_v1(
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
  text,
  integer,
  timestamptz,
  jsonb,
  jsonb,
  text,
  uuid
) is
  'CENTRAL_INVOICE_AUTHORITY_MATERIALIZED_SNAPSHOT_V1 service-role-only transactional central invoice issuance with server-materialized final number.';

commit;
