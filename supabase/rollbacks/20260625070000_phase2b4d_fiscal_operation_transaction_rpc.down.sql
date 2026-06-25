-- Manual rollback for Phase 2B.4D fiscal operation transaction RPC.
-- Scope: Supabase local and staging only.
-- Do not run in production after fiscal operations have been created. Production
-- rollback must be a forward migration that preserves fiscal operation history.

begin;

revoke all on function public.reserve_fiscal_operation(
  uuid, uuid, text, text, integer, text, uuid, timestamptz
) from public, anon, authenticated, service_role;

drop function if exists public.reserve_fiscal_operation(
  uuid, uuid, text, text, integer, text, uuid, timestamptz
);

commit;
