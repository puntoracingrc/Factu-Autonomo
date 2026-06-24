-- Phase 2B.2 server document and fiscal schema.
-- Scope: Supabase local and staging only.
-- This migration does not implement VERI*FACTU submission, AEAT transport,
-- real credentials, document issuance endpoints, or production rollout.

begin;

create table public.server_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  local_document_id text not null,
  document_type text not null check (
    document_type in ('factura', 'presupuesto', 'recibo')
  ),
  document_kind text not null check (
    document_kind in ('standard', 'rectificativa', 'quote', 'receipt')
  ),
  document_lifecycle text not null default 'draft' check (
    document_lifecycle in ('draft', 'issued', 'canceled')
  ),
  integrity_lock text not null default 'unlocked' check (
    integrity_lock in ('unlocked', 'locked')
  ),
  status_legacy text not null,
  version integer not null default 1 check (version >= 1),
  payload jsonb not null,
  document_snapshot jsonb,
  pdf_snapshot jsonb,
  snapshot_hash text,
  pdf_content_hash text,
  issuer_nif text,
  numserie text,
  issue_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  issued_at timestamptz,
  canceled_at timestamptz,
  constraint server_documents_local_document_unique
    unique (user_id, local_document_id),
  constraint server_documents_issued_lock_consistency
    check (
      document_lifecycle = 'draft'
      or integrity_lock = 'locked'
    ),
  constraint server_documents_canceled_timestamp_check
    check (
      document_lifecycle <> 'canceled'
      or canceled_at is not null
    )
);

comment on table public.server_documents is
  'Phase 2B local/staging canonical server documents. Not production-enabled.';
comment on column public.server_documents.payload is
  'Raw canonical payload. Do not expose directly to browser clients.';
comment on column public.server_documents.document_snapshot is
  'Frozen document snapshot. Do not expose directly to browser clients.';
comment on column public.server_documents.pdf_snapshot is
  'Frozen PDF snapshot. Do not expose directly to browser clients.';

create index server_documents_user_updated_idx
  on public.server_documents (user_id, updated_at desc);
create index server_documents_user_lifecycle_idx
  on public.server_documents (user_id, document_lifecycle);
create index server_documents_invoice_identity_idx
  on public.server_documents (user_id, issuer_nif, numserie, issue_date)
  where issuer_nif is not null and numserie is not null and issue_date is not null;

create table public.server_document_versions (
  id uuid primary key default gen_random_uuid(),
  server_document_id uuid not null references public.server_documents (id)
    on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  version integer not null check (version >= 1),
  change_type text not null check (
    change_type in (
      'create',
      'update',
      'issue',
      'cancel',
      'merge_customer',
      'import',
      'sync',
      'repair'
    )
  ),
  payload_before_hash text,
  payload_after_hash text,
  changed_fields jsonb not null default '{}'::jsonb,
  actor_type text not null check (
    actor_type in ('user', 'server', 'system', 'importer', 'sync', 'admin')
  ),
  actor_id text,
  created_at timestamptz not null default now(),
  constraint server_document_versions_document_version_unique
    unique (server_document_id, version)
);

comment on table public.server_document_versions is
  'Append-only technical version history for canonical server documents.';

create index server_document_versions_user_document_idx
  on public.server_document_versions (user_id, server_document_id, version desc);

create table public.document_conflicts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  server_document_id uuid references public.server_documents (id)
    on delete cascade,
  local_document_id text not null,
  conflict_type text not null check (
    conflict_type in (
      'version',
      'integrity_lock',
      'snapshot',
      'delete',
      'numbering',
      'payload',
      'legacy',
      'unknown'
    )
  ),
  incoming_payload_hash text,
  server_payload_hash text,
  resolution_status text not null default 'open' check (
    resolution_status in ('open', 'ignored', 'resolved')
  ),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint document_conflicts_resolved_at_check
    check (
      resolution_status = 'open'
      or resolved_at is not null
    )
);

