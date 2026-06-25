-- Phase 2B.4M fiscal record + chain local/staging atomicity RPC.
-- Scope: Supabase local and staging only.
-- This migration persists candidate fiscal records and updates fiscal_chain_state
-- in the same PostgreSQL transaction. It does not create transport attempts,
-- generate final AEAT XML, use certificates, or enable production rollout.

begin;

create or replace function public.create_fiscal_record_with_chain_local_staging(
  p_user_id uuid,
  p_operation_id uuid,
  p_expected_previous_record_id uuid default null,
  p_expected_previous_hash text default null,
  p_record_hash text default null,
  p_hash_algorithm text default 'sha256-candidate',
  p_record_timestamp timestamptz default null,
  p_schema_version text default 'phase2b4m-chain-local-staging-v1',
  p_renderer_version text default null
)
returns table (
  result_status text,
  reason text,
  message text,
  atomicity text,
  record_id uuid,
  record_user_id uuid,
  record_operation_id uuid,
  record_invoice_identity_id uuid,
  record_server_document_id uuid,
  record_environment text,
  record_issuer_nif text,
  record_numserie text,
  record_fecha_expedicion date,
  record_type_candidate text,
  record_sequence bigint,
  record_previous_record_id uuid,
  record_previous_hash text,
  record_hash text,
  record_hash_algorithm text,
  record_timestamp timestamptz,
  record_document_snapshot_hash text,
  record_pdf_content_hash text,
  record_schema_version text,
  record_renderer_version text,
  record_created_at timestamptz,
  chain_user_id uuid,
  chain_environment text,
  chain_issuer_nif text,
  chain_last_record_id uuid,
  chain_last_hash text,
  chain_record_count bigint,
  chain_updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_operation public.fiscal_operations%rowtype;
  v_identity public.fiscal_invoice_identities%rowtype;
  v_record public.fiscal_records%rowtype;
  v_chain public.fiscal_chain_state%rowtype;
  v_record_type_candidate text;
  v_record_timestamp timestamptz := coalesce(p_record_timestamp, now());
  v_record_hash text := btrim(coalesce(p_record_hash, ''));
  v_hash_algorithm text := btrim(coalesce(p_hash_algorithm, 'sha256-candidate'));
  v_schema_version text := btrim(coalesce(p_schema_version, 'phase2b4m-chain-local-staging-v1'));
begin
  if auth.role() <> 'service_role' then
    raise exception 'create_fiscal_record_with_chain_local_staging can only be executed by service_role'
      using errcode = '42501';
  end if;

  select *
    into v_operation
    from public.fiscal_operations
   where id = p_operation_id
     and user_id = p_user_id
   for update;

  if not found then
    return query select
      'rejected'::text, 'operation_not_found'::text,
      'No se ha encontrado la operacion fiscal solicitada.'::text,
      'postgres_rpc'::text,
      null::uuid, null::uuid, null::uuid, null::uuid, null::uuid, null::text,
      null::text, null::text, null::date, null::text, null::bigint,
      null::uuid, null::text, null::text, null::text, null::timestamptz,
      null::text, null::text, null::text, null::text, null::timestamptz,
      null::uuid, null::text, null::text, null::uuid, null::text,
      null::bigint, null::timestamptz;
    return;
  end if;

  select *
    into v_record
    from public.fiscal_records
   where operation_id = v_operation.id
   for update;

  if found then
    select *
      into v_chain
      from public.fiscal_chain_state
     where user_id = v_record.user_id
       and environment = v_record.environment
       and issuer_nif = v_record.issuer_nif
     for update;

    if not found then
      return query select
        'conflict'::text, 'existing_record_without_chain'::text,
        'Existe un registro fiscal local sin cabecera de cadena.'::text,
        'postgres_rpc'::text,
        v_record.id, v_record.user_id, v_record.operation_id,
        v_record.invoice_identity_id, v_record.server_document_id,
        v_record.environment, v_record.issuer_nif, v_record.numserie,
        v_record.fecha_expedicion, v_record.record_type, v_record.record_sequence,
        v_record.previous_record_id, v_record.previous_hash, v_record.record_hash,
        v_record.hash_algorithm, v_record.record_timestamp,
        v_record.document_snapshot_hash, v_record.pdf_content_hash,
        v_record.schema_version, v_record.renderer_version, v_record.created_at,
        null::uuid, null::text, null::text, null::uuid, null::text,
        null::bigint, null::timestamptz;
      return;
    end if;

    return query select
      'existing'::text, null::text, null::text, 'postgres_rpc'::text,
      v_record.id, v_record.user_id, v_record.operation_id,
      v_record.invoice_identity_id, v_record.server_document_id,
      v_record.environment, v_record.issuer_nif, v_record.numserie,
      v_record.fecha_expedicion, v_record.record_type, v_record.record_sequence,
      v_record.previous_record_id, v_record.previous_hash, v_record.record_hash,
      v_record.hash_algorithm, v_record.record_timestamp,
      v_record.document_snapshot_hash, v_record.pdf_content_hash,
      v_record.schema_version, v_record.renderer_version, v_record.created_at,
      v_chain.user_id, v_chain.environment, v_chain.issuer_nif,
      v_chain.last_record_id, v_chain.last_hash, v_chain.record_count,
      v_chain.updated_at;
    return;
  end if;

  if v_operation.status <> 'processing' then
    return query select
      'rejected'::text, 'operation_not_processing'::text,
      'La operacion fiscal debe estar en processing.'::text,
      'postgres_rpc'::text,
      null::uuid, null::uuid, v_operation.id, null::uuid,
      v_operation.server_document_id, v_operation.environment, null::text,
      null::text, null::date, null::text, null::bigint, null::uuid, null::text,
      null::text, null::text, null::timestamptz, v_operation.document_snapshot_hash,
      null::text, null::text, null::text, null::timestamptz,
      null::uuid, null::text, null::text, null::uuid, null::text,
      null::bigint, null::timestamptz;
    return;
  end if;

  select *
    into v_identity
    from public.fiscal_invoice_identities
   where user_id = v_operation.user_id
     and server_document_id = v_operation.server_document_id
     and environment = v_operation.environment
   order by created_at desc
   limit 1
   for update;

  if not found then
    return query select
      'rejected'::text, 'invoice_identity_missing'::text,
      'La operacion fiscal necesita identidad fiscal.'::text,
      'postgres_rpc'::text,
      null::uuid, null::uuid, v_operation.id, null::uuid,
      v_operation.server_document_id, v_operation.environment, null::text,
      null::text, null::date, null::text, null::bigint, null::uuid, null::text,
      null::text, null::text, null::timestamptz, v_operation.document_snapshot_hash,
      null::text, null::text, null::text, null::timestamptz,
      null::uuid, null::text, null::text, null::uuid, null::text,
      null::bigint, null::timestamptz;
    return;
  end if;

  if nullif(btrim(coalesce(v_identity.issuer_nif, '')), '') is null
    or nullif(btrim(coalesce(v_identity.numserie, '')), '') is null
    or v_identity.fecha_expedicion is null
    or nullif(btrim(coalesce(v_operation.document_snapshot_hash, '')), '') is null then
    return query select
      'rejected'::text, 'identity_or_snapshot_missing'::text,
      'La operacion fiscal necesita identidad y snapshot completos.'::text,
      'postgres_rpc'::text,
      null::uuid, null::uuid, v_operation.id, v_identity.id,
      v_operation.server_document_id, v_operation.environment,
      v_identity.issuer_nif, v_identity.numserie, v_identity.fecha_expedicion,
      null::text, null::bigint, null::uuid, null::text, null::text,
      null::text, null::timestamptz, v_operation.document_snapshot_hash,
      null::text, null::text, null::text, null::timestamptz,
      null::uuid, null::text, null::text, null::uuid, null::text,
      null::bigint, null::timestamptz;
    return;
  end if;

  if v_record_hash = ''
    or v_record_hash !~ '^sha256:[a-f0-9]{64}$' then
    return query select
      'rejected'::text, 'record_hash_invalid'::text,
      'La persistencia local necesita recordHash candidato normalizado.'::text,
      'postgres_rpc'::text,
      null::uuid, null::uuid, v_operation.id, v_identity.id,
      v_operation.server_document_id, v_operation.environment,
      v_identity.issuer_nif, v_identity.numserie, v_identity.fecha_expedicion,
      null::text, null::bigint, null::uuid, null::text, null::text,
      null::text, null::timestamptz, v_operation.document_snapshot_hash,
      null::text, null::text, null::text, null::timestamptz,
      null::uuid, null::text, null::text, null::uuid, null::text,
      null::bigint, null::timestamptz;
    return;
  end if;

  if v_hash_algorithm <> 'sha256-candidate' then
    return query select
      'rejected'::text, 'unsupported_hash_algorithm'::text,
      'La persistencia local solo acepta sha256-candidate.'::text,
      'postgres_rpc'::text,
      null::uuid, null::uuid, v_operation.id, v_identity.id,
      v_operation.server_document_id, v_operation.environment,
      v_identity.issuer_nif, v_identity.numserie, v_identity.fecha_expedicion,
      null::text, null::bigint, null::uuid, null::text, null::text,
      null::text, null::timestamptz, v_operation.document_snapshot_hash,
      null::text, null::text, null::text, null::timestamptz,
      null::uuid, null::text, null::text, null::uuid, null::text,
      null::bigint, null::timestamptz;
    return;
  end if;

  if v_schema_version <> 'phase2b4m-chain-local-staging-v1' then
    return query select
      'rejected'::text, 'unsupported_schema_version'::text,
      'La persistencia local solo acepta phase2b4m-chain-local-staging-v1.'::text,
      'postgres_rpc'::text,
      null::uuid, null::uuid, v_operation.id, v_identity.id,
      v_operation.server_document_id, v_operation.environment,
      v_identity.issuer_nif, v_identity.numserie, v_identity.fecha_expedicion,
      null::text, null::bigint, null::uuid, null::text, null::text,
      null::text, null::timestamptz, v_operation.document_snapshot_hash,
      null::text, null::text, null::text, null::timestamptz,
      null::uuid, null::text, null::text, null::uuid, null::text,
      null::bigint, null::timestamptz;
    return;
  end if;

  if v_operation.operation_type in ('alta_inicial', 'alta_subsanacion') then
    v_record_type_candidate := 'alta';
  elsif v_operation.operation_type = 'anulacion' then
    v_record_type_candidate := 'anulacion';
  else
    return query select
      'rejected'::text, 'unsupported_operation_type'::text,
      'El tipo de operacion fiscal no esta soportado.'::text,
      'postgres_rpc'::text,
      null::uuid, null::uuid, v_operation.id, v_identity.id,
      v_operation.server_document_id, v_operation.environment,
      v_identity.issuer_nif, v_identity.numserie, v_identity.fecha_expedicion,
      null::text, null::bigint, null::uuid, null::text, null::text,
      null::text, null::timestamptz, v_operation.document_snapshot_hash,
      null::text, null::text, null::text, null::timestamptz,
      null::uuid, null::text, null::text, null::uuid, null::text,
      null::bigint, null::timestamptz;
    return;
  end if;

  insert into public.fiscal_chain_state (
    user_id,
    environment,
    issuer_nif,
    last_record_id,
    last_hash,
    record_count,
    updated_at
  )
  values (
    v_operation.user_id,
    v_operation.environment,
    v_identity.issuer_nif,
    null,
    null,
    0,
    now()
  )
  on conflict (user_id, environment, issuer_nif)
  do nothing;

  select *
    into v_chain
    from public.fiscal_chain_state
   where user_id = v_operation.user_id
     and environment = v_operation.environment
     and issuer_nif = v_identity.issuer_nif
   for update;

  if not found then
    return query select
      'conflict'::text, 'chain_state_unavailable'::text,
      'No se pudo bloquear la cabecera de cadena local.'::text,
      'postgres_rpc'::text,
      null::uuid, null::uuid, v_operation.id, v_identity.id,
      v_operation.server_document_id, v_operation.environment,
      v_identity.issuer_nif, v_identity.numserie, v_identity.fecha_expedicion,
      v_record_type_candidate, null::bigint, null::uuid, null::text,
      null::text, null::text, null::timestamptz,
      v_operation.document_snapshot_hash, null::text, null::text,
      null::text, null::timestamptz,
      null::uuid, null::text, null::text, null::uuid, null::text,
      null::bigint, null::timestamptz;
    return;
  end if;

  if v_chain.last_record_id is distinct from p_expected_previous_record_id
    or v_chain.last_hash is distinct from p_expected_previous_hash then
    return query select
      'conflict'::text, 'record_chain_head_changed'::text,
      'La cabecera local de cadena ha cambiado antes de persistir.'::text,
      'postgres_rpc'::text,
      null::uuid, null::uuid, v_operation.id, v_identity.id,
      v_operation.server_document_id, v_operation.environment,
      v_identity.issuer_nif, v_identity.numserie, v_identity.fecha_expedicion,
      v_record_type_candidate, null::bigint,
      v_chain.last_record_id, v_chain.last_hash,
      null::text, null::text, null::timestamptz,
      v_operation.document_snapshot_hash, null::text, null::text,
      null::text, null::timestamptz,
      v_chain.user_id, v_chain.environment, v_chain.issuer_nif,
      v_chain.last_record_id, v_chain.last_hash, v_chain.record_count,
      v_chain.updated_at;
    return;
  end if;

  insert into public.fiscal_records (
    user_id,
    operation_id,
    invoice_identity_id,
    server_document_id,
    environment,
    issuer_nif,
    numserie,
    fecha_expedicion,
    record_type,
    record_sequence,
    previous_record_id,
    previous_hash,
    record_hash,
    hash_algorithm,
    record_timestamp,
    xml_payload,
    qr_url,
    document_snapshot_hash,
    pdf_content_hash,
    schema_version,
    renderer_version
  )
  values (
    v_operation.user_id,
    v_operation.id,
    v_identity.id,
    v_operation.server_document_id,
    v_operation.environment,
    v_identity.issuer_nif,
    v_identity.numserie,
    v_identity.fecha_expedicion,
    v_record_type_candidate,
    v_chain.record_count + 1,
    v_chain.last_record_id,
    v_chain.last_hash,
    v_record_hash,
    v_hash_algorithm,
    v_record_timestamp,
    'PHASE2B4M_NO_AEAT_XML_CANDIDATE',
    null,
    v_operation.document_snapshot_hash,
    null,
    v_schema_version,
    nullif(btrim(coalesce(p_renderer_version, '')), '')
  )
  returning *
  into v_record;

  update public.fiscal_chain_state
     set last_record_id = v_record.id,
         last_hash = v_record.record_hash,
         record_count = v_record.record_sequence,
         updated_at = v_record.created_at
   where user_id = v_operation.user_id
     and environment = v_operation.environment
     and issuer_nif = v_identity.issuer_nif
  returning *
  into v_chain;

  return query select
    'created'::text, null::text, null::text, 'postgres_rpc'::text,
    v_record.id, v_record.user_id, v_record.operation_id,
    v_record.invoice_identity_id, v_record.server_document_id,
    v_record.environment, v_record.issuer_nif, v_record.numserie,
    v_record.fecha_expedicion, v_record.record_type, v_record.record_sequence,
    v_record.previous_record_id, v_record.previous_hash, v_record.record_hash,
    v_record.hash_algorithm, v_record.record_timestamp,
    v_record.document_snapshot_hash, v_record.pdf_content_hash,
    v_record.schema_version, v_record.renderer_version, v_record.created_at,
    v_chain.user_id, v_chain.environment, v_chain.issuer_nif,
    v_chain.last_record_id, v_chain.last_hash, v_chain.record_count,
    v_chain.updated_at;
end;
$$;

revoke all on function public.create_fiscal_record_with_chain_local_staging(
  uuid, uuid, uuid, text, text, text, timestamptz, text, text
) from public, anon, authenticated;

grant execute on function public.create_fiscal_record_with_chain_local_staging(
  uuid, uuid, uuid, text, text, text, timestamptz, text, text
) to service_role;

commit;
