-- CENTRAL_NONFISCAL_DOCUMENT_NUMBERING_V1
-- Server-only, transactionally allocated identities for new quotes and
-- receipts. Historical bootstrap rows remain accepted without an authority
-- identity, while every newly numbered document is unique and monotonic.

begin;

alter table public.central_business_commands
  drop constraint central_business_commands_operation_v1,
  add constraint central_business_commands_operation_v1 check (
    operation_kind in ('upsert', 'delete', 'numbered_create')
  );

alter table public.central_business_entities
  add column if not exists authority_number text,
  add column if not exists authority_sequence integer,
  add column if not exists authority_template text,
  add column if not exists authority_scope_year integer,
  add column if not exists authority_padding integer;

alter table public.central_business_entities
  drop constraint if exists central_business_entities_authority_identity_v1,
  add constraint central_business_entities_authority_identity_v1 check (
    (
      authority_number is null
      and authority_sequence is null
      and authority_template is null
      and authority_scope_year is null
      and authority_padding is null
    )
    or (
      entity_type in ('quote', 'receipt')
      and authority_number is not null
      and length(authority_number) between 1 and 200
      and authority_sequence between 1 and 999999
      and authority_template is not null
      and length(authority_template) between 1 and 120
      and (
        authority_scope_year = 0
        or authority_scope_year between 2000 and 2100
      )
      and authority_padding between 1 and 8
    )
  );

create unique index if not exists
  central_business_entities_authority_number_uidx
  on public.central_business_entities (
    user_id,
    entity_type,
    authority_number
  )
  where authority_number is not null;

create unique index if not exists
  central_business_entities_authority_sequence_uidx
  on public.central_business_entities (
    user_id,
    entity_type,
    authority_template,
    authority_scope_year,
    authority_sequence
  )
  where authority_number is not null;

create table if not exists public.central_business_document_series (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  number_template text not null,
  scope_year integer not null,
  last_sequence integer not null default 0,
  state_version integer not null default 0,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint central_business_document_series_type_v1 check (
    entity_type in ('quote', 'receipt')
  ),
  constraint central_business_document_series_template_v1 check (
    length(number_template) between 1 and 120
    and number_template like '%{num}%'
  ),
  constraint central_business_document_series_year_v1 check (
    scope_year = 0 or scope_year between 2000 and 2100
  ),
  constraint central_business_document_series_sequence_v1 check (
    last_sequence between 0 and 999999
    and state_version >= 0
  )
);

create unique index if not exists
  central_business_document_series_scope_uidx
  on public.central_business_document_series (
    user_id,
    entity_type,
    number_template,
    scope_year
  );

create table if not exists
  public.central_business_document_series_reconciliations (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    entity_type text not null,
    number_template text not null,
    scope_year integer not null,
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
    constraint central_business_document_reconciliations_type_v1 check (
      entity_type in ('quote', 'receipt')
    ),
    constraint central_business_document_reconciliations_template_v1 check (
      length(number_template) between 1 and 120
      and number_template like '%{num}%'
    ),
    constraint central_business_document_reconciliations_year_v1 check (
      scope_year = 0 or scope_year between 2000 and 2100
    ),
    constraint central_business_document_reconciliations_sequences_v1 check (
      observed_max_sequence between 0 and 999999
      and previous_sequence between 0 and 999999
      and resulting_sequence between 0 and 999999
      and resulting_sequence >= previous_sequence
      and resulting_sequence >= observed_max_sequence
    ),
    constraint central_business_document_reconciliations_count_v1 check (
      source_document_count >= 0
    ),
    constraint central_business_document_reconciliations_digest_v1 check (
      source_digest ~ '^sha256:[0-9a-f]{64}$'
    ),
    constraint central_business_document_reconciliations_hashes_v1 check (
      idempotency_key_hash ~ '^[0-9a-f]{64}$'
      and request_hash ~ '^[0-9a-f]{64}$'
      and device_id <> ''
      and session_hash <> ''
    )
  );

create unique index if not exists
  central_business_document_reconciliations_idempotency_uidx
  on public.central_business_document_series_reconciliations (
    user_id,
    idempotency_key_hash
  );

create index if not exists
  central_business_document_reconciliations_scope_idx
  on public.central_business_document_series_reconciliations (
    user_id,
    entity_type,
    number_template,
    scope_year,
    reconciled_at desc
  );

alter table public.central_business_document_series enable row level security;
alter table public.central_business_document_series_reconciliations
  enable row level security;

