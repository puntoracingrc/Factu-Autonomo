-- CENTRAL_INVOICE_AUTHORITY_LEDGER_SCHEMA_V1
-- Scope: additive local/staging foundation. This migration does not expose an
-- API route, activate central issuance, create an issuance RPC, or mutate
-- existing invoices.

begin;

create table if not exists public.central_invoice_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  local_document_id text not null,
  kind text not null,
  lifecycle_status text not null default 'draft',
  current_version integer not null default 0,
  current_payload jsonb not null default '{}'::jsonb,
  emitted_snapshot jsonb,
  draft_hash text,
  emitted_hash text,
  identity_id uuid,
  locked_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint central_invoice_documents_kind_v1 check (
    kind in ('invoice', 'rectification')
  ),
  constraint central_invoice_documents_lifecycle_v1 check (
    lifecycle_status in ('draft', 'issued', 'rectified', 'voided', 'retired')
  ),
  constraint central_invoice_documents_version_v1 check (current_version >= 0),
  constraint central_invoice_documents_hashes_v1 check (
    (draft_hash is null or draft_hash <> '')
    and (emitted_hash is null or emitted_hash <> '')
  ),
  constraint central_invoice_documents_issued_lock_v1 check (
    lifecycle_status <> 'issued'
    or (
      identity_id is not null
      and locked_at is not null
      and emitted_snapshot is not null
      and emitted_hash is not null
    )
  )
);

create unique index if not exists central_invoice_documents_user_local_uidx
  on public.central_invoice_documents (user_id, local_document_id);

create index if not exists central_invoice_documents_user_status_idx
  on public.central_invoice_documents (user_id, lifecycle_status, updated_at desc);

create table if not exists public.central_invoice_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.central_invoice_documents(id),
  user_id uuid not null,
  version integer not null,
  change_kind text not null,
  previous_hash text,
  next_hash text not null,
  actor_device_id text,
  actor_session_hash text,
  safe_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default statement_timestamp(),
  constraint central_invoice_document_versions_version_v1 check (version > 0),
  constraint central_invoice_document_versions_change_kind_v1 check (
    change_kind in (
      'draft_created',
      'draft_updated',
      'issue_committed',
      'rectification_committed',
      'repair_recorded',
      'rejected'
    )
  )
);

create unique index if not exists central_invoice_document_versions_doc_version_uidx
  on public.central_invoice_document_versions (document_id, version);

create index if not exists central_invoice_document_versions_user_doc_idx
  on public.central_invoice_document_versions (user_id, document_id, version desc);

create table if not exists public.central_invoice_series_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  environment text not null,
  issuer_nif text not null,
  series_code text not null,
  fiscal_year integer not null,
  last_sequence integer not null default 0,
  state_version integer not null default 0,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint central_invoice_series_state_environment_v1 check (
    environment in ('test', 'production')
  ),
  constraint central_invoice_series_state_year_v1 check (
    fiscal_year between 2000 and 2100
  ),
  constraint central_invoice_series_state_last_sequence_v1 check (
    last_sequence >= 0
  ),
  constraint central_invoice_series_state_version_v1 check (state_version >= 0)
);

create unique index if not exists central_invoice_series_state_scope_uidx
  on public.central_invoice_series_state (
    user_id,
    environment,
    issuer_nif,
    series_code,
    fiscal_year
  );

create table if not exists public.central_invoice_identities (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.central_invoice_documents(id),
  user_id uuid not null,
  environment text not null,
  issuer_nif text not null,
  series_code text not null,
  fiscal_year integer not null,
  sequence integer not null,
  full_number text not null,
  issued_at timestamptz not null,
  rectifies_identity_id uuid references public.central_invoice_identities(id),
  created_at timestamptz not null default statement_timestamp(),
  constraint central_invoice_identities_environment_v1 check (
    environment in ('test', 'production')
  ),
  constraint central_invoice_identities_year_v1 check (
    fiscal_year between 2000 and 2100
  ),
  constraint central_invoice_identities_sequence_v1 check (sequence > 0),
  constraint central_invoice_identities_number_v1 check (full_number <> '')
);

create unique index if not exists central_invoice_identities_document_uidx
  on public.central_invoice_identities (document_id);

create unique index if not exists central_invoice_identities_scope_sequence_uidx
  on public.central_invoice_identities (
    user_id,
    environment,
    issuer_nif,
    series_code,
    fiscal_year,
    sequence
  );

create unique index if not exists central_invoice_identities_scope_number_uidx
  on public.central_invoice_identities (
    user_id,
    environment,
    issuer_nif,
    series_code,
    fiscal_year,
    full_number
  );

