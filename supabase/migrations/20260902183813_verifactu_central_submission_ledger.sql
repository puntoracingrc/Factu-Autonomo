-- VERIFACTU_CENTRAL_SUBMISSION_LEDGER_V1
-- Test-only, server-only ledger. A generated record advances the local fiscal
-- chain atomically with its first durable transport attempt. Ambiguous delivery
-- is retried with the exact same immutable XML.

begin;

create table public.central_verifactu_chain_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  issuer_nif text not null,
  environment text not null,
  last_record_id uuid,
  last_hash text not null default '',
  last_numserie text,
  last_fecha_expedicion date,
  record_count integer not null default 0,
  state_version integer not null default 0,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint central_verifactu_chain_scope_uidx
    unique (user_id, issuer_nif, environment),
  constraint central_verifactu_chain_nif_check
    check (issuer_nif ~ '^[A-Z0-9]{9}$'),
  constraint central_verifactu_chain_test_only_check
    check (environment = 'test'),
  constraint central_verifactu_chain_hash_check
    check (last_hash = '' or last_hash ~ '^[A-F0-9]{64}$'),
  constraint central_verifactu_chain_count_check
    check (record_count >= 0 and state_version >= 0),
  constraint central_verifactu_chain_head_check
    check (
      (
        record_count = 0
        and last_record_id is null
        and last_hash = ''
        and last_numserie is null
        and last_fecha_expedicion is null
      )
      or (
        record_count > 0
        and last_record_id is not null
        and last_hash <> ''
        and coalesce(last_numserie, '') <> ''
        and last_fecha_expedicion is not null
      )
    )
);

create table public.central_verifactu_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  central_document_id uuid not null
    references public.central_invoice_documents(id) on delete restrict,
  central_identity_id uuid not null
    references public.central_invoice_identities(id) on delete restrict,
  issuer_nif text not null,
  environment text not null,
  record_type text not null,
  record_hash text not null,
  previous_hash text not null default '',
  record_timestamp_text text not null,
  numserie text not null,
  fecha_expedicion date not null,
  tipo_factura text,
  xml_payload text not null,
  xml_sha256 text not null,
  qr_url text not null default '',
  status text not null default 'prepared',
  csv text,
  aeat_estado_envio text,
  aeat_estado_registro text,
  aeat_duplicate_state text,
  aeat_error_code text,
  aeat_error_message text,
  accepted_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint central_verifactu_record_identity_uidx
    unique (user_id, central_identity_id, environment),
  constraint central_verifactu_record_nif_check
    check (issuer_nif ~ '^[A-Z0-9]{9}$'),
  constraint central_verifactu_record_test_only_check
    check (environment = 'test'),
  constraint central_verifactu_record_type_check
    check (record_type in ('alta', 'anulacion')),
  constraint central_verifactu_record_hash_check
    check (
      record_hash ~ '^[A-F0-9]{64}$'
      and (previous_hash = '' or previous_hash ~ '^[A-F0-9]{64}$')
      and xml_sha256 ~ '^[a-f0-9]{64}$'
    ),
  constraint central_verifactu_record_material_check
    check (
      coalesce(numserie, '') <> ''
      and coalesce(record_timestamp_text, '') <> ''
      and octet_length(xml_payload) between 1 and 1048576
    ),
  constraint central_verifactu_record_status_check
    check (
      status in (
        'prepared',
        'sending',
        'delivery_unknown',
        'accepted',
        'accepted_with_errors',
        'rejected'
      )
    ),
  constraint central_verifactu_record_acceptance_check
    check (
      (
        status in ('accepted', 'accepted_with_errors')
        and coalesce(csv, '') <> ''
        and accepted_at is not null
      )
      or (
        status not in ('accepted', 'accepted_with_errors')
        and accepted_at is null
      )
    )
);

alter table public.central_verifactu_chain_state
  add constraint central_verifactu_chain_last_record_fk
  foreign key (last_record_id)
  references public.central_verifactu_records(id)
  on delete restrict
  deferrable initially deferred;

