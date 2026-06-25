-- Phase 2B.4L fiscal record local/staging persistence RPC.
-- Scope: Supabase local and staging only.
-- This migration persists candidate fiscal records but does not update
-- fiscal_chain_state, create transport attempts, generate final AEAT XML,
-- use certificates, or enable production rollout.

begin;

alter table public.fiscal_records
  drop constraint if exists fiscal_records_record_type_check;

alter table public.fiscal_records
  add constraint fiscal_records_record_type_check
  check (record_type in ('alta', 'anulacion', 'alta_inicial', 'alta_subsanacion'));

create or replace function public.create_fiscal_record_local_staging(
  p_user_id uuid,
  p_operation_id uuid,
  p_expected_previous_record_id uuid default null,
  p_expected_previous_hash text default null,
  p_record_hash text default null,
  p_hash_algorithm text default 'sha256-candidate',
  p_record_timestamp timestamptz default null,
  p_schema_version text default 'phase2b4l-local-staging-v1',
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
  record_created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_operation public.fiscal_operations%rowtype;
  v_identity public.fiscal_invoice_identities%rowtype;
  v_previous public.fiscal_records%rowtype;
  v_record public.fiscal_records%rowtype;
  v_record_type_candidate text;
  v_record_sequence bigint;
  v_record_timestamp timestamptz := coalesce(p_record_timestamp, now());
  v_record_hash text := btrim(coalesce(p_record_hash, ''));
  v_hash_algorithm text := btrim(coalesce(p_hash_algorithm, 'sha256-candidate'));
  v_schema_version text := btrim(coalesce(p_schema_version, 'phase2b4l-local-staging-v1'));
  v_advisory_key bigint;
begin
  if auth.role() <> 'service_role' then
    raise exception 'create_fiscal_record_local_staging can only be executed by service_role'
      using errcode = '42501';
  end if;

  if p_user_id is null or p_operation_id is null then
    return query select
      'rejected'::text,
      'operation_not_found'::text,
      'No se ha encontrado la operacion fiscal solicitada.'::text,
      'postgres_rpc'::text,
      null::uuid, null::uuid, null::uuid, null::uuid, null::uuid, null::text,
      null::text, null::text, null::date, null::text, null::bigint,
      null::uuid, null::text, null::text, null::text, null::timestamptz,
      null::text, null::text, null::text, null::text, null::timestamptz;
    return;
  end if;

  select *
    into v_operation
    from public.fiscal_operations
   where id = p_operation_id
     and user_id = p_user_id
   for update;

  if not found then
    return query select
      'rejected'::text,
      'operation_not_found'::text,
      'No se ha encontrado la operacion fiscal solicitada.'::text,
      'postgres_rpc'::text,
      null::uuid, null::uuid, null::uuid, null::uuid, null::uuid, null::text,
      null::text, null::text, null::date, null::text, null::bigint,
      null::uuid, null::text, null::text, null::text, null::timestamptz,
      null::text, null::text, null::text, null::text, null::timestamptz;
    return;
  end if;

  select *
    into v_record
    from public.fiscal_records
   where operation_id = v_operation.id
   for update;

  if found then
    return query select
      'existing'::text,
      null::text,
      null::text,
      'postgres_rpc'::text,
      v_record.id,
      v_record.user_id,
      v_record.operation_id,
      v_record.invoice_identity_id,
      v_record.server_document_id,
      v_record.environment,
      v_record.issuer_nif,
      v_record.numserie,
      v_record.fecha_expedicion,
      v_record.record_type,
      v_record.record_sequence,
      v_record.previous_record_id,
      v_record.previous_hash,
      v_record.record_hash,
      v_record.hash_algorithm,
      v_record.record_timestamp,
      v_record.document_snapshot_hash,
      v_record.pdf_content_hash,
      v_record.schema_version,
      v_record.renderer_version,
      v_record.created_at;
    return;
  end if;

  if v_operation.status <> 'processing' then
    return query select
      'rejected'::text,
      'operation_not_processing'::text,
      'La operacion fiscal debe estar en processing.'::text,
      'postgres_rpc'::text,
      null::uuid, null::uuid, v_operation.id, null::uuid,
      v_operation.server_document_id, v_operation.environment, null::text,
      null::text, null::date, null::text, null::bigint, null::uuid, null::text,
      null::text, null::text, null::timestamptz, v_operation.document_snapshot_hash,
      null::text, null::text, null::text, null::timestamptz;
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
      'rejected'::text,
      'invoice_identity_missing'::text,
      'La operacion fiscal necesita identidad fiscal.'::text,
      'postgres_rpc'::text,
      null::uuid, null::uuid, v_operation.id, null::uuid,
      v_operation.server_document_id, v_operation.environment, null::text,
      null::text, null::date, null::text, null::bigint, null::uuid, null::text,
      null::text, null::text, null::timestamptz, v_operation.document_snapshot_hash,
      null::text, null::text, null::text, null::timestamptz;
    return;
  end if;

  if nullif(btrim(coalesce(v_identity.issuer_nif, '')), '') is null then
    return query select
      'rejected'::text,
      'issuer_nif_missing'::text,
      'La identidad fiscal necesita issuerNif.'::text,
      'postgres_rpc'::text,
      null::uuid, null::uuid, v_operation.id, v_identity.id,
      v_operation.server_document_id, v_operation.environment, null::text,
      v_identity.numserie, v_identity.fecha_expedicion, null::text,
      null::bigint, null::uuid, null::text, null::text, null::text,
      null::timestamptz, v_operation.document_snapshot_hash, null::text,
      null::text, null::text, null::timestamptz;
    return;
  end if;

  if nullif(btrim(coalesce(v_identity.numserie, '')), '') is null then
    return query select
      'rejected'::text,
      'numserie_missing'::text,
      'La identidad fiscal necesita numserie.'::text,
      'postgres_rpc'::text,
      null::uuid, null::uuid, v_operation.id, v_identity.id,
      v_operation.server_document_id, v_operation.environment,
      v_identity.issuer_nif, null::text, v_identity.fecha_expedicion,
      null::text, null::bigint, null::uuid, null::text, null::text,
      null::text, null::timestamptz, v_operation.document_snapshot_hash,
      null::text, null::text, null::text, null::timestamptz;
    return;
  end if;

  if v_identity.fecha_expedicion is null then
    return query select
      'rejected'::text,
      'fecha_expedicion_missing'::text,
      'La identidad fiscal necesita fecha de expedicion.'::text,
      'postgres_rpc'::text,
      null::uuid, null::uuid, v_operation.id, v_identity.id,
      v_operation.server_document_id, v_operation.environment,
      v_identity.issuer_nif, v_identity.numserie, null::date, null::text,
      null::bigint, null::uuid, null::text, null::text, null::text,
      null::timestamptz, v_operation.document_snapshot_hash, null::text,
      null::text, null::text, null::timestamptz;
    return;
  end if;

  if nullif(btrim(coalesce(v_operation.document_snapshot_hash, '')), '') is null then
    return query select
      'rejected'::text,
      'document_snapshot_hash_missing'::text,
      'La operacion fiscal necesita documentSnapshotHash.'::text,
      'postgres_rpc'::text,
      null::uuid, null::uuid, v_operation.id, v_identity.id,
      v_operation.server_document_id, v_operation.environment,
      v_identity.issuer_nif, v_identity.numserie, v_identity.fecha_expedicion,
      null::text, null::bigint, null::uuid, null::text, null::text,
      null::text, null::timestamptz, null::text, null::text, null::text,
      null::text, null::timestamptz;
    return;
  end if;

  if v_record_hash = '' then
    return query select
      'rejected'::text,
      'record_hash_missing'::text,
      'La persistencia local necesita recordHash candidato.'::text,
      'postgres_rpc'::text,
      null::uuid, null::uuid, v_operation.id, v_identity.id,
      v_operation.server_document_id, v_operation.environment,
      v_identity.issuer_nif, v_identity.numserie, v_identity.fecha_expedicion,
      null::text, null::bigint, null::uuid, null::text, null::text,
      null::text, null::timestamptz, v_operation.document_snapshot_hash,
      null::text, null::text, null::text, null::timestamptz;
    return;
  end if;

  if v_hash_algorithm <> 'sha256-candidate' then
    return query select
      'rejected'::text,
      'unsupported_hash_algorithm'::text,
      'La persistencia local solo acepta sha256-candidate.'::text,
      'postgres_rpc'::text,
      null::uuid, null::uuid, v_operation.id, v_identity.id,
      v_operation.server_document_id, v_operation.environment,
      v_identity.issuer_nif, v_identity.numserie, v_identity.fecha_expedicion,
      null::text, null::bigint, null::uuid, null::text, null::text,
      null::text, null::timestamptz, v_operation.document_snapshot_hash,
      null::text, null::text, null::text, null::timestamptz;
    return;
  end if;

  if v_schema_version <> 'phase2b4l-local-staging-v1' then
    return query select
      'rejected'::text,
      'unsupported_schema_version'::text,
      'La persistencia local solo acepta phase2b4l-local-staging-v1.'::text,
      'postgres_rpc'::text,
      null::uuid, null::uuid, v_operation.id, v_identity.id,
      v_operation.server_document_id, v_operation.environment,
      v_identity.issuer_nif, v_identity.numserie, v_identity.fecha_expedicion,
      null::text, null::bigint, null::uuid, null::text, null::text,
      null::text, null::timestamptz, v_operation.document_snapshot_hash,
      null::text, null::text, null::text, null::timestamptz;
    return;
  end if;

  if v_operation.operation_type in ('alta_inicial', 'alta_subsanacion') then
    v_record_type_candidate := 'alta';
  elsif v_operation.operation_type = 'anulacion' then
    v_record_type_candidate := 'anulacion';
  else
    return query select
      'rejected'::text,
      'unsupported_operation_type'::text,
      'El tipo de operacion fiscal no esta soportado.'::text,
      'postgres_rpc'::text,
      null::uuid, null::uuid, v_operation.id, v_identity.id,
      v_operation.server_document_id, v_operation.environment,
      v_identity.issuer_nif, v_identity.numserie, v_identity.fecha_expedicion,
      null::text, null::bigint, null::uuid, null::text, null::text,
      null::text, null::timestamptz, v_operation.document_snapshot_hash,
      null::text, null::text, null::text, null::timestamptz;
    return;
  end if;

  v_advisory_key := hashtextextended(
    concat_ws('|', v_operation.user_id::text, v_operation.environment, v_identity.issuer_nif),
    0
  );
  perform pg_advisory_xact_lock(v_advisory_key);

  select *
    into v_previous
    from public.fiscal_records
   where user_id = v_operation.user_id
     and environment = v_operation.environment
     and issuer_nif = v_identity.issuer_nif
   order by record_sequence desc
   limit 1
   for update;

  if (case when found then v_previous.id else null end) is distinct from p_expected_previous_record_id
    or (case when found then v_previous.record_hash else null end) is distinct from p_expected_previous_hash then
    return query select
      'conflict'::text,
      'record_chain_head_changed'::text,
      'La cabecera local de registros fiscales ha cambiado antes de persistir.'::text,
      'postgres_rpc'::text,
      null::uuid, null::uuid, v_operation.id, v_identity.id,
      v_operation.server_document_id, v_operation.environment,
      v_identity.issuer_nif, v_identity.numserie, v_identity.fecha_expedicion,
      v_record_type_candidate, null::bigint,
      case when found then v_previous.id else null end,
      case when found then v_previous.record_hash else null end,
      null::text, null::text, null::timestamptz,
      v_operation.document_snapshot_hash, null::text, null::text,
      null::text, null::timestamptz;
    return;
  end if;

  v_record_sequence := coalesce(v_previous.record_sequence, 0) + 1;

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
    v_record_sequence,
    case when v_previous.id is null then null else v_previous.id end,
    case when v_previous.id is null then null else v_previous.record_hash end,
    v_record_hash,
    v_hash_algorithm,
    v_record_timestamp,
    'PHASE2B4L_NO_AEAT_XML_CANDIDATE',
    null,
    v_operation.document_snapshot_hash,
    null,
    v_schema_version,
    nullif(btrim(coalesce(p_renderer_version, '')), '')
  )
  returning *
  into v_record;

  return query select
    'created'::text,
    null::text,
    null::text,
    'postgres_rpc'::text,
    v_record.id,
    v_record.user_id,
    v_record.operation_id,
    v_record.invoice_identity_id,
    v_record.server_document_id,
    v_record.environment,
    v_record.issuer_nif,
    v_record.numserie,
    v_record.fecha_expedicion,
    v_record.record_type,
    v_record.record_sequence,
    v_record.previous_record_id,
    v_record.previous_hash,
    v_record.record_hash,
    v_record.hash_algorithm,
    v_record.record_timestamp,
    v_record.document_snapshot_hash,
    v_record.pdf_content_hash,
    v_record.schema_version,
    v_record.renderer_version,
    v_record.created_at;
end;
$$;

revoke all on function public.create_fiscal_record_local_staging(
  uuid, uuid, uuid, text, text, text, timestamptz, text, text
) from public, anon, authenticated;

grant execute on function public.create_fiscal_record_local_staging(
  uuid, uuid, uuid, text, text, text, timestamptz, text, text
) to service_role;

commit;
