-- Phase 2B.4R fiscal evidence packet local/staging persistence.
-- Scope: Supabase local and staging only.
-- This migration stores internal dry-run evidence packets in a separate table.
-- It does not create transport attempts, generate final AEAT XML, sign XML,
-- use certificates, store full XML/snapshots, or enable production rollout.

begin;

create table if not exists public.fiscal_evidence_packets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  environment text not null check (environment in ('test', 'production')),
  record_id uuid not null references public.fiscal_records(id) on delete restrict,
  operation_id uuid not null references public.fiscal_operations(id) on delete restrict,
  record_sequence bigint not null check (record_sequence > 0),
  record_hash text not null check (record_hash ~ '^sha256:[a-f0-9]{64}$'),
  previous_hash text check (previous_hash is null or previous_hash ~ '^sha256:[a-f0-9]{64}$'),
  payload_candidate_id text not null check (btrim(payload_candidate_id) <> ''),
  payload_validation_status text not null check (payload_validation_status = 'valid'),
  xml_candidate_digest text check (xml_candidate_digest is null or xml_candidate_digest ~ '^sha256:[a-f0-9]{64}$'),
  evidence_finality text not null check (evidence_finality = 'internal_dry_run_evidence'),
  transportable boolean not null default false check (transportable = false),
  created_at timestamptz not null default now(),
  metadata_safe jsonb not null default '{}'::jsonb,
  constraint fiscal_evidence_packets_record_unique unique (record_id),
  constraint fiscal_evidence_packets_metadata_safe_object
    check (jsonb_typeof(metadata_safe) = 'object'),
  constraint fiscal_evidence_packets_metadata_no_sensitive_markers
    check (
      metadata_safe::text !~* '(candidateXml|xml_payload|documentSnapshot|document_snapshot|pdf_snapshot|payloadDocument|service_role|sb_secret|sk-proj|BEGIN CERTIFICATE|BEGIN PRIVATE KEY|agenciatributaria|Suministro|fiscal_transport_attempts)'
    )
);

comment on table public.fiscal_evidence_packets is
  'Local/staging internal dry-run evidence packets only. Separate from fiscal_records, fiscal_chain_state, and any transport attempt table.';
comment on column public.fiscal_evidence_packets.xml_candidate_digest is
  'Safe digest of the candidate XML. The candidate XML itself is never stored here.';
comment on column public.fiscal_evidence_packets.transportable is
  'Always false in Phase 2B.4R/S. This table is not an AEAT transport queue.';
comment on column public.fiscal_evidence_packets.metadata_safe is
  'Safe non-document metadata only. No XML, full snapshots, service role, tokens, certificates, or AEAT endpoints.';

create index if not exists fiscal_evidence_packets_user_created_idx
  on public.fiscal_evidence_packets (user_id, created_at desc);

create index if not exists fiscal_evidence_packets_user_record_idx
  on public.fiscal_evidence_packets (user_id, record_id);

create index if not exists fiscal_evidence_packets_user_operation_idx
  on public.fiscal_evidence_packets (user_id, operation_id);

alter table public.fiscal_evidence_packets enable row level security;

revoke all on table public.fiscal_evidence_packets from public, anon, authenticated;
grant select on table public.fiscal_evidence_packets to service_role;

