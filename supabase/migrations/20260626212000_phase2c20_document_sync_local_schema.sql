-- Phase 2C.20 local/staging document sync schema compatibility.
-- Scope: Supabase local and staging only.
-- This migration does not enable production sync, public endpoints, UI,
-- document issuance or external delivery.

begin;

alter table public.server_documents
  add column if not exists scope_id text,
  add column if not exists payload_hash text,
  add column if not exists document_series text;

alter table public.server_document_versions
  add column if not exists scope_id text,
  add column if not exists local_document_id text,
  add column if not exists operation_kind text,
  add column if not exists payload_hash text,
  add column if not exists snapshot_hash text,
  add column if not exists pdf_content_hash text,
  add column if not exists safe_summary jsonb;

alter table public.document_conflicts
  add column if not exists scope_id text,
  add column if not exists expected_version integer,
  add column if not exists local_version integer,
  add column if not exists remote_version integer,
  add column if not exists conflict_reason text,
  add column if not exists safe_summary jsonb;

comment on column public.server_documents.scope_id is
  'Phase 2C local/staging sync scope. Nullable for legacy and single-scope records.';
comment on column public.server_documents.payload_hash is
  'Phase 2C safe payload hash reference. Does not store payload body.';
comment on column public.server_documents.document_series is
  'Phase 2C optional document series mirror for safe sync summaries.';

comment on column public.server_document_versions.scope_id is
  'Phase 2C local/staging sync scope for technical version rows.';
comment on column public.server_document_versions.safe_summary is
  'Phase 2C safe sync summary only. Must not contain full document bodies.';

comment on column public.document_conflicts.scope_id is
  'Phase 2C local/staging sync scope for conflict rows.';
comment on column public.document_conflicts.safe_summary is
  'Phase 2C safe conflict summary only. Must not contain full document bodies.';

create index if not exists server_documents_sync_scope_local_idx
  on public.server_documents (user_id, scope_id, local_document_id);

create index if not exists server_documents_sync_scope_version_idx
  on public.server_documents (user_id, scope_id, version);

create index if not exists server_documents_sync_document_user_idx
  on public.server_documents (id, user_id);

create index if not exists server_document_versions_sync_scope_document_idx
  on public.server_document_versions (user_id, scope_id, server_document_id, version desc);

create index if not exists document_conflicts_sync_scope_status_idx
  on public.document_conflicts (user_id, scope_id, resolution_status, created_at desc);

commit;
