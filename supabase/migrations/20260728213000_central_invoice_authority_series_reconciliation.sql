-- CENTRAL_INVOICE_AUTHORITY_SERIES_RECONCILIATION_V1
-- Certify the historical maximum of every fiscal series before the central
-- authority is allowed to allocate its first permanent identity.

begin;

create table if not exists public.central_invoice_series_reconciliations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  environment text not null,
  issuer_nif text not null,
  series_code text not null,
  fiscal_year integer not null,
  observed_max_sequence integer not null,
  source_document_count integer not null,
  source_digest text not null,
  idempotency_key_hash text not null,
  request_hash text not null,
  device_id text not null,
  session_hash text not null,
  previous_sequence integer not null,
  resulting_sequence integer not null,
  reconciled_at timestamptz not null default statement_timestamp(),
  constraint central_invoice_series_reconciliations_environment_v1 check (
    environment in ('test', 'production')
  ),
  constraint central_invoice_series_reconciliations_year_v1 check (
    fiscal_year between 2000 and 2100
  ),
  constraint central_invoice_series_reconciliations_sequences_v1 check (
    observed_max_sequence >= 0
    and previous_sequence >= 0
    and resulting_sequence >= previous_sequence
    and resulting_sequence >= observed_max_sequence
  ),
  constraint central_invoice_series_reconciliations_source_count_v1 check (
    source_document_count >= 0
  ),
  constraint central_invoice_series_reconciliations_digest_v1 check (
    source_digest ~ '^sha256:[0-9a-f]{64}$'
  ),
  constraint central_invoice_series_reconciliations_hashes_v1 check (
    idempotency_key_hash <> ''
    and request_hash <> ''
    and session_hash <> ''
  ),
  constraint central_invoice_series_reconciliations_actor_v1 check (
    device_id <> ''
  )
);

create unique index if not exists central_invoice_series_reconciliations_idempotency_uidx
  on public.central_invoice_series_reconciliations (
    user_id,
    idempotency_key_hash
  );

create index if not exists central_invoice_series_reconciliations_scope_idx
  on public.central_invoice_series_reconciliations (
    user_id,
    environment,
    issuer_nif,
    series_code,
    fiscal_year,
    reconciled_at desc
  );

alter table public.central_invoice_series_reconciliations
  enable row level security;

revoke all on table public.central_invoice_series_reconciliations
  from public, anon, authenticated, service_role;

grant select on table public.central_invoice_series_reconciliations
  to service_role;

drop policy if exists central_invoice_series_reconciliations_deny_clients_v1
  on public.central_invoice_series_reconciliations;
create policy central_invoice_series_reconciliations_deny_clients_v1
  on public.central_invoice_series_reconciliations
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

create or replace function public.central_invoice_authority_reject_reconciliation_mutation_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'central invoice series reconciliation is immutable';
end;
$$;

revoke all on function public.central_invoice_authority_reject_reconciliation_mutation_v1()
  from public, anon, authenticated;

grant execute on function public.central_invoice_authority_reject_reconciliation_mutation_v1()
  to service_role;

drop trigger if exists central_invoice_series_reconciliations_immutable_bud_v1
  on public.central_invoice_series_reconciliations;
create trigger central_invoice_series_reconciliations_immutable_bud_v1
  before update or delete on public.central_invoice_series_reconciliations
  for each row
  execute function public.central_invoice_authority_reject_reconciliation_mutation_v1();

drop trigger if exists central_invoice_series_reconciliations_immutable_bt_v1
  on public.central_invoice_series_reconciliations;
create trigger central_invoice_series_reconciliations_immutable_bt_v1
  before truncate on public.central_invoice_series_reconciliations
  for each statement
  execute function public.central_invoice_authority_reject_reconciliation_mutation_v1();