create or replace function public.create_fiscal_evidence_packet_local_staging(
  p_user_id uuid,
  p_record_id uuid,
  p_payload_candidate_id text,
  p_payload_validation_status text,
  p_xml_candidate_digest text default null,
  p_evidence_finality text default 'internal_dry_run_evidence',
  p_transportable boolean default false,
  p_metadata_safe jsonb default '{}'::jsonb,
  p_created_at timestamptz default null
)
returns table (
  result_status text,
  reason text,
  message text,
  atomicity text,
  evidence_packet_id uuid,
  evidence_user_id uuid,
  evidence_environment text,
  evidence_record_id uuid,
  evidence_operation_id uuid,
  evidence_record_sequence bigint,
  evidence_record_hash text,
  evidence_previous_hash text,
  evidence_payload_candidate_id text,
  evidence_payload_validation_status text,
  evidence_xml_candidate_digest text,
  evidence_finality text,
  evidence_transportable boolean,
  evidence_created_at timestamptz,
  evidence_metadata_safe jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_record public.fiscal_records%rowtype;
  v_chain public.fiscal_chain_state%rowtype;
  v_existing public.fiscal_evidence_packets%rowtype;
  v_packet public.fiscal_evidence_packets%rowtype;
  v_payload_candidate_id text := btrim(coalesce(p_payload_candidate_id, ''));
  v_payload_validation_status text := btrim(coalesce(p_payload_validation_status, ''));
  v_xml_candidate_digest text := nullif(btrim(coalesce(p_xml_candidate_digest, '')), '');
  v_evidence_finality text := btrim(coalesce(p_evidence_finality, ''));
  v_metadata_safe jsonb := coalesce(p_metadata_safe, '{}'::jsonb);
  v_created_at timestamptz := coalesce(p_created_at, now());
begin
  if auth.role() <> 'service_role' then
    raise exception 'create_fiscal_evidence_packet_local_staging can only be executed by service_role'
      using errcode = '42501';
  end if;

  if p_user_id is null or p_record_id is null then
    return query select
      'rejected'::text, 'record_not_found'::text,
      'No se ha encontrado el registro fiscal local solicitado.'::text,
      'postgres_rpc'::text,
      null::uuid, null::uuid, null::text, null::uuid, null::uuid,
      null::bigint, null::text, null::text, null::text, null::text,
      null::text, null::text, null::boolean, null::timestamptz, null::jsonb;
    return;
  end if;

  select *
    into v_record
    from public.fiscal_records
   where id = p_record_id
     and user_id = p_user_id
   for update;

  if not found then
    return query select
      'rejected'::text, 'record_not_found'::text,
      'No se ha encontrado el registro fiscal local solicitado.'::text,
      'postgres_rpc'::text,
      null::uuid, p_user_id, null::text, p_record_id, null::uuid,
      null::bigint, null::text, null::text, null::text, null::text,
      null::text, null::text, null::boolean, null::timestamptz, null::jsonb;
    return;
  end if;

  select *
    into v_existing
    from public.fiscal_evidence_packets
   where record_id = v_record.id
   for update;

  if found then
    return query select
      'existing'::text, null::text, null::text, 'postgres_rpc'::text,
      v_existing.id, v_existing.user_id, v_existing.environment,
      v_existing.record_id, v_existing.operation_id,
      v_existing.record_sequence, v_existing.record_hash,
      v_existing.previous_hash, v_existing.payload_candidate_id,
      v_existing.payload_validation_status, v_existing.xml_candidate_digest,
      v_existing.evidence_finality, v_existing.transportable,
      v_existing.created_at, v_existing.metadata_safe;
    return;
  end if;

  select *
    into v_chain
    from public.fiscal_chain_state
   where user_id = v_record.user_id
     and environment = v_record.environment
     and issuer_nif = v_record.issuer_nif
   for update;

  if not found then
    return query select
      'conflict'::text, 'chain_state_missing'::text,
      'No existe cabecera de cadena local para este registro.'::text,
      'postgres_rpc'::text,
      null::uuid, v_record.user_id, v_record.environment, v_record.id,
      v_record.operation_id, v_record.record_sequence, v_record.record_hash,
      v_record.previous_hash, null::text, null::text, null::text,
      null::text, null::boolean, null::timestamptz, null::jsonb;
    return;
  end if;

  if v_chain.record_count < v_record.record_sequence
    or (
      v_chain.record_count = v_record.record_sequence
      and (
        v_chain.last_record_id is distinct from v_record.id
        or v_chain.last_hash is distinct from v_record.record_hash
      )
    ) then
    return query select
      'conflict'::text, 'chain_state_inconsistent'::text,
      'La cabecera de cadena local no confirma este registro.'::text,
      'postgres_rpc'::text,
      null::uuid, v_record.user_id, v_record.environment, v_record.id,
      v_record.operation_id, v_record.record_sequence, v_record.record_hash,
      v_record.previous_hash, null::text, null::text, null::text,
      null::text, null::boolean, null::timestamptz, null::jsonb;
    return;
  end if;

  if v_payload_candidate_id = '' then
    return query select
      'rejected'::text, 'payload_candidate_missing'::text,
      'La evidencia interna necesita payloadCandidateId.'::text,
      'postgres_rpc'::text,
      null::uuid, v_record.user_id, v_record.environment, v_record.id,
      v_record.operation_id, v_record.record_sequence, v_record.record_hash,
      v_record.previous_hash, null::text, null::text, null::text,
      null::text, null::boolean, null::timestamptz, null::jsonb;
    return;
  end if;

  if v_payload_validation_status <> 'valid' then
    return query select
      'rejected'::text, 'payload_validation_not_valid'::text,
      'La evidencia interna solo persiste payloads validados como valid.'::text,
      'postgres_rpc'::text,
      null::uuid, v_record.user_id, v_record.environment, v_record.id,
      v_record.operation_id, v_record.record_sequence, v_record.record_hash,
      v_record.previous_hash, v_payload_candidate_id, v_payload_validation_status,
      v_xml_candidate_digest, null::text, null::boolean, null::timestamptz,
      null::jsonb;
    return;
  end if;

  if v_xml_candidate_digest is not null
    and v_xml_candidate_digest !~ '^sha256:[a-f0-9]{64}$' then
    return query select
      'rejected'::text, 'xml_candidate_digest_invalid'::text,
      'La evidencia interna solo acepta digest sha256 del XML candidato.'::text,
      'postgres_rpc'::text,
      null::uuid, v_record.user_id, v_record.environment, v_record.id,
      v_record.operation_id, v_record.record_sequence, v_record.record_hash,
      v_record.previous_hash, v_payload_candidate_id, v_payload_validation_status,
      v_xml_candidate_digest, null::text, null::boolean, null::timestamptz,
      null::jsonb;
    return;
  end if;

  if v_evidence_finality <> 'internal_dry_run_evidence' then
    return query select
      'rejected'::text, 'evidence_finality_invalid'::text,
      'La evidencia persistida debe ser internal_dry_run_evidence.'::text,
      'postgres_rpc'::text,
      null::uuid, v_record.user_id, v_record.environment, v_record.id,
      v_record.operation_id, v_record.record_sequence, v_record.record_hash,
      v_record.previous_hash, v_payload_candidate_id, v_payload_validation_status,
      v_xml_candidate_digest, v_evidence_finality, p_transportable,
      null::timestamptz, null::jsonb;
    return;
  end if;

  if coalesce(p_transportable, true) <> false then
    return query select
      'rejected'::text, 'transportable_not_allowed'::text,
      'La evidencia interna local/staging no puede ser transportable.'::text,
      'postgres_rpc'::text,
      null::uuid, v_record.user_id, v_record.environment, v_record.id,
      v_record.operation_id, v_record.record_sequence, v_record.record_hash,
      v_record.previous_hash, v_payload_candidate_id, v_payload_validation_status,
      v_xml_candidate_digest, v_evidence_finality, p_transportable,
      null::timestamptz, null::jsonb;
    return;
  end if;

  if jsonb_typeof(v_metadata_safe) <> 'object'
    or v_metadata_safe::text ~* '(candidateXml|xml_payload|documentSnapshot|document_snapshot|pdf_snapshot|payloadDocument|service_role|sb_secret|sk-proj|BEGIN CERTIFICATE|BEGIN PRIVATE KEY|agenciatributaria|Suministro|fiscal_transport_attempts)' then
    return query select
      'rejected'::text, 'metadata_unsafe'::text,
      'La metadata de evidencia contiene datos no permitidos.'::text,
      'postgres_rpc'::text,
      null::uuid, v_record.user_id, v_record.environment, v_record.id,
      v_record.operation_id, v_record.record_sequence, v_record.record_hash,
      v_record.previous_hash, v_payload_candidate_id, v_payload_validation_status,
      v_xml_candidate_digest, v_evidence_finality, false, null::timestamptz,
      null::jsonb;
    return;
  end if;

  insert into public.fiscal_evidence_packets (
    user_id,
    environment,
    record_id,
    operation_id,
    record_sequence,
    record_hash,
    previous_hash,
    payload_candidate_id,
    payload_validation_status,
    xml_candidate_digest,
    evidence_finality,
    transportable,
    created_at,
    metadata_safe
  )
  values (
    v_record.user_id,
    v_record.environment,
    v_record.id,
    v_record.operation_id,
    v_record.record_sequence,
    v_record.record_hash,
    v_record.previous_hash,
    v_payload_candidate_id,
    v_payload_validation_status,
    v_xml_candidate_digest,
    v_evidence_finality,
    false,
    v_created_at,
    v_metadata_safe
  )
  returning *
    into v_packet;

  return query select
    'created'::text, null::text, null::text, 'postgres_rpc'::text,
    v_packet.id, v_packet.user_id, v_packet.environment, v_packet.record_id,
    v_packet.operation_id, v_packet.record_sequence, v_packet.record_hash,
    v_packet.previous_hash, v_packet.payload_candidate_id,
    v_packet.payload_validation_status, v_packet.xml_candidate_digest,
    v_packet.evidence_finality, v_packet.transportable, v_packet.created_at,
    v_packet.metadata_safe;
end;
$$;

revoke all on function public.create_fiscal_evidence_packet_local_staging(
  uuid, uuid, text, text, text, text, boolean, jsonb, timestamptz
) from public, anon, authenticated;

grant execute on function public.create_fiscal_evidence_packet_local_staging(
  uuid, uuid, text, text, text, text, boolean, jsonb, timestamptz
) to service_role;

commit;