create table public.central_verifactu_transport_attempts (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null
    references public.central_verifactu_records(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  certificate_binding_id uuid not null
    references public.verifactu_certificate_bindings(id) on delete restrict,
  certificate_binding_version integer not null,
  attempt_number integer not null,
  request_sha256 text not null,
  endpoint_url text not null,
  status text not null default 'queued',
  lease_token uuid,
  lease_expires_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  outcome text,
  http_status integer,
  response_sha256 text,
  response_payload text,
  error_code text,
  error_message text,
  created_at timestamptz not null default statement_timestamp(),
  constraint central_verifactu_attempt_number_uidx
    unique (record_id, attempt_number),
  constraint central_verifactu_attempt_number_check
    check (attempt_number > 0 and certificate_binding_version > 0),
  constraint central_verifactu_attempt_hash_check
    check (
      request_sha256 ~ '^[a-f0-9]{64}$'
      and (response_sha256 is null or response_sha256 ~ '^[a-f0-9]{64}$')
    ),
  constraint central_verifactu_attempt_endpoint_check
    check (
      endpoint_url ~ '^https://prewww(1|10)[.]aeat[.]es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP$'
    ),
  constraint central_verifactu_attempt_status_check
    check (
      status in ('queued', 'sending', 'completed', 'delivery_unknown', 'superseded')
    ),
  constraint central_verifactu_attempt_outcome_check
    check (
      outcome is null
      or outcome in (
        'accepted',
        'accepted_duplicate',
        'accepted_with_errors',
        'rejected',
        'delivery_unknown',
        'certificate_rotated'
      )
    ),
  constraint central_verifactu_attempt_state_check
    check (
      (
        status = 'queued'
        and lease_token is null
        and lease_expires_at is null
        and started_at is null
        and completed_at is null
        and outcome is null
      )
      or (
        status = 'sending'
        and lease_token is not null
        and lease_expires_at is not null
        and started_at is not null
        and completed_at is null
        and outcome is null
      )
      or (
        status = 'completed'
        and lease_token is null
        and lease_expires_at is null
        and started_at is not null
        and completed_at is not null
        and outcome in (
          'accepted',
          'accepted_duplicate',
          'accepted_with_errors',
          'rejected'
        )
      )
      or (
        status = 'delivery_unknown'
        and lease_token is null
        and lease_expires_at is null
        and started_at is not null
        and completed_at is not null
        and outcome = 'delivery_unknown'
      )
      or (
        status = 'superseded'
        and lease_token is null
        and lease_expires_at is null
        and started_at is null
        and completed_at is not null
        and outcome = 'certificate_rotated'
      )
    ),
  constraint central_verifactu_attempt_response_size_check
    check (
      response_payload is null
      or octet_length(response_payload) <= 2097152
    )
);

create index central_verifactu_records_scope_created_idx
  on public.central_verifactu_records
  (user_id, issuer_nif, environment, created_at, id);
create index central_verifactu_records_document_idx
  on public.central_verifactu_records (central_document_id);
create index central_verifactu_records_identity_idx
  on public.central_verifactu_records (central_identity_id);
create index central_verifactu_chain_last_record_idx
  on public.central_verifactu_chain_state (last_record_id)
  where last_record_id is not null;

create index central_verifactu_attempts_pending_idx
  on public.central_verifactu_transport_attempts (status, lease_expires_at, created_at)
  where status in ('queued', 'sending', 'delivery_unknown');
create index central_verifactu_attempts_user_idx
  on public.central_verifactu_transport_attempts (user_id);
create index central_verifactu_attempts_certificate_idx
  on public.central_verifactu_transport_attempts (certificate_binding_id);

create or replace function public.central_verifactu_record_material_immutable_v1()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if row(
    old.user_id,
    old.central_document_id,
    old.central_identity_id,
    old.issuer_nif,
    old.environment,
    old.record_type,
    old.record_hash,
    old.previous_hash,
    old.record_timestamp_text,
    old.numserie,
    old.fecha_expedicion,
    old.tipo_factura,
    old.xml_payload,
    old.xml_sha256,
    old.qr_url,
    old.created_at
  ) is distinct from row(
    new.user_id,
    new.central_document_id,
    new.central_identity_id,
    new.issuer_nif,
    new.environment,
    new.record_type,
    new.record_hash,
    new.previous_hash,
    new.record_timestamp_text,
    new.numserie,
    new.fecha_expedicion,
    new.tipo_factura,
    new.xml_payload,
    new.xml_sha256,
    new.qr_url,
    new.created_at
  ) then
    raise exception 'central verifactu record material is immutable'
      using errcode = '25006';
  end if;
  return new;
end;
$$;

create trigger central_verifactu_record_material_immutable_v1
before update on public.central_verifactu_records
for each row execute function public.central_verifactu_record_material_immutable_v1();

create or replace function public.read_central_invoice_verifactu_source_v1(
  p_user_id uuid,
  p_local_document_id text
)
returns table (
  central_document_id uuid,
  central_identity_id uuid,
  central_kind text,
  central_environment text,
  local_document_id text,
  issuer_nif text,
  full_number text,
  central_issued_at timestamptz,
  emitted_snapshot jsonb,
  emitted_hash text
)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_document public.central_invoice_documents%rowtype;
  v_identity public.central_invoice_identities%rowtype;
  v_expected_hash text;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'read_central_invoice_verifactu_source_v1 requires service_role';
  end if;
  if p_user_id is null or coalesce(btrim(p_local_document_id), '') = '' then
    raise exception 'invalid central invoice verifactu source scope'
      using errcode = '22023';
  end if;

  select * into v_document
  from public.central_invoice_documents as d
  where d.user_id = p_user_id
    and d.local_document_id = p_local_document_id;
  if v_document.id is null
    or v_document.lifecycle_status <> 'issued'
    or v_document.identity_id is null
    or v_document.emitted_snapshot is null
    or coalesce(v_document.emitted_hash, '') = ''
  then
    raise exception 'issued central invoice source not found'
      using errcode = 'P0002';
  end if;

  select * into v_identity
  from public.central_invoice_identities as i
  where i.id = v_document.identity_id
    and i.document_id = v_document.id
    and i.user_id = p_user_id;
  if v_identity.id is null then
    raise exception 'central invoice identity mismatch' using errcode = '23514';
  end if;
  if v_identity.environment <> 'test' then
    raise exception 'central invoice is not a test identity'
      using errcode = '23514';
  end if;

  v_expected_hash := 'sha256:' || pg_catalog.encode(
    extensions.digest(
      pg_catalog.convert_to(v_document.emitted_snapshot::text, 'UTF8'),
      'sha256'
    ),
    'hex'
  );
  if v_expected_hash <> v_document.emitted_hash then
    raise exception 'central invoice emitted snapshot hash mismatch'
      using errcode = '22000';
  end if;

  return query select
    v_document.id,
    v_identity.id,
    v_document.kind,
    v_identity.environment,
    v_document.local_document_id,
    v_identity.issuer_nif,
    v_identity.full_number,
    v_identity.issued_at,
    v_document.emitted_snapshot,
    v_document.emitted_hash;
end;
$$;

create or replace function public.prepare_central_verifactu_record_v1(
  p_user_id uuid,
  p_central_document_id uuid,
  p_central_identity_id uuid,
  p_certificate_binding_id uuid,
  p_certificate_binding_version integer,
  p_issuer_nif text,
  p_environment text,
  p_record_type text,
  p_record_hash text,
  p_previous_hash text,
  p_previous_numserie text,
  p_previous_fecha_expedicion date,
  p_record_timestamp_text text,
  p_numserie text,
  p_fecha_expedicion date,
  p_tipo_factura text,
  p_xml_payload text,
  p_xml_sha256 text,
  p_qr_url text,
  p_endpoint_url text
)
returns table (
  result_status text,
  record_id uuid,
  attempt_id uuid,
  chain_state_version integer,
  record_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_identity public.central_invoice_identities%rowtype;
  v_document public.central_invoice_documents%rowtype;
  v_certificate public.verifactu_certificate_bindings%rowtype;
  v_chain public.central_verifactu_chain_state%rowtype;
  v_record public.central_verifactu_records%rowtype;
  v_attempt public.central_verifactu_transport_attempts%rowtype;
  v_nif text := upper(regexp_replace(btrim(coalesce(p_issuer_nif, '')), '\s+', '', 'g'));
  v_previous_hash text := upper(btrim(coalesce(p_previous_hash, '')));
  v_record_hash text := upper(btrim(coalesce(p_record_hash, '')));
  v_xml_sha256 text := lower(btrim(coalesce(p_xml_sha256, '')));
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'prepare_central_verifactu_record_v1 requires service_role';
  end if;

  if p_user_id is null
    or p_central_document_id is null
    or p_central_identity_id is null
    or p_certificate_binding_id is null
    or coalesce(p_certificate_binding_version, 0) < 1
    or v_nif !~ '^[A-Z0-9]{9}$'
    or coalesce(p_environment, '') <> 'test'
    or coalesce(p_record_type, '') not in ('alta', 'anulacion')
    or v_record_hash !~ '^[A-F0-9]{64}$'
    or (v_previous_hash <> '' and v_previous_hash !~ '^[A-F0-9]{64}$')
    or coalesce(p_record_timestamp_text, '') = ''
    or coalesce(p_numserie, '') = ''
    or p_fecha_expedicion is null
    or coalesce(p_xml_payload, '') = ''
    or octet_length(p_xml_payload) > 1048576
    or v_xml_sha256 !~ '^[a-f0-9]{64}$'
    or position(v_record_hash in p_xml_payload) = 0
    or coalesce(p_endpoint_url, '') !~ '^https://prewww(1|10)[.]aeat[.]es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP$'
  then
    raise exception 'invalid central verifactu record material'
      using errcode = '22023';
  end if;

  begin
    perform p_record_timestamp_text::timestamptz;
  exception when others then
    raise exception 'invalid central verifactu record timestamp'
      using errcode = '22007';
  end;

  select * into v_identity
  from public.central_invoice_identities
  where id = p_central_identity_id
    and document_id = p_central_document_id
    and user_id = p_user_id;

  select * into v_document
  from public.central_invoice_documents
  where id = p_central_document_id
    and identity_id = p_central_identity_id
    and user_id = p_user_id;

  if v_identity.id is null
    or v_document.id is null
    or v_document.lifecycle_status <> 'issued'
    or v_identity.environment <> 'test'
    or v_identity.issuer_nif <> v_nif
    or v_identity.full_number <> p_numserie
  then
    raise exception 'central invoice identity does not match verifactu material'
      using errcode = '23514';
  end if;

  select * into v_certificate
  from public.verifactu_certificate_bindings
  where id = p_certificate_binding_id
    and user_id = p_user_id
    and issuer_nif = v_nif
    and environment = 'test'
    and binding_version = p_certificate_binding_version
    and status = 'active'
    and certificate_valid_from <= statement_timestamp()
    and certificate_valid_to > statement_timestamp();

  if v_certificate.id is null then
    raise exception 'active certificate binding does not match verifactu scope'
      using errcode = '23514';
  end if;

  -- A second function may prepare this same fiscal identity while the first
  -- one is advancing the issuer chain. Serialize that identity before reading
  -- its immutable record so both calls converge on the same material.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'central-verifactu-record:' || p_user_id::text || ':' || p_central_identity_id::text,
      0
    )
  );

  select * into v_record
  from public.central_verifactu_records
  where user_id = p_user_id
    and central_identity_id = p_central_identity_id
    and environment = 'test'
  for update;

  if v_record.id is not null then
    if v_record.central_document_id <> p_central_document_id
      or v_record.issuer_nif <> v_nif
      or v_record.record_type <> p_record_type
      or v_record.record_hash <> v_record_hash
      or v_record.xml_sha256 <> v_xml_sha256
      or v_record.xml_payload <> p_xml_payload
    then
      raise exception 'central verifactu identity replay changed immutable material'
        using errcode = '23505';
    end if;

    select * into v_attempt
    from public.central_verifactu_transport_attempts
    where record_id = v_record.id
      and status in ('queued', 'sending')
    order by attempt_number desc
    limit 1;

    return query select
      case
        when v_record.status in ('accepted', 'accepted_with_errors')
          then 'replayed_accepted'
        when v_attempt.id is not null then 'replayed_pending'
        else 'replayed_requires_retry'
      end,
      v_record.id,
      v_attempt.id,
      null::integer,
      v_record.status;
    return;
  end if;

  insert into public.central_verifactu_chain_state (
    user_id,
    issuer_nif,
    environment
  ) values (
    p_user_id,
    v_nif,
    'test'
  ) on conflict (user_id, issuer_nif, environment) do nothing;

  select * into v_chain
  from public.central_verifactu_chain_state
  where user_id = p_user_id
    and issuer_nif = v_nif
    and environment = 'test'
  for update;

  if v_chain.last_hash <> v_previous_hash
    or coalesce(v_chain.last_numserie, '') <> coalesce(p_previous_numserie, '')
    or v_chain.last_fecha_expedicion is distinct from p_previous_fecha_expedicion
  then
    raise exception 'central verifactu chain head changed'
      using errcode = '40001';
  end if;

  insert into public.central_verifactu_records (
    user_id,
    central_document_id,
    central_identity_id,
    issuer_nif,
    environment,
    record_type,
    record_hash,
    previous_hash,
    record_timestamp_text,
    numserie,
    fecha_expedicion,
    tipo_factura,
    xml_payload,
    xml_sha256,
    qr_url
  ) values (
    p_user_id,
    p_central_document_id,
    p_central_identity_id,
    v_nif,
    'test',
    p_record_type,
    v_record_hash,
    v_previous_hash,
    p_record_timestamp_text,
    p_numserie,
    p_fecha_expedicion,
    nullif(p_tipo_factura, ''),
    p_xml_payload,
    v_xml_sha256,
    coalesce(p_qr_url, '')
  ) returning * into v_record;

  insert into public.central_verifactu_transport_attempts (
    record_id,
    user_id,
    certificate_binding_id,
    certificate_binding_version,
    attempt_number,
    request_sha256,
    endpoint_url
  ) values (
    v_record.id,
    p_user_id,
    p_certificate_binding_id,
    p_certificate_binding_version,
    1,
    v_xml_sha256,
    p_endpoint_url
  ) returning * into v_attempt;

  update public.central_verifactu_chain_state
  set last_record_id = v_record.id,
      last_hash = v_record.record_hash,
      last_numserie = v_record.numserie,
      last_fecha_expedicion = v_record.fecha_expedicion,
      record_count = record_count + 1,
      state_version = state_version + 1,
      updated_at = statement_timestamp()
  where id = v_chain.id
  returning * into v_chain;

  return query select
    'prepared'::text,
    v_record.id,
    v_attempt.id,
    v_chain.state_version,
    v_record.status;
