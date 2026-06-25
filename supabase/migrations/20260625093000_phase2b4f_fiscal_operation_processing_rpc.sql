-- Phase 2B.4F fiscal operation processing transition RPC.
-- Scope: Supabase local and staging only.
-- This migration does not create fiscal records, update fiscal chain state,
-- create transport attempts, generate AEAT XML, use certificates, or enable
-- production rollout.

begin;

create or replace function public.mark_fiscal_operation_processing(
  p_user_id uuid,
  p_operation_id uuid,
  p_marked_at timestamptz default null
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
  operation_updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_operation public.fiscal_operations%rowtype;
  v_marked_at timestamptz := coalesce(p_marked_at, now());
begin
  if auth.role() <> 'service_role' then
    raise exception 'mark_fiscal_operation_processing can only be executed by service_role'
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
      'rejected'::text,
      'operation_not_found'::text,
      'No se ha encontrado la operacion fiscal solicitada.'::text,
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
      null::timestamptz;
    return;
  end if;

  if v_operation.status = 'processing' then
    return query select
      'existing_processing'::text,
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
      v_operation.updated_at;
    return;
  end if;

  if v_operation.status <> 'requested' then
    return query select
      'rejected'::text,
      'operation_status_incompatible'::text,
      'La operacion fiscal no esta en estado requested.'::text,
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
      v_operation.updated_at;
    return;
  end if;

  update public.fiscal_operations
     set status = 'processing',
         updated_at = v_marked_at,
         failure_code = null,
         failure_message = null,
         failed_at = null
   where id = v_operation.id
     and user_id = v_operation.user_id
     and status = 'requested'
  returning *
  into v_operation;

  if found then
    return query select
      'processing'::text,
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
      v_operation.updated_at;
    return;
  end if;

  return query select
    'conflict'::text,
    'operation_processing_race'::text,
    'La operacion fiscal ha cambiado durante la transicion a processing.'::text,
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
    null::timestamptz;
end;
$$;

revoke all on function public.mark_fiscal_operation_processing(
  uuid, uuid, timestamptz
) from public, anon, authenticated;

grant execute on function public.mark_fiscal_operation_processing(
  uuid, uuid, timestamptz
) to service_role;

commit;