create table if not exists public.central_invoice_commands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  idempotency_key_hash text not null,
  request_hash text not null,
  status text not null default 'pending',
  kind text not null,
  local_document_id text not null,
  expected_version integer not null,
  draft_hash text not null,
  device_id text not null,
  session_hash text not null,
  result_document_id uuid references public.central_invoice_documents(id),
  result_identity_id uuid references public.central_invoice_identities(id),
  result_outbox_event_id uuid,
  error_code text,
  error_message text,
  requested_at timestamptz not null default statement_timestamp(),
  completed_at timestamptz,
  constraint central_invoice_commands_status_v1 check (
    status in ('pending', 'committed', 'failed')
  ),
  constraint central_invoice_commands_kind_v1 check (
    kind in ('invoice', 'rectification')
  ),
  constraint central_invoice_commands_expected_version_v1 check (
    expected_version >= 0
  ),
  constraint central_invoice_commands_hashes_v1 check (
    idempotency_key_hash <> ''
    and request_hash <> ''
    and draft_hash <> ''
    and session_hash <> ''
  ),
  constraint central_invoice_commands_completion_v1 check (
    (
      status = 'pending'
      and completed_at is null
      and result_document_id is null
      and result_identity_id is null
      and result_outbox_event_id is null
    )
    or (
      status = 'committed'
      and completed_at is not null
      and result_document_id is not null
      and result_identity_id is not null
      and result_outbox_event_id is not null
      and error_code is null
      and error_message is null
    )
    or (
      status = 'failed'
      and completed_at is not null
      and result_document_id is null
      and result_identity_id is null
      and result_outbox_event_id is null
      and error_code is not null
    )
  )
);

create unique index if not exists central_invoice_commands_idempotency_uidx
  on public.central_invoice_commands (user_id, idempotency_key_hash);

create index if not exists central_invoice_commands_user_status_idx
  on public.central_invoice_commands (user_id, status, requested_at desc);

create table if not exists public.central_invoice_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  document_id uuid not null references public.central_invoice_documents(id),
  identity_id uuid references public.central_invoice_identities(id),
  event_type text not null,
  status text not null default 'pending',
  delivery_attempts integer not null default 0,
  lease_token uuid,
  lease_expires_at timestamptz,
  idempotency_key text not null,
  safe_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default statement_timestamp(),
  published_at timestamptz,
  constraint central_invoice_outbox_event_type_v1 check (
    event_type in ('invoice_issued', 'rectification_issued', 'document_repaired')
  ),
  constraint central_invoice_outbox_status_v1 check (
    status in ('pending', 'leased', 'published', 'failed')
  ),
  constraint central_invoice_outbox_attempts_v1 check (delivery_attempts >= 0),
  constraint central_invoice_outbox_lease_v1 check (
    (
      status = 'leased'
      and lease_token is not null
      and lease_expires_at is not null
      and published_at is null
    )
    or (
      status <> 'leased'
      and lease_token is null
      and lease_expires_at is null
    )
  ),
  constraint central_invoice_outbox_published_v1 check (
    (status = 'published' and published_at is not null)
    or (status <> 'published' and published_at is null)
  )
);

create unique index if not exists central_invoice_outbox_idempotency_uidx
  on public.central_invoice_outbox (user_id, idempotency_key);

create index if not exists central_invoice_outbox_pending_idx
  on public.central_invoice_outbox (status, created_at)
  where status in ('pending', 'failed');

alter table public.central_invoice_commands
  drop constraint if exists central_invoice_commands_outbox_fk,
  add constraint central_invoice_commands_outbox_fk
  foreign key (result_outbox_event_id)
  references public.central_invoice_outbox(id);

alter table public.central_invoice_documents
  drop constraint if exists central_invoice_documents_identity_fk,
  add constraint central_invoice_documents_identity_fk
  foreign key (identity_id)
  references public.central_invoice_identities(id);

alter table public.central_invoice_documents enable row level security;
alter table public.central_invoice_document_versions enable row level security;
alter table public.central_invoice_series_state enable row level security;
alter table public.central_invoice_identities enable row level security;
alter table public.central_invoice_commands enable row level security;
alter table public.central_invoice_outbox enable row level security;

revoke all on table public.central_invoice_documents from public, anon, authenticated;
revoke all on table public.central_invoice_document_versions from public, anon, authenticated;
revoke all on table public.central_invoice_series_state from public, anon, authenticated;
revoke all on table public.central_invoice_identities from public, anon, authenticated;
revoke all on table public.central_invoice_commands from public, anon, authenticated;
revoke all on table public.central_invoice_outbox from public, anon, authenticated;

grant all on table public.central_invoice_documents to service_role;
grant all on table public.central_invoice_document_versions to service_role;
grant all on table public.central_invoice_series_state to service_role;
grant all on table public.central_invoice_identities to service_role;
grant all on table public.central_invoice_commands to service_role;
grant all on table public.central_invoice_outbox to service_role;

comment on table public.central_invoice_documents is
  'CENTRAL_INVOICE_AUTHORITY_LEDGER_SCHEMA_V1 canonical private invoice document ledger.';
comment on table public.central_invoice_commands is
  'CENTRAL_INVOICE_AUTHORITY_LEDGER_SCHEMA_V1 private idempotency command ledger.';
comment on table public.central_invoice_series_state is
  'CENTRAL_INVOICE_AUTHORITY_LEDGER_SCHEMA_V1 serialized series state. Locked by future RPC before identity allocation.';
comment on table public.central_invoice_identities is
  'CENTRAL_INVOICE_AUTHORITY_LEDGER_SCHEMA_V1 permanent fiscal identity reservation.';
comment on table public.central_invoice_outbox is
  'CENTRAL_INVOICE_AUTHORITY_LEDGER_SCHEMA_V1 post-commit sync signal outbox with safe summaries only.';

commit;