comment on table public.document_conflicts is
  'Rejected or pending sync/import conflicts. Never overwrites locked documents.';

create index document_conflicts_user_status_idx
  on public.document_conflicts (user_id, resolution_status, created_at desc);

create table public.fiscal_operations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  server_document_id uuid not null references public.server_documents (id)
    on delete restrict,
  operation_type text not null check (
    operation_type in ('alta_inicial', 'alta_subsanacion', 'anulacion')
  ),
  environment text not null check (environment in ('test', 'production')),
  idempotency_key text not null,
  requested_by uuid references auth.users (id) on delete set null,
  requested_at timestamptz not null default now(),
  expected_document_version integer not null check (expected_document_version >= 1),
  document_snapshot_hash text not null,
  status text not null default 'requested' check (
    status in (
      'requested',
      'processing',
      'completed',
      'failed_retryable',
      'failed_final'
    )
  ),
  completed_at timestamptz,
  failed_at timestamptz,
  failure_code text,
  failure_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fiscal_operations_user_idempotency_unique
    unique (user_id, idempotency_key),
  constraint fiscal_operations_completed_at_check
    check (
      status <> 'completed'
      or completed_at is not null
    ),
  constraint fiscal_operations_failed_at_check
    check (
      status not in ('failed_retryable', 'failed_final')
      or failed_at is not null
    )
);

comment on table public.fiscal_operations is
  'Concrete fiscal operation request. Idempotency identifies the operation, not later retry transport attempts.';

create index fiscal_operations_user_document_idx
  on public.fiscal_operations (user_id, server_document_id, created_at desc);
create index fiscal_operations_status_idx
  on public.fiscal_operations (status, created_at);

create table public.fiscal_invoice_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  server_document_id uuid not null references public.server_documents (id)
    on delete restrict,
  environment text not null check (environment in ('test', 'production')),
  issuer_nif text not null,
  numserie text not null,
  fecha_expedicion date not null,
  created_at timestamptz not null default now(),
  constraint fiscal_invoice_identities_user_invoice_unique
    unique (user_id, environment, issuer_nif, numserie, fecha_expedicion)
);

comment on table public.fiscal_invoice_identities is
  'Invoice fiscal identity for local/staging. Production must revisit whether uniqueness is global or user-scoped before rollout.';

create index fiscal_invoice_identities_document_idx
  on public.fiscal_invoice_identities (server_document_id);

create table public.fiscal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  operation_id uuid not null references public.fiscal_operations (id)
    on delete restrict,
  invoice_identity_id uuid not null references public.fiscal_invoice_identities (id)
    on delete restrict,
  server_document_id uuid not null references public.server_documents (id)
    on delete restrict,
  environment text not null check (environment in ('test', 'production')),
  issuer_nif text not null,
  numserie text not null,
  fecha_expedicion date not null,
  record_type text not null check (
    record_type in ('alta_inicial', 'alta_subsanacion', 'anulacion')
  ),
  record_sequence bigint not null check (record_sequence > 0),
  previous_record_id uuid references public.fiscal_records (id) on delete restrict,
  previous_hash text,
  record_hash text not null,
  hash_algorithm text not null default 'sha256',
  record_timestamp timestamptz not null,
  xml_payload text not null,
  qr_url text,
  document_snapshot_hash text not null,
  pdf_content_hash text,
  schema_version text not null,
  renderer_version text,
  created_at timestamptz not null default now(),
  constraint fiscal_records_operation_unique
    unique (operation_id),
  constraint fiscal_records_user_sequence_unique
    unique (user_id, environment, issuer_nif, record_sequence),
  constraint fiscal_records_previous_hash_check
    check (
      (previous_record_id is null and previous_hash is null)
      or (previous_record_id is not null and previous_hash is not null)
    )
);

comment on table public.fiscal_records is
  'Immutable fiscal records for local/staging schema validation. No AEAT transport is implemented here.';