end;
$$;

create or replace function public.queue_central_verifactu_retry_v1(
  p_user_id uuid,
  p_record_id uuid,
  p_certificate_binding_id uuid,
  p_certificate_binding_version integer,
  p_endpoint_url text
)
returns table (
  result_status text,
  attempt_id uuid,
  attempt_number integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_record public.central_verifactu_records%rowtype;
  v_attempt public.central_verifactu_transport_attempts%rowtype;
  v_certificate public.verifactu_certificate_bindings%rowtype;
  v_next integer;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'queue_central_verifactu_retry_v1 requires service_role';
  end if;
  if coalesce(p_endpoint_url, '') !~ '^https://prewww(1|10)[.]aeat[.]es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP$'
  then
    raise exception 'invalid central verifactu preproduction endpoint'
      using errcode = '22023';
  end if;

  select * into v_record
  from public.central_verifactu_records
  where id = p_record_id and user_id = p_user_id
  for update;

  if v_record.id is null then
    raise exception 'central verifactu record not found' using errcode = 'P0002';
  end if;
  if v_record.status in ('accepted', 'accepted_with_errors') then
    return query select 'already_accepted'::text, null::uuid, null::integer;
    return;
  end if;
  if v_record.status = 'rejected' then
    raise exception 'rejected central verifactu record cannot be retried unchanged'
      using errcode = '55000';
  end if;

  select * into v_certificate
  from public.verifactu_certificate_bindings
  where id = p_certificate_binding_id
    and user_id = p_user_id
    and issuer_nif = v_record.issuer_nif
    and environment = 'test'
    and binding_version = p_certificate_binding_version
    and status = 'active'
    and certificate_valid_from <= statement_timestamp()
    and certificate_valid_to > statement_timestamp();
  if v_certificate.id is null then
    raise exception 'active certificate binding does not match retry scope'
      using errcode = '23514';
  end if;

  select * into v_attempt
  from public.central_verifactu_transport_attempts as a
  where a.record_id = v_record.id
    and a.status = 'queued'
  order by a.attempt_number desc
  limit 1;
  if v_attempt.id is not null then
    if v_attempt.certificate_binding_id = p_certificate_binding_id
      and v_attempt.certificate_binding_version = p_certificate_binding_version
      and v_attempt.endpoint_url = p_endpoint_url
    then
      return query select 'already_queued'::text, v_attempt.id, v_attempt.attempt_number;
      return;
    end if;
    update public.central_verifactu_transport_attempts
    set status = 'superseded',
        completed_at = statement_timestamp(),
        outcome = 'certificate_rotated',
        error_code = 'CERTIFICATE_BINDING_CHANGED',
        error_message = 'A newer active certificate binding replaced this queued attempt.'
    where id = v_attempt.id;
  end if;

  select * into v_attempt
  from public.central_verifactu_transport_attempts as a
  where a.record_id = v_record.id
    and a.status = 'sending'
  order by a.attempt_number desc
  limit 1
  for update;
  if v_attempt.id is not null and v_attempt.lease_expires_at > statement_timestamp() then
    return query select 'already_sending'::text, v_attempt.id, v_attempt.attempt_number;
    return;
  end if;
  if v_attempt.id is not null then
    update public.central_verifactu_transport_attempts
    set status = 'delivery_unknown',
        lease_token = null,
        lease_expires_at = null,
        completed_at = statement_timestamp(),
        outcome = 'delivery_unknown',
        error_code = 'LEASE_EXPIRED',
        error_message = 'The previous delivery outcome is unknown.'
    where id = v_attempt.id;
  end if;

  select coalesce(max(a.attempt_number), 0) + 1 into v_next
  from public.central_verifactu_transport_attempts as a
  where a.record_id = v_record.id;

  insert into public.central_verifactu_transport_attempts (
    record_id,
    user_id,
    certificate_binding_id,
    certificate_binding_version,
    attempt_number,
    request_sha256,
    endpoint_url
  ) values (
    v_record.id,
    p_user_id,
    p_certificate_binding_id,
    p_certificate_binding_version,
    v_next,
    v_record.xml_sha256,
    p_endpoint_url
  ) returning * into v_attempt;

  update public.central_verifactu_records
  set status = 'prepared', updated_at = statement_timestamp()
  where id = v_record.id;

  return query select 'retry_queued'::text, v_attempt.id, v_attempt.attempt_number;
end;
$$;

create or replace function public.claim_central_verifactu_attempt_v1(
  p_user_id uuid,
  p_attempt_id uuid,
  p_lease_seconds integer default 90
)
returns table (
  record_id uuid,
  attempt_id uuid,
  lease_token uuid,
  endpoint_url text,
  xml_payload text,
  xml_sha256 text,
  issuer_nif text,
  certificate_binding_id uuid,
  certificate_binding_version integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.central_verifactu_transport_attempts%rowtype;
  v_record public.central_verifactu_records%rowtype;
  v_certificate public.verifactu_certificate_bindings%rowtype;
  v_lease uuid := gen_random_uuid();
  v_record_id uuid;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'claim_central_verifactu_attempt_v1 requires service_role';
  end if;
  if coalesce(p_lease_seconds, 0) < 30 or p_lease_seconds > 300 then
    raise exception 'invalid central verifactu lease duration' using errcode = '22023';
  end if;

  select a.record_id into v_record_id
  from public.central_verifactu_transport_attempts as a
  where a.id = p_attempt_id and a.user_id = p_user_id;
  if v_record_id is null then
    raise exception 'central verifactu attempt is not claimable' using errcode = '55000';
  end if;

  -- All attempt lifecycle functions lock record first and attempt second.
  -- A preliminary unlocked lookup only discovers the immutable FK.
  select * into v_record
  from public.central_verifactu_records as r
  where r.id = v_record_id and r.user_id = p_user_id
  for update;

  select * into v_attempt
  from public.central_verifactu_transport_attempts as a
  where a.id = p_attempt_id
    and a.user_id = p_user_id
    and a.record_id = v_record_id
  for update;
  if v_attempt.id is null or v_attempt.status <> 'queued' then
    raise exception 'central verifactu attempt is not claimable' using errcode = '55000';
  end if;
  if v_record.id is null
    or v_record.status in ('accepted', 'accepted_with_errors', 'rejected')
    or v_record.xml_sha256 <> v_attempt.request_sha256
  then
    raise exception 'central verifactu attempt no longer matches its record'
      using errcode = '23514';
  end if;

  select * into v_certificate
  from public.verifactu_certificate_bindings as c
  where c.id = v_attempt.certificate_binding_id
    and c.user_id = p_user_id
    and c.issuer_nif = v_record.issuer_nif
    and c.environment = 'test'
    and c.binding_version = v_attempt.certificate_binding_version
    and c.status = 'active'
    and c.certificate_valid_from <= statement_timestamp()
    and c.certificate_valid_to > statement_timestamp();
  if v_certificate.id is null then
    raise exception 'certificate binding is no longer active for this attempt'
      using errcode = '23514';
  end if;

  update public.central_verifactu_transport_attempts
  set status = 'sending',
      lease_token = v_lease,
      lease_expires_at = statement_timestamp() + make_interval(secs => p_lease_seconds),
      started_at = statement_timestamp()
  where id = v_attempt.id
  returning * into v_attempt;

  update public.central_verifactu_records
  set status = 'sending', updated_at = statement_timestamp()
  where id = v_record.id;

  return query select
    v_record.id,
    v_attempt.id,
    v_lease,
    v_attempt.endpoint_url,
    v_record.xml_payload,
    v_record.xml_sha256,
    v_record.issuer_nif,
    v_attempt.certificate_binding_id,
    v_attempt.certificate_binding_version;
end;
$$;

create or replace function public.complete_central_verifactu_attempt_v1(
  p_user_id uuid,
  p_attempt_id uuid,
  p_lease_token uuid,
  p_outcome text,
  p_http_status integer,
  p_csv text,
  p_estado_envio text,
  p_estado_registro text,
  p_duplicate_state text,
  p_error_code text,
  p_error_message text,
  p_response_payload text,
  p_response_sha256 text
)
returns table (
  record_id uuid,
  record_status text,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.central_verifactu_transport_attempts%rowtype;
  v_record public.central_verifactu_records%rowtype;
  v_now timestamptz := statement_timestamp();
  v_response_sha256 text := lower(btrim(coalesce(p_response_sha256, '')));
  v_record_status text;
  v_attempt_status text;
  v_record_id uuid;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'complete_central_verifactu_attempt_v1 requires service_role';
  end if;
  if coalesce(p_outcome, '') not in (
      'accepted',
      'accepted_duplicate',
      'accepted_with_errors',
      'rejected',
      'delivery_unknown'
    )
    or p_attempt_id is null
    or p_lease_token is null
    or (p_http_status is not null and (p_http_status < 100 or p_http_status > 599))
    or (p_error_message is not null and char_length(p_error_message) > 1500)
    or (p_response_payload is not null and octet_length(p_response_payload) > 2097152)
  then
    raise exception 'invalid central verifactu attempt result' using errcode = '22023';
  end if;

  if p_response_payload is not null then
    if v_response_sha256 !~ '^[a-f0-9]{64}$'
      or v_response_sha256 <> pg_catalog.encode(
        extensions.digest(
          pg_catalog.convert_to(p_response_payload, 'UTF8'),
          'sha256'
        ),
        'hex'
      )
    then
      raise exception 'central verifactu response hash mismatch' using errcode = '22000';
    end if;
  elsif p_response_sha256 is not null then
    raise exception 'central verifactu response hash has no payload'
      using errcode = '22023';
  elsif p_outcome <> 'delivery_unknown' then
    raise exception 'definitive AEAT outcome requires a response payload'
      using errcode = '22023';
  end if;

  if p_outcome in ('accepted', 'accepted_duplicate', 'accepted_with_errors')
    and coalesce(p_csv, '') = ''
  then
    raise exception 'accepted central verifactu response requires CSV'
      using errcode = '22023';
  end if;

  select a.record_id into v_record_id
  from public.central_verifactu_transport_attempts as a
  where a.id = p_attempt_id and a.user_id = p_user_id;
  if v_record_id is null then
    raise exception 'central verifactu attempt lease does not match'
      using errcode = '55000';
  end if;

  select * into v_record
  from public.central_verifactu_records as r
  where r.id = v_record_id and r.user_id = p_user_id
  for update;

  select * into v_attempt
  from public.central_verifactu_transport_attempts as a
  where a.id = p_attempt_id
    and a.user_id = p_user_id
    and a.record_id = v_record_id
  for update;
  if v_attempt.id is null
    or v_attempt.status <> 'sending'
    or v_attempt.lease_token <> p_lease_token
  then
    raise exception 'central verifactu attempt lease does not match'
      using errcode = '55000';
  end if;
  if v_record.id is null or v_record.status <> 'sending' then
    raise exception 'central verifactu record is not awaiting this result'
      using errcode = '55000';
  end if;

  v_attempt_status := case
    when p_outcome = 'delivery_unknown' then 'delivery_unknown'
    else 'completed'
  end;
  v_record_status := case
    when p_outcome in ('accepted', 'accepted_duplicate') then 'accepted'
    when p_outcome = 'accepted_with_errors' then 'accepted_with_errors'
    when p_outcome = 'rejected' then 'rejected'
    else 'delivery_unknown'
  end;

  update public.central_verifactu_transport_attempts
  set status = v_attempt_status,
      lease_token = null,
      lease_expires_at = null,
      completed_at = v_now,
      outcome = p_outcome,
      http_status = p_http_status,
      response_sha256 = nullif(v_response_sha256, ''),
      response_payload = p_response_payload,
      error_code = nullif(p_error_code, ''),
      error_message = nullif(p_error_message, '')
  where id = v_attempt.id;

  update public.central_verifactu_records
  set status = v_record_status,
      csv = case
        when v_record_status in ('accepted', 'accepted_with_errors') then p_csv
        else null
      end,
      aeat_estado_envio = nullif(p_estado_envio, ''),
      aeat_estado_registro = nullif(p_estado_registro, ''),
      aeat_duplicate_state = nullif(p_duplicate_state, ''),
      aeat_error_code = nullif(p_error_code, ''),
      aeat_error_message = nullif(p_error_message, ''),
      accepted_at = case
        when v_record_status in ('accepted', 'accepted_with_errors') then v_now
        else null
      end,
      updated_at = v_now
  where id = v_record.id;

  return query select v_record.id, v_record_status, v_now;
end;
$$;

alter table public.central_verifactu_chain_state enable row level security;
alter table public.central_verifactu_records enable row level security;
alter table public.central_verifactu_transport_attempts enable row level security;

revoke all on table public.central_verifactu_chain_state
  from public, anon, authenticated, service_role;
revoke all on table public.central_verifactu_records
  from public, anon, authenticated, service_role;
revoke all on table public.central_verifactu_transport_attempts
  from public, anon, authenticated, service_role;
grant select on table public.central_verifactu_chain_state to service_role;
grant select on table public.central_verifactu_records to service_role;
grant select on table public.central_verifactu_transport_attempts to service_role;

revoke all on function public.central_verifactu_record_material_immutable_v1()
  from public, anon, authenticated, service_role;
revoke all on function public.read_central_invoice_verifactu_source_v1(
  uuid, text
) from public, anon, authenticated, service_role;
revoke all on function public.prepare_central_verifactu_record_v1(
  uuid, uuid, uuid, uuid, integer, text, text, text, text, text, text, date,
  text, text, date, text, text, text, text, text
) from public, anon, authenticated, service_role;
revoke all on function public.queue_central_verifactu_retry_v1(
  uuid, uuid, uuid, integer, text
) from public, anon, authenticated, service_role;
revoke all on function public.claim_central_verifactu_attempt_v1(
  uuid, uuid, integer
) from public, anon, authenticated, service_role;
revoke all on function public.complete_central_verifactu_attempt_v1(
  uuid, uuid, uuid, text, integer, text, text, text, text, text, text, text, text
) from public, anon, authenticated, service_role;

grant execute on function public.prepare_central_verifactu_record_v1(
  uuid, uuid, uuid, uuid, integer, text, text, text, text, text, text, date,
  text, text, date, text, text, text, text, text
) to service_role;
grant execute on function public.read_central_invoice_verifactu_source_v1(
  uuid, text
) to service_role;
grant execute on function public.queue_central_verifactu_retry_v1(
  uuid, uuid, uuid, integer, text
) to service_role;
grant execute on function public.claim_central_verifactu_attempt_v1(
  uuid, uuid, integer
) to service_role;
grant execute on function public.complete_central_verifactu_attempt_v1(
  uuid, uuid, uuid, text, integer, text, text, text, text, text, text, text, text
) to service_role;

comment on table public.central_verifactu_records is
  'Immutable test-only VeriFactu record material tied to one canonical central invoice identity.';
comment on table public.central_verifactu_transport_attempts is
  'Durable exact-request AEAT attempts. delivery_unknown is retried with the same record XML.';

commit;