create or replace function public.reconcile_central_invoice_series_v1(
  p_user_id uuid,
  p_device_id text,
  p_session_hash text,
  p_idempotency_key_hash text,
  p_request_hash text,
  p_environment text,
  p_issuer_nif text,
  p_series_code text,
  p_fiscal_year integer,
  p_observed_max_sequence integer,
  p_source_document_count integer,
  p_source_digest text
)
returns table (
  result_status text,
  reconciliation_id uuid,
  previous_sequence integer,
  resulting_sequence integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.central_invoice_series_reconciliations%rowtype;
  v_series public.central_invoice_series_state%rowtype;
  v_previous_sequence integer;
  v_resulting_sequence integer;
  v_reconciliation_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'reconcile_central_invoice_series_v1 requires service_role';
  end if;

  if p_user_id is null
    or coalesce(p_device_id, '') = ''
    or coalesce(p_session_hash, '') = ''
    or coalesce(p_idempotency_key_hash, '') = ''
    or coalesce(p_request_hash, '') = ''
    or coalesce(p_environment, '') not in ('test', 'production')
    or coalesce(p_issuer_nif, '') = ''
    or coalesce(p_series_code, '') = ''
    or p_fiscal_year is null
    or p_fiscal_year < 2000
    or p_fiscal_year > 2100
    or p_observed_max_sequence is null
    or p_observed_max_sequence < 0
    or p_source_document_count is null
    or p_source_document_count < 0
    or coalesce(p_source_digest, '') !~ '^sha256:[0-9a-f]{64}$'
  then
    raise exception 'invalid central invoice series reconciliation';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_user_id::text || ':' || p_idempotency_key_hash,
      0
    )
  );

  select *
    into v_existing
    from public.central_invoice_series_reconciliations
    where user_id = p_user_id
      and idempotency_key_hash = p_idempotency_key_hash;

  if found then
    if v_existing.request_hash <> p_request_hash then
      raise exception 'series reconciliation idempotency key reused with different request';
    end if;

    return query
      select
        'replayed'::text,
        v_existing.id,
        v_existing.previous_sequence,
        v_existing.resulting_sequence;
    return;
  end if;

  insert into public.central_invoice_series_state (
    user_id,
    environment,
    issuer_nif,
    series_code,
    fiscal_year,
    last_sequence,
    state_version
  )
  values (
    p_user_id,
    p_environment,
    p_issuer_nif,
    p_series_code,
    p_fiscal_year,
    0,
    0
  )
  on conflict (
    user_id,
    environment,
    issuer_nif,
    series_code,
    fiscal_year
  ) do nothing;

  select *
    into v_series
    from public.central_invoice_series_state
    where user_id = p_user_id
      and environment = p_environment
      and issuer_nif = p_issuer_nif
      and series_code = p_series_code
      and fiscal_year = p_fiscal_year
    for update;

  if not found then
    raise exception 'central invoice series state unavailable';
  end if;

  v_previous_sequence := v_series.last_sequence;
  v_resulting_sequence := greatest(
    v_previous_sequence,
    p_observed_max_sequence
  );

  if v_resulting_sequence > v_previous_sequence then
    update public.central_invoice_series_state
      set
        last_sequence = v_resulting_sequence,
        state_version = state_version + 1,
        updated_at = statement_timestamp()
      where id = v_series.id;
  end if;

  insert into public.central_invoice_series_reconciliations (
    user_id,
    environment,
    issuer_nif,
    series_code,
    fiscal_year,
    observed_max_sequence,
    source_document_count,
    source_digest,
    idempotency_key_hash,
    request_hash,
    device_id,
    session_hash,
    previous_sequence,
    resulting_sequence
  )
  values (
    p_user_id,
    p_environment,
    p_issuer_nif,
    p_series_code,
    p_fiscal_year,
    p_observed_max_sequence,
    p_source_document_count,
    p_source_digest,
    p_idempotency_key_hash,
    p_request_hash,
    p_device_id,
    p_session_hash,
    v_previous_sequence,
    v_resulting_sequence
  )
  returning id into v_reconciliation_id;

  return query
    select
      'committed'::text,
      v_reconciliation_id,
      v_previous_sequence,
      v_resulting_sequence;
end;
$$;

revoke all on function public.reconcile_central_invoice_series_v1(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  integer,
  integer,
  text
) from public, anon, authenticated;

grant execute on function public.reconcile_central_invoice_series_v1(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  integer,
  integer,
  text
) to service_role;

create or replace function public.central_invoice_authority_require_series_reconciliation_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1
      from public.central_invoice_series_reconciliations as reconciliation
      where reconciliation.user_id = new.user_id
        and reconciliation.environment = new.environment
        and reconciliation.issuer_nif = new.issuer_nif
        and reconciliation.series_code = new.series_code
        and reconciliation.fiscal_year = new.fiscal_year
  ) then
    raise exception 'central invoice series baseline not reconciled';
  end if;

  return new;
end;
$$;

revoke all on function public.central_invoice_authority_require_series_reconciliation_v1()
  from public, anon, authenticated;

grant execute on function public.central_invoice_authority_require_series_reconciliation_v1()
  to service_role;

drop trigger if exists central_invoice_identities_reconciliation_bi_v1
  on public.central_invoice_identities;
create trigger central_invoice_identities_reconciliation_bi_v1
  before insert on public.central_invoice_identities
  for each row
  execute function public.central_invoice_authority_require_series_reconciliation_v1();

comment on table public.central_invoice_series_reconciliations is
  'CENTRAL_INVOICE_AUTHORITY_SERIES_RECONCILIATION_V1 immutable safe-summary evidence for historical series maxima.';
comment on function public.reconcile_central_invoice_series_v1(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  integer,
  integer,
  text
) is
  'CENTRAL_INVOICE_AUTHORITY_SERIES_RECONCILIATION_V1 service-role-only, idempotent, monotonic historical series reconciliation.';
comment on function public.central_invoice_authority_require_series_reconciliation_v1() is
  'CENTRAL_INVOICE_AUTHORITY_SERIES_RECONCILIATION_V1 blocks permanent identity allocation until the exact series scope has immutable baseline evidence.';

commit;