revoke all on table public.central_business_document_series from public, anon, authenticated;
revoke all on table public.central_business_document_series_reconciliations
  from public, anon, authenticated;

grant all on table public.central_business_document_series to service_role;
grant select on table
  public.central_business_document_series_reconciliations to service_role;

drop policy if exists central_business_document_series_deny_clients_v1
  on public.central_business_document_series;
create policy central_business_document_series_deny_clients_v1
  on public.central_business_document_series
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists
  central_business_document_reconciliations_deny_clients_v1
  on public.central_business_document_series_reconciliations;
create policy central_business_document_reconciliations_deny_clients_v1
  on public.central_business_document_series_reconciliations
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

create or replace function
  public.central_business_mark_bootstrap_transaction_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform pg_catalog.set_config(
    'factu.central_business_bootstrap',
    'on',
    true
  );
  return new;
end;
$$;

revoke all on function
  public.central_business_mark_bootstrap_transaction_v1()
  from public, anon, authenticated;
grant execute on function
  public.central_business_mark_bootstrap_transaction_v1()
  to service_role;

drop trigger if exists central_business_bootstraps_mark_transaction_bi_v1
  on public.central_business_bootstraps;
create trigger central_business_bootstraps_mark_transaction_bi_v1
  before insert on public.central_business_bootstraps
  for each row
  execute function public.central_business_mark_bootstrap_transaction_v1();

create or replace function public.central_business_lock_command_owner_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'central-business-owner:' || new.user_id::text,
      0
    )
  );

  if new.entity_type in ('quote', 'receipt')
    and new.operation_kind = 'upsert'
    and new.expected_version = 0
    and coalesce(
      pg_catalog.current_setting(
        'factu.central_business_bootstrap',
        true
      ),
      'off'
    ) <> 'on'
  then
    raise exception using
      errcode = 'P4130',
      message = 'new central document requires server numbering';
  end if;

  return new;
end;
$$;

revoke all on function public.central_business_lock_command_owner_v1()
  from public, anon, authenticated;
grant execute on function public.central_business_lock_command_owner_v1()
  to service_role;

drop trigger if exists central_business_commands_owner_lock_biu_v1
  on public.central_business_commands;
create trigger central_business_commands_owner_lock_biu_v1
  before insert or update on public.central_business_commands
  for each row
  execute function public.central_business_lock_command_owner_v1();

create or replace function
  public.central_business_reject_series_reconciliation_mutation_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
    and not exists (
      select 1
        from auth.users
        where id = old.user_id
    )
  then
    return old;
  end if;

  raise exception 'central business document series reconciliation is immutable';
end;
$$;

revoke all on function
  public.central_business_reject_series_reconciliation_mutation_v1()
  from public, anon, authenticated;
grant execute on function
  public.central_business_reject_series_reconciliation_mutation_v1()
  to service_role;

drop trigger if exists
  central_business_document_reconciliations_immutable_bud_v1
  on public.central_business_document_series_reconciliations;
create trigger central_business_document_reconciliations_immutable_bud_v1
  before update or delete
  on public.central_business_document_series_reconciliations
  for each row
  execute function
    public.central_business_reject_series_reconciliation_mutation_v1();

drop trigger if exists
  central_business_document_reconciliations_immutable_bt_v1
  on public.central_business_document_series_reconciliations;
create trigger central_business_document_reconciliations_immutable_bt_v1
  before truncate
  on public.central_business_document_series_reconciliations
  for each statement
  execute function
    public.central_business_reject_series_reconciliation_mutation_v1();

create or replace function public.central_business_stable_json_text_v1(
  p_value jsonb
)
returns text
language plpgsql
stable
strict
security invoker
set search_path = ''
as $$
declare
  v_type text;
  v_result text;
begin
  v_type := pg_catalog.jsonb_typeof(p_value);

  if v_type in ('null', 'boolean', 'number', 'string') then
    return p_value::text;
  end if;

  if v_type = 'array' then
    select
      '[' ||
      coalesce(
        pg_catalog.string_agg(
          public.central_business_stable_json_text_v1(item.value),
          ','
          order by item.ordinality
        ),
        ''
      ) ||
      ']'
      into v_result
      from pg_catalog.jsonb_array_elements(p_value)
        with ordinality as item(value, ordinality);
    return v_result;
  end if;

  if v_type = 'object' then
    select
      '{' ||
      coalesce(
        pg_catalog.string_agg(
          pg_catalog.to_jsonb(entry.key)::text ||
          ':' ||
          public.central_business_stable_json_text_v1(entry.value),
          ','
          order by pg_catalog.convert_to(entry.key, 'UTF8')
        ),
        ''
      ) ||
      '}'
      into v_result
      from pg_catalog.jsonb_each(p_value) as entry(key, value);
    return v_result;
  end if;

  raise exception 'unsupported central business JSON value';