comment on column public.fiscal_records.xml_payload is
  'Raw fiscal XML payload. Do not expose directly to browser clients.';

create index fiscal_records_user_invoice_idx
  on public.fiscal_records (user_id, environment, issuer_nif, numserie, fecha_expedicion);
create index fiscal_records_chain_idx
  on public.fiscal_records (user_id, environment, issuer_nif, record_sequence);

create table public.fiscal_chain_state (
  user_id uuid not null references auth.users (id) on delete cascade,
  environment text not null check (environment in ('test', 'production')),
  issuer_nif text not null,
  last_record_id uuid references public.fiscal_records (id) on delete restrict,
  last_hash text,
  record_count bigint not null default 0 check (record_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, environment, issuer_nif),
  constraint fiscal_chain_state_empty_chain_check
    check (
      (record_count = 0 and last_record_id is null and last_hash is null)
      or (record_count > 0 and last_record_id is not null and last_hash is not null)
    )
);

comment on table public.fiscal_chain_state is
  'Current fiscal chain head per user, environment and issuer for future transactional operations.';

create table public.fiscal_transport_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  fiscal_record_id uuid not null references public.fiscal_records (id)
    on delete restrict,
  environment text not null check (environment in ('test', 'production')),
  attempt_number integer not null check (attempt_number > 0),
  status text not null default 'queued' check (
    status in (
      'queued',
      'sending',
      'accepted',
      'rejected_retryable',
      'rejected_final',
      'failed_retryable',
      'failed_final'
    )
  ),
  endpoint text,
  request_hash text not null,
  response_code text,
  response_body text,
  aeat_csv text,
  error_code text,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  constraint fiscal_transport_attempts_record_attempt_unique
    unique (fiscal_record_id, attempt_number),
  constraint fiscal_transport_attempts_finished_status_check
    check (
      status in ('queued', 'sending')
      or finished_at is not null
    )
);

comment on table public.fiscal_transport_attempts is
  'Future AEAT transport attempts. Attempts are separate from immutable fiscal records.';
comment on column public.fiscal_transport_attempts.response_body is
  'Raw AEAT response body. Do not expose directly to browser clients.';

create index fiscal_transport_attempts_record_idx
  on public.fiscal_transport_attempts (fiscal_record_id, attempt_number desc);
create index fiscal_transport_attempts_user_status_idx
  on public.fiscal_transport_attempts (user_id, status, created_at desc);

create or replace function public.prevent_fiscal_records_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'fiscal_records are immutable once inserted'
    using errcode = '25006';
end;
$$;

create trigger fiscal_records_prevent_update_delete
  before update or delete on public.fiscal_records
  for each row
  execute function public.prevent_fiscal_records_mutation();

create view public.server_documents_safe
with (security_invoker = true)
as
select
  id,
  user_id,
  local_document_id,
  document_type,
  document_kind,
  document_lifecycle,
  integrity_lock,
  status_legacy,
  version,
  snapshot_hash,
  pdf_content_hash,
  issuer_nif,
  numserie,
  issue_date,
  created_at,
  updated_at,
  issued_at,
  canceled_at
from public.server_documents;

create view public.fiscal_records_safe
with (security_invoker = true)
as
select
  id,
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
  qr_url,
  document_snapshot_hash,
  pdf_content_hash,
  schema_version,
  renderer_version,
  created_at
from public.fiscal_records;

create view public.fiscal_transport_attempts_safe
with (security_invoker = true)
as
select
  id,
  user_id,
  fiscal_record_id,
  environment,
  attempt_number,
  status,
  endpoint,
  request_hash,
  response_code,
  aeat_csv,
  error_code,
  started_at,
  finished_at,
  created_at
from public.fiscal_transport_attempts;

alter table public.server_documents enable row level security;
alter table public.server_document_versions enable row level security;
alter table public.document_conflicts enable row level security;
alter table public.fiscal_operations enable row level security;
alter table public.fiscal_invoice_identities enable row level security;
alter table public.fiscal_records enable row level security;
alter table public.fiscal_chain_state enable row level security;
alter table public.fiscal_transport_attempts enable row level security;

