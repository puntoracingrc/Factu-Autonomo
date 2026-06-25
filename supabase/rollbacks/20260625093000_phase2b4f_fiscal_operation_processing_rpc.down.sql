-- Manual rollback for Phase 2B.4F fiscal operation processing transition RPC.
-- Do not run in production without an explicit migration plan.

begin;

revoke all on function public.mark_fiscal_operation_processing(
  uuid, uuid, timestamptz
) from public, anon, authenticated, service_role;

drop function if exists public.mark_fiscal_operation_processing(
  uuid, uuid, timestamptz
);

commit;