end;
$$;

revoke all on function public.central_business_stable_json_text_v1(jsonb)
  from public, anon, authenticated;
grant execute on function public.central_business_stable_json_text_v1(jsonb)
  to service_role;

create or replace function public.reconcile_central_business_document_series_v1(
  p_user_id uuid,
  p_device_id text,
  p_session_hash text,
  p_idempotency_key_hash text,
  p_request_hash text,
  p_entity_type text,
  p_number_template text,
  p_fiscal_year integer,
  p_observed_max_sequence integer,
  p_source_document_count integer,
  p_source_digest text
)
returns table (
  result_status text,
  reconciliation_id uuid,
  scope_year integer,
  previous_sequence integer,
  resulting_sequence integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing
    public.central_business_document_series_reconciliations%rowtype;
  v_series public.central_business_document_series%rowtype;
  v_scope_year integer;
  v_previous_sequence integer;
  v_resulting_sequence integer;
  v_reconciliation_id uuid;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception using
      errcode = 'P4100',
      message = 'reconcile_central_business_document_series_v1 requires service_role';
  end if;

  if p_user_id is null
    or coalesce(p_device_id, '') = ''
    or coalesce(p_session_hash, '') = ''
    or coalesce(p_idempotency_key_hash, '') !~ '^[0-9a-f]{64}$'
    or coalesce(p_request_hash, '') !~ '^[0-9a-f]{64}$'
    or coalesce(p_entity_type, '') not in ('quote', 'receipt')
    or length(coalesce(p_number_template, '')) not between 1 and 120
    or p_number_template not like '%{num}%'
    or replace(
      replace(p_number_template, '{num}', ''),
      '{year}',
      ''
    ) ~ '[{}]'
    or p_number_template ~ '[\u0000-\u001f\u007f]'
    or p_fiscal_year is null
    or p_fiscal_year not between 2000 and 2100
    or p_observed_max_sequence is null
    or p_observed_max_sequence not between 0 and 999999
    or p_source_document_count is null
    or p_source_document_count < 0
    or coalesce(p_source_digest, '') !~ '^sha256:[0-9a-f]{64}$'
  then
    raise exception using
      errcode = 'P4131',
      message = 'invalid central business document series reconciliation';
  end if;

  v_scope_year := case
    when pg_catalog.strpos(p_number_template, '{year}') > 0
      then p_fiscal_year
    else 0
  end;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'central-business-owner:' || p_user_id::text,
      0
    )
  );

  select *
    into v_existing
    from public.central_business_document_series_reconciliations
    where user_id = p_user_id
      and idempotency_key_hash = p_idempotency_key_hash;

  if found then
    if v_existing.request_hash <> p_request_hash then
      raise exception using
        errcode = 'P4102',
        message = 'series reconciliation idempotency key reused with different request';
    end if;

    return query
      select
        'replayed'::text,
        v_existing.id,
        v_existing.scope_year,
        v_existing.previous_sequence,
        v_existing.resulting_sequence;
    return;
  end if;

  insert into public.central_business_document_series (
    user_id,
    entity_type,
    number_template,
    scope_year
  )
  values (
    p_user_id,
    p_entity_type,
    p_number_template,
    v_scope_year
  )
  on conflict do nothing;

  select *
    into v_series
    from public.central_business_document_series as series
    where series.user_id = p_user_id
      and series.entity_type = p_entity_type
      and series.number_template = p_number_template
      and series.scope_year = v_scope_year
    for update;

  if not found then
    raise exception using
      errcode = 'P4132',
      message = 'central business document series unavailable';
  end if;

  v_previous_sequence := v_series.last_sequence;
  v_resulting_sequence := greatest(
    v_previous_sequence,
    p_observed_max_sequence
  );

  if v_resulting_sequence > v_previous_sequence then
    update public.central_business_document_series
      set
        last_sequence = v_resulting_sequence,
        state_version = state_version + 1,
        updated_at = statement_timestamp()
      where id = v_series.id;
  end if;

  insert into public.central_business_document_series_reconciliations (
    user_id,
    entity_type,
    number_template,
    scope_year,
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
    p_entity_type,
    p_number_template,
    v_scope_year,
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
      v_scope_year,
      v_previous_sequence,
      v_resulting_sequence;
end;
$$;

revoke all on function public.reconcile_central_business_document_series_v1(
  uuid,
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
grant execute on function
  public.reconcile_central_business_document_series_v1(
    uuid,
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

create or replace function public.create_central_business_document_v1(
  p_user_id uuid,
  p_device_id text,
  p_session_hash text,
  p_idempotency_key_hash text,
  p_request_hash text,
  p_entity_type text,
  p_entity_id text,
  p_number_template text,
  p_padding integer,
  p_fiscal_year integer,
  p_payload_without_number jsonb
)
returns table (
  result_status text,
  event_id uuid,
  event_sequence bigint,
  entity_version integer,
  full_number text,
  sequence integer,
  scope_year integer,
  content_hash text,
  document_payload jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_command public.central_business_commands%rowtype;
  v_event public.central_business_outbox%rowtype;
  v_series public.central_business_document_series%rowtype;
  v_scope_year integer;
  v_sequence integer;
  v_full_number text;
  v_payload jsonb;
  v_content_hash text;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception using
      errcode = 'P4100',
      message = 'create_central_business_document_v1 requires service_role';
  end if;

  if p_user_id is null
    or coalesce(p_device_id, '') = ''
    or coalesce(p_session_hash, '') = ''
    or coalesce(p_idempotency_key_hash, '') !~ '^[0-9a-f]{64}$'
    or coalesce(p_request_hash, '') !~ '^[0-9a-f]{64}$'
    or coalesce(p_entity_type, '') not in ('quote', 'receipt')
    or length(coalesce(p_entity_id, '')) not between 1 and 200
    or length(coalesce(p_number_template, '')) not between 1 and 120
    or p_number_template not like '%{num}%'
    or replace(
      replace(p_number_template, '{num}', ''),
      '{year}',
      ''
    ) ~ '[{}]'
    or p_number_template ~ '[\u0000-\u001f\u007f]'
    or p_padding is null
    or p_padding not between 1 and 8
    or p_fiscal_year is null
    or p_fiscal_year not between 2000 and 2100
    or p_payload_without_number is null
    or pg_catalog.jsonb_typeof(p_payload_without_number) <> 'object'
    or p_payload_without_number ? 'number'
    or p_payload_without_number ->> 'id' <> p_entity_id
    or p_payload_without_number ->> 'type' <> (
      case
        when p_entity_type = 'quote' then 'presupuesto'
        else 'recibo'
      end
    )
    or coalesce(p_payload_without_number ->> 'date', '')
      !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    or substring(p_payload_without_number ->> 'date' from 1 for 4)::integer
      <> p_fiscal_year
    or p_payload_without_number ? 'centralInvoiceAuthority'
    or p_payload_without_number ? 'rectification'
    or p_payload_without_number ? 'verifactu'
  then
    raise exception using
      errcode = 'P4133',
      message = 'invalid central business numbered document command';
  end if;

  v_scope_year := case
    when pg_catalog.strpos(p_number_template, '{year}') > 0
      then p_fiscal_year
    else 0
  end;

  insert into public.central_business_commands (
    user_id,
    idempotency_key_hash,
    request_hash,
    operation_kind,
    entity_type,
    entity_id,
    expected_version,
    device_id,
    session_hash
  )
  values (
    p_user_id,
    p_idempotency_key_hash,
    p_request_hash,
    'numbered_create',
    p_entity_type,
    p_entity_id,
    0,
    p_device_id,
    p_session_hash
  )
  on conflict (user_id, idempotency_key_hash)
  do update set idempotency_key_hash = excluded.idempotency_key_hash
  returning * into v_command;

  if v_command.request_hash <> p_request_hash then
    raise exception using
      errcode = 'P4102',
      message = 'idempotency key reused with different request';
  end if;

  if v_command.status = 'committed' then
    return query
      select
        'replayed'::text,
        outbox.id,
        outbox.event_sequence,
        entity.current_version,
        entity.authority_number,
        entity.authority_sequence,
        entity.authority_scope_year,
        entity.content_hash,
        entity.current_payload
      from public.central_business_entities as entity
      join public.central_business_outbox as outbox
        on outbox.id = v_command.result_event_id
      where entity.user_id = p_user_id
        and entity.entity_type = v_command.entity_type
        and entity.entity_id = v_command.entity_id;
    return;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_user_id::text || ':' || p_entity_type || ':' || p_entity_id,
      0
    )
  );

  perform 1
    from public.central_business_entities
    where user_id = p_user_id
      and entity_type = p_entity_type
      and entity_id = p_entity_id
    for update;

  if found then
    raise exception using
      errcode = 'P4103',
      message = 'central business entity version mismatch';
  end if;

  if not exists (
    select 1
      from public.central_business_document_series_reconciliations
        as reconciliation
      where reconciliation.user_id = p_user_id
        and reconciliation.entity_type = p_entity_type
        and reconciliation.number_template = p_number_template
        and reconciliation.scope_year = v_scope_year
  ) then
    raise exception using
      errcode = 'P4134',
      message = 'central business document series baseline not reconciled';
  end if;

  select *
    into v_series
    from public.central_business_document_series as series
    where series.user_id = p_user_id
      and series.entity_type = p_entity_type
      and series.number_template = p_number_template
      and series.scope_year = v_scope_year
    for update;

  if not found then
    raise exception using
      errcode = 'P4132',
      message = 'central business document series unavailable';
  end if;

  v_sequence := v_series.last_sequence + 1;

  loop
    if v_sequence > 999999 then
      raise exception using
        errcode = 'P4135',
        message = 'central business document series exhausted';
    end if;

    v_full_number := pg_catalog.replace(
      pg_catalog.replace(
        p_number_template,
        '{year}',
        p_fiscal_year::text
      ),
      '{num}',
      pg_catalog.lpad(v_sequence::text, p_padding, '0')
    );

    if length(v_full_number) not between 1 and 200
      or v_full_number ~ '[\u0000-\u001f\u007f]'
    then
      raise exception using
        errcode = 'P4133',
        message = 'invalid central business generated document number';
    end if;

    exit when not exists (
      select 1
        from public.central_business_entities
        where user_id = p_user_id
          and entity_type = p_entity_type
          and authority_number = v_full_number
    );

    v_sequence := v_sequence + 1;
  end loop;

  v_payload := p_payload_without_number ||
    pg_catalog.jsonb_build_object('number', v_full_number);
  v_content_hash := pg_catalog.encode(
    extensions.digest(
      pg_catalog.convert_to(
        public.central_business_stable_json_text_v1(v_payload),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  update public.central_business_document_series
    set
      last_sequence = v_sequence,
      state_version = state_version + 1,
      updated_at = statement_timestamp()
    where id = v_series.id;

  insert into public.central_business_entities (
    user_id,
    entity_type,
    entity_id,
    current_version,
    deleted,
    current_payload,
    content_hash,
    actor_device_id,
    actor_session_hash,
    authority_number,
    authority_sequence,
    authority_template,
    authority_scope_year,
    authority_padding
  )
  values (
    p_user_id,
    p_entity_type,
    p_entity_id,
    1,
    false,
    v_payload,
    v_content_hash,
    p_device_id,
    p_session_hash,
    v_full_number,
    v_sequence,
    p_number_template,
    v_scope_year,
    p_padding
  );

  insert into public.central_business_outbox (
    user_id,
    entity_type,
    entity_id,
    entity_version,
    operation_kind,
    payload,
    content_hash,
    actor_device_id
  )
  values (
    p_user_id,
    p_entity_type,
    p_entity_id,
    1,
    'upsert',
    v_payload,
    v_content_hash,
    p_device_id
  )
  returning * into v_event;

  update public.central_business_commands
    set
      status = 'committed',
      result_entity_version = 1,
      result_event_id = v_event.id,
      completed_at = statement_timestamp()
    where id = v_command.id;

  return query
    select
      'committed'::text,
      v_event.id,
      v_event.event_sequence,
      1,
      v_full_number,
      v_sequence,
      v_scope_year,
      v_content_hash,
      v_payload;
end;
$$;

revoke all on function public.create_central_business_document_v1(
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
  jsonb
) from public, anon, authenticated;
grant execute on function public.create_central_business_document_v1(
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
  jsonb
) to service_role;

comment on table public.central_business_document_series is
  'CENTRAL_NONFISCAL_DOCUMENT_NUMBERING_V1 private monotonic quote and receipt series state.';
comment on table
  public.central_business_document_series_reconciliations is
  'CENTRAL_NONFISCAL_DOCUMENT_NUMBERING_V1 immutable historical maxima evidence without document payloads.';
comment on function public.create_central_business_document_v1(
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
  jsonb
) is
  'CENTRAL_NONFISCAL_DOCUMENT_NUMBERING_V1 allocates a unique number and commits entity plus outbox atomically.';

commit;