create policy server_documents_select_own
  on public.server_documents
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy server_document_versions_select_own
  on public.server_document_versions
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy document_conflicts_select_own
  on public.document_conflicts
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy fiscal_operations_select_own
  on public.fiscal_operations
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy fiscal_invoice_identities_select_own
  on public.fiscal_invoice_identities
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy fiscal_records_select_own
  on public.fiscal_records
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy fiscal_chain_state_select_own
  on public.fiscal_chain_state
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy fiscal_transport_attempts_select_own
  on public.fiscal_transport_attempts
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on table public.server_documents from anon, authenticated;
revoke all on table public.server_document_versions from anon, authenticated;
revoke all on table public.document_conflicts from anon, authenticated;
revoke all on table public.fiscal_operations from anon, authenticated;
revoke all on table public.fiscal_invoice_identities from anon, authenticated;
revoke all on table public.fiscal_records from anon, authenticated;
revoke all on table public.fiscal_chain_state from anon, authenticated;
revoke all on table public.fiscal_transport_attempts from anon, authenticated;
revoke all on table public.server_documents_safe from anon;
revoke all on table public.fiscal_records_safe from anon;
revoke all on table public.fiscal_transport_attempts_safe from anon;
revoke all on function public.prevent_fiscal_records_mutation() from public, anon, authenticated;

grant all on table public.server_documents to service_role;
grant all on table public.server_document_versions to service_role;
grant all on table public.document_conflicts to service_role;
grant all on table public.fiscal_operations to service_role;
grant all on table public.fiscal_invoice_identities to service_role;
grant all on table public.fiscal_records to service_role;
grant all on table public.fiscal_chain_state to service_role;
grant all on table public.fiscal_transport_attempts to service_role;

grant select (
  id,
  user_id,
  local_document_id,
  document_type,
  document_kind,
  document_lifecycle,
  integrity_lock,
  status_legacy,
  version,
  snapshot_hash,
  pdf_content_hash,
  issuer_nif,
  numserie,
  issue_date,
  created_at,
  updated_at,
  issued_at,
  canceled_at
) on table public.server_documents to authenticated;

grant select (
  id,
  server_document_id,
  user_id,
  version,
  change_type,
  payload_before_hash,
  payload_after_hash,
  changed_fields,
  actor_type,
  actor_id,
  created_at
) on table public.server_document_versions to authenticated;

grant select (
  id,
  user_id,
  server_document_id,
  local_document_id,
  conflict_type,
  incoming_payload_hash,
  server_payload_hash,
  resolution_status,
  created_at,
  resolved_at
) on table public.document_conflicts to authenticated;

grant select (
  id,
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
  created_at,
  updated_at
) on table public.fiscal_operations to authenticated;

grant select (
  id,
  user_id,
  server_document_id,
  environment,
  issuer_nif,
  numserie,
  fecha_expedicion,
  created_at
) on table public.fiscal_invoice_identities to authenticated;

grant select (
  id,
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
  qr_url,
  document_snapshot_hash,
  pdf_content_hash,
  schema_version,
  renderer_version,
  created_at
) on table public.fiscal_records to authenticated;

grant select (
  user_id,
  environment,
  issuer_nif,
  last_record_id,
  last_hash,
  record_count,
  updated_at
) on table public.fiscal_chain_state to authenticated;

grant select (
  id,
  user_id,
  fiscal_record_id,
  environment,
  attempt_number,
  status,
  endpoint,
  request_hash,
  response_code,
  aeat_csv,
  error_code,
  started_at,
  finished_at,
  created_at
) on table public.fiscal_transport_attempts to authenticated;

grant select on table public.server_documents_safe to authenticated;
grant select on table public.fiscal_records_safe to authenticated;
grant select on table public.fiscal_transport_attempts_safe to authenticated;

commit;
