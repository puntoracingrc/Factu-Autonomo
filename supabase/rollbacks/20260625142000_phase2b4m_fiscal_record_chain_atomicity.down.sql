-- Manual rollback for Phase 2B.4M fiscal record + chain local/staging atomicity.
-- Drops only the atomic RPC. Local immutable fiscal records and chain rows
-- created by tests remain unless the local Supabase database is reset.

begin;

drop function if exists public.create_fiscal_record_with_chain_local_staging(
  uuid, uuid, uuid, text, text, text, timestamptz, text, text
);

commit;
