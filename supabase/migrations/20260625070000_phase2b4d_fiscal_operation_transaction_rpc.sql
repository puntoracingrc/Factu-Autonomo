-- Phase 2B.4D fiscal operation transaction RPC.
-- Scope: Supabase local and staging only.
-- This migration does not create fiscal records, update fiscal chain state,
-- create transport attempts, generate AEAT XML, use certificates, or enable
-- production rollout.

begin;

create or replace function public.reserve_fiscal_operation(
  p_user_id uuid,
  p_server_document_id uuid,
  p_operation_type text,
  p_environment text,
  p_expected_document_version integer,
  p_idempotency_key text default null,
  p_requested_by uuid default null,
  p_requested_at timestamptz default null
)
returns table (
  result_status text,
  reason text,
  message text,
  atomicity text,
  operation_id uuid,
  operation_user_id uuid,
  operation_server_document_id uuid,
  operation_type text,
  operation_environment text,
  operation_idempotency_key text,
  operation_requested_by uuid,
  operation_requested_at timestamptz,
  operation_expected_document_version integer,
  operation_document_snapshot_hash text,
  operation_status text,
  operation_completed_at timestamptz,
  operation_failed_at timestamptz,
  operation_failure_code text,
  operation_failure_message text,
  operation_created_at timestamptz,
  operation_updated_at timestamptz,
  invoice_identity_id uuid,
  invoice_identity_user_id uuid,
  invoice_identity_server_document_id uuid,
  invoice_identity_environment text,
  invoice_identity_issuer_nif text,
  invoice_identity_numserie text,
  invoice_identity_fecha_expedicion date,
  invoice_identity_created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_document public.server_documents%rowtype;
  v_operation public.fiscal_operations%rowtype;
  v_identity public.fiscal_invoice_identities%rowtype;
  v_operation_type text := lower(btrim(coalesce(p_operation_type, '')));
  v_environment text := lower(btrim(coalesce(p_environment, '')));
  v_idempotency_key text;
  v_requested_at timestamptz := coalesce(p_requested_at, now());
  v_requested_by uuid := coalesce(p_requested_by, p_user_id);
begin
  if auth.role() <> 'service_role' then
    raise exception 'reserve_fiscal_operation can only be executed by service_role'
      using errcode = '42501';
  end if;

  if p_expected_document_version is null or p_expected_document_version < 1 then
    return query select
      'rejected'::text,
      'missing_expected_document_version'::text,
      'La operacion fiscal necesita expectedDocumentVersion.'::text,
      'postgres_rpc'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      null::uuid,
      null::timestamptz,
      null::integer,
      null::text,
      null::text,
      null::timestamptz,
      null::timestamptz,
      null::text,
      null::text,
      null::timestamptz,
      null::timestamptz,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      null::date,
      null::timestamptz;
    return;
  end if;

  if v_operation_type not in ('alta_inicial', 'alta_subsanacion', 'anulacion') then
    return query select
      'rejected'::text,
      'unsupported_operation'::text,
      'El tipo de operacion fiscal no esta soportado.'::text,
      'postgres_rpc'::text,
      null::uuid, null::uuid, null::uuid, null::text, null::text, null::text,
      null::uuid, null::timestamptz, null::integer, null::text, null::text,
      null::timestamptz, null::timestamptz, null::text, null::text,
      null::timestamptz, null::timestamptz, null::uuid, null::uuid,
      null::uuid, null::text, null::text, null::text, null::date,
      null::timestamptz;
    return;
  end if;

  if v_environment not in ('test', 'production') then
    return query select
      'rejected'::text,
      'invalid_environment'::text,
      'El entorno fiscal no es valido.'::text,
      'postgres_rpc'::text,
      null::uuid, null::uuid, null::uuid, null::text, null::text, null::text,
      null::uuid, null::timestamptz, null::integer, null::text, null::text,
      null::timestamptz, null::timestamptz, null::text, null::text,
      null::timestamptz, null::timestamptz, null::uuid, null::uuid,
      null::uuid, null::text, null::text, null::text, null::date,
      null::timestamptz;
    return;
  end if;

  select *
    into v_document
    from public.server_documents
   where id = p_server_document_id
     and user_id = p_user_id
   for update;

  if not found then
    return query select
      'rejected'::text,
      'document_not_found'::text,
      'No se ha encontrado el documento canonico.'::text,
      'postgres_rpc'::text,
      null::uuid, null::uuid, null::uuid, null::text, null::text, null::text,
      null::uuid, null::timestamptz, null::integer, null::text, null::text,
      null::timestamptz, null::timestamptz, null::text, null::text,
      null::timestamptz, null::timestamptz, null::uuid, null::uuid,
      null::uuid, null::text, null::text, null::text, null::date,
      null::timestamptz;
    return;
  end if;

  if v_document.version <> p_expected_document_version then
    return query select
      'conflict'::text,
      'document_version_conflict'::text,
      'El documento canonico ha cambiado antes de reservar la operacion fiscal.'::text,
      'postgres_rpc'::text,
      null::uuid, null::uuid, null::uuid, null::text, null::text, null::text,
      null::uuid, null::timestamptz, null::integer, null::text, null::text,
      null::timestamptz, null::timestamptz, null::text, null::text,
      null::timestamptz, null::timestamptz, null::uuid, null::uuid,
      null::uuid, null::text, null::text, null::text, null::date,
      null::timestamptz;
    return;
  end if;

  if v_document.document_type <> 'factura'
    or v_document.document_lifecycle = 'draft'
    or v_document.integrity_lock <> 'locked' then
    return query select
      'rejected'::text,
      'document_not_eligible'::text,
      'El documento canonico no es elegible para una operacion fiscal.'::text,
      'postgres_rpc'::text,
      null::uuid, null::uuid, null::uuid, null::text, null::text, null::text,
      null::uuid, null::timestamptz, null::integer, null::text, null::text,
      null::timestamptz, null::timestamptz, null::text, null::text,
      null::timestamptz, null::timestamptz, null::uuid, null::uuid,
      null::uuid, null::text, null::text, null::text, null::date,
      null::timestamptz;
    return;
  end if;

  if nullif(btrim(coalesce(v_document.snapshot_hash, '')), '') is null then
    return query select
      'rejected'::text,
      'snapshot_hash_missing'::text,
      'La operacion fiscal necesita un snapshotHash documental.'::text,
      'postgres_rpc'::text,
      null::uuid, null::uuid, null::uuid, null::text, null::text, null::text,
      null::uuid, null::timestamptz, null::integer, null::text, null::text,
      null::timestamptz, null::timestamptz, null::text, null::text,
      null::timestamptz, null::timestamptz, null::uuid, null::uuid,
      null::uuid, null::text, null::text, null::text, null::date,
      null::timestamptz;
    return;
  end if;

  if nullif(btrim(coalesce(v_document.issuer_nif, '')), '') is null then
    return query select
      'rejected'::text,
      'issuer_nif_missing'::text,
      'La identidad fiscal necesita el NIF del emisor.'::text,
      'postgres_rpc'::text,
      null::uuid, null::uuid, null::uuid, null::text, null::text, null::text,
      null::uuid, null::timestamptz, null::integer, null::text, null::text,
      null::timestamptz, null::timestamptz, null::text, null::text,
      null::timestamptz, null::timestamptz, null::uuid, null::uuid,
      null::uuid, null::text, null::text, null::text, null::date,
      null::timestamptz;
    return;
  end if;

  if nullif(btrim(coalesce(v_document.numserie, '')), '') is null then
    return query select
      'rejected'::text,
      'numserie_missing'::text,
      'La identidad fiscal necesita numero y serie.'::text,
      'postgres_rpc'::text,
      null::uuid, null::uuid, null::uuid, null::text, null::text, null::text,
      null::uuid, null::timestamptz, null::integer, null::text, null::text,
      null::timestamptz, null::timestamptz, null::text, null::text,
      null::timestamptz, null::timestamptz, null::uuid, null::uuid,
      null::uuid, null::text, null::text, null::text, null::date,
      null::timestamptz;
    return;
  end if;

  if v_document.issue_date is null then
    return query select
      'rejected'::text,
      'issue_date_missing'::text,
      'La identidad fiscal necesita fecha de expedicion.'::text,
      'postgres_rpc'::text,
      null::uuid, null::uuid, null::uuid, null::text, null::text, null::text,
      null::uuid, null::timestamptz, null::integer, null::text, null::text,
      null::timestamptz, null::timestamptz, null::text, null::text,
      null::timestamptz, null::timestamptz, null::uuid, null::uuid,
      null::uuid, null::text, null::text, null::text, null::date,
      null::timestamptz;
    return;
  end if;

  v_idempotency_key := coalesce(
    nullif(btrim(coalesce(p_idempotency_key, '')), ''),
    'fiscal-operation-v1:' || md5(concat_ws(
      '|',
      p_user_id::text,
      p_server_document_id::text,
      v_operation_type,
      v_environment,
      p_expected_document_version::text,
      v_document.snapshot_hash
    ))
  );

  select *
    into v_operation
    from public.fiscal_operations
   where user_id = p_user_id
     and idempotency_key = v_idempotency_key
   for update;

  if found then
    return query select
      'existing'::text,
      null::text,
      null::text,
      'postgres_rpc'::text,
      v_operation.id,
      v_operation.user_id,
      v_operation.server_document_id,
      v_operation.operation_type,
      v_operation.environment,
      v_operation.idempotency_key,
      v_operation.requested_by,
      v_operation.requested_at,
      v_operation.expected_document_version,
      v_operation.document_snapshot_hash,
      v_operation.status,
      v_operation.completed_at,
      v_operation.failed_at,
      v_operation.failure_code,
      v_operation.failure_message,
      v_operation.created_at,
      v_operation.updated_at,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      null::date,
      null::timestamptz;
    return;
  end if;

  insert into public.fiscal_invoice_identities (
    user_id,
    server_document_id,
    environment,
    issuer_nif,
    numserie,
    fecha_expedicion
  )
  values (
    p_user_id,
    p_server_document_id,
    v_environment,
    btrim(v_document.issuer_nif),
    btrim(v_document.numserie),
    v_document.issue_date
  )
  on conflict (user_id, environment, issuer_nif, numserie, fecha_expedicion)
  do nothing
  returning *
  into v_identity;

  if not found then
    select *
      into v_identity
      from public.fiscal_invoice_identities
     where user_id = p_user_id
       and environment = v_environment
       and issuer_nif = btrim(v_document.issuer_nif)
       and numserie = btrim(v_document.numserie)
       and fecha_expedicion = v_document.issue_date
     for update;

    if not found then
      return query select
        'conflict'::text,
        'identity_race'::text,
        'La identidad fiscal se ha reservado de forma concurrente.'::text,
        'postgres_rpc'::text,
        null::uuid, null::uuid, null::uuid, null::text, null::text, null::text,
        null::uuid, null::timestamptz, null::integer, null::text, null::text,
        null::timestamptz, null::timestamptz, null::text, null::text,
        null::timestamptz, null::timestamptz, null::uuid, null::uuid,
        null::uuid, null::text, null::text, null::text, null::date,
        null::timestamptz;
      return;
    end if;
  end if;

  insert into public.fiscal_operations (
    user_id,
    server_document_id,
    operation_type,
    environment,
    idempotency_key,
    requested_by,
    requested_at,
    expected_document_version,
    document_snapshot_hash,
    status,
    completed_at,
    failed_at,
    failure_code,
    failure_message
  )
  values (
    p_user_id,
    p_server_document_id,
    v_operation_type,
    v_environment,
    v_idempotency_key,
    v_requested_by,
    v_requested_at,
    p_expected_document_version,
    v_document.snapshot_hash,
    'requested',
    null,
    null,
    null,
    null
  )
  on conflict (user_id, idempotency_key)
  do nothing
  returning *
  into v_operation;

  if found then
    return query select
      'created'::text,
      null::text,
      null::text,
      'postgres_rpc'::text,
      v_operation.id,
      v_operation.user_id,
      v_operation.server_document_id,
      v_operation.operation_type,
      v_operation.environment,
      v_operation.idempotency_key,
      v_operation.requested_by,
      v_operation.requested_at,
      v_operation.expected_document_version,
      v_operation.document_snapshot_hash,
      v_operation.status,
      v_operation.completed_at,
      v_operation.failed_at,
      v_operation.failure_code,
      v_operation.failure_message,
      v_operation.created_at,
      v_operation.updated_at,
      v_identity.id,
      v_identity.user_id,
      v_identity.server_document_id,
      v_identity.environment,
      v_identity.issuer_nif,
      v_identity.numserie,
      v_identity.fecha_expedicion,
      v_identity.created_at;
    return;
  end if;

  select *
    into v_operation
    from public.fiscal_operations
   where user_id = p_user_id
     and idempotency_key = v_idempotency_key
   for update;

  if found then
    return query select
      'existing'::text,
      null::text,
      null::text,
      'postgres_rpc'::text,
      v_operation.id,
      v_operation.user_id,
      v_operation.server_document_id,
      v_operation.operation_type,
      v_operation.environment,
      v_operation.idempotency_key,
      v_operation.requested_by,
      v_operation.requested_at,
      v_operation.expected_document_version,
      v_operation.document_snapshot_hash,
      v_operation.status,
      v_operation.completed_at,
      v_operation.failed_at,
      v_operation.failure_code,
      v_operation.failure_message,
      v_operation.created_at,
      v_operation.updated_at,
      v_identity.id,
      v_identity.user_id,
      v_identity.server_document_id,
      v_identity.environment,
      v_identity.issuer_nif,
      v_identity.numserie,
      v_identity.fecha_expedicion,
      v_identity.created_at;
    return;
  end if;

  return query select
    'conflict'::text,
    'operation_race'::text,
    'La operacion fiscal se ha reservado de forma concurrente.'::text,
    'postgres_rpc'::text,
    null::uuid, null::uuid, null::uuid, null::text, null::text, null::text,
    null::uuid, null::timestamptz, null::integer, null::text, null::text,
    null::timestamptz, null::timestamptz, null::text, null::text,
    null::timestamptz, null::timestamptz, null::uuid, null::uuid,
    null::uuid, null::text, null::text, null::text, null::date,
    null::timestamptz;
end;
$$;

revoke all on function public.reserve_fiscal_operation(
  uuid, uuid, text, text, integer, text, uuid, timestamptz
) from public, anon, authenticated;

grant execute on function public.reserve_fiscal_operation(
  uuid, uuid, text, text, integer, text, uuid, timestamptz
) to service_role;

commit;
