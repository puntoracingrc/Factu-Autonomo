-- Manual rollback for Phase 2C.20 local/staging document sync schema compatibility.
-- Scope: Supabase local and staging only.
-- Do not run against production. This rollback removes only the compatibility
-- columns and indexes introduced by the matching Phase 2C.20 migration.

begin;

drop index if exists public.document_conflicts_sync_scope_status_idx;
drop index if exists public.server_document_versions_sync_scope_document_idx;
drop index if exists public.server_documents_sync_document_user_idx;
drop index if exists public.server_documents_sync_scope_version_idx;
drop index if exists public.server_documents_sync_scope_local_idx;

alter table public.document_conflicts
  drop column if exists safe_summary,
  drop column if exists conflict_reason,
  drop column if exists remote_version,
  drop column if exists local_version,
  drop column if exists expected_version,
  drop column if exists scope_id;

alter table public.server_document_versions
  drop column if exists safe_summary,
  drop column if exists pdf_content_hash,
  drop column if exists snapshot_hash,
  drop column if exists payload_hash,
  drop column if exists operation_kind,
  drop column if exists local_document_id,
  drop column if exists scope_id;

alter table public.server_documents
  drop column if exists document_series,
  drop column if exists payload_hash,
  drop column if exists scope_id;

commit;
