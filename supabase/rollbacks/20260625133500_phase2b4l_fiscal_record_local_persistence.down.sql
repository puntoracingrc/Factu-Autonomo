-- Manual rollback for Phase 2B.4L fiscal record local/staging persistence.
-- Drops only the RPC and restores the pre-2B.4L record_type check.
-- If local candidate records with record_type 'alta' exist, reset local DB
-- before applying this rollback.

begin;

drop function if exists public.create_fiscal_record_local_staging(
  uuid, uuid, uuid, text, text, text, timestamptz, text, text
);

alter table public.fiscal_records
  drop constraint if exists fiscal_records_record_type_check;

alter table public.fiscal_records
  add constraint fiscal_records_record_type_check
  check (record_type in ('alta_inicial', 'alta_subsanacion', 'anulacion'));

commit;
