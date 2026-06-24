-- Manual rollback for Phase 2B.2 server schema.
-- Scope: Supabase local and staging only.
-- Do not run in production after fiscal records, transport attempts or
-- canonical documents have been created. Production rollback must be a
-- forward migration that preserves immutable fiscal data.

begin;

drop view if exists public.fiscal_transport_attempts_safe;
drop view if exists public.fiscal_records_safe;
drop view if exists public.server_documents_safe;

drop trigger if exists fiscal_records_prevent_update_delete
  on public.fiscal_records;
drop function if exists public.prevent_fiscal_records_mutation();

drop table if exists public.fiscal_transport_attempts;
drop table if exists public.fiscal_chain_state;
drop table if exists public.fiscal_records;
drop table if exists public.fiscal_invoice_identities;
drop table if exists public.fiscal_operations;
drop table if exists public.document_conflicts;
drop table if exists public.server_document_versions;
drop table if exists public.server_documents;

commit;
