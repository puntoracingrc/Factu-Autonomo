-- CENTRAL_BUSINESS_AUTHORITY_FOUNDATION_V1
-- Additive private foundation for server-authoritative business entities.
-- It does not expose a browser grant, wire AppStore, migrate existing rows,
-- or reactivate the legacy cloud flow.

begin;

create table if not exists public.central_business_entities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  current_version integer not null,
  deleted boolean not null default false,
  current_payload jsonb,
  content_hash text not null,
  actor_device_id text not null,
  actor_session_hash text not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint central_business_entities_type_v1 check (
    entity_type in (
      'customer',
      'supplier',
      'product',
      'expense',
      'recurring_expense',
      'user_reminder',
      'profile'
    )
  ),
  constraint central_business_entities_identifier_v1 check (
    length(entity_id) between 1 and 200
  ),
  constraint central_business_entities_version_v1 check (current_version > 0),
  constraint central_business_entities_hash_v1 check (content_hash <> ''),
  constraint central_business_entities_actor_v1 check (
    actor_device_id <> '' and actor_session_hash <> ''
  ),
  constraint central_business_entities_payload_v1 check (
    (deleted and current_payload is null)
    or (not deleted and current_payload is not null)
  )
);

create unique index if not exists central_business_entities_owner_key_uidx
  on public.central_business_entities (user_id, entity_type, entity_id);

create index if not exists central_business_entities_owner_updated_idx
  on public.central_business_entities (
    user_id,
    updated_at,
    entity_type,
    entity_id
  );

create table if not exists public.central_business_commands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key_hash text not null,
  request_hash text not null,
  operation_kind text not null,
  entity_type text not null,
  entity_id text not null,
  expected_version integer not null,
  status text not null default 'pending',
  result_entity_version integer,
  result_event_id uuid,
  device_id text not null,
  session_hash text not null,
  requested_at timestamptz not null default statement_timestamp(),
  completed_at timestamptz,
  constraint central_business_commands_operation_v1 check (
    operation_kind in ('upsert', 'delete')
  ),
  constraint central_business_commands_type_v1 check (
    entity_type in (
      'customer',
      'supplier',
      'product',
      'expense',
      'recurring_expense',
      'user_reminder',
      'profile'
    )
  ),
  constraint central_business_commands_identifier_v1 check (
    length(entity_id) between 1 and 200
  ),
  constraint central_business_commands_expected_version_v1 check (
    expected_version >= 0
  ),
  constraint central_business_commands_status_v1 check (
    status in ('pending', 'committed')
  ),
  constraint central_business_commands_hashes_v1 check (
    idempotency_key_hash <> ''
    and request_hash <> ''
    and device_id <> ''
    and session_hash <> ''
  ),
  constraint central_business_commands_completion_v1 check (
    (
      status = 'pending'
      and result_entity_version is null
      and result_event_id is null
      and completed_at is null
    )
    or (
      status = 'committed'
      and result_entity_version is not null
      and result_entity_version > 0
      and result_event_id is not null
      and completed_at is not null
    )
  )
);

create unique index if not exists central_business_commands_idempotency_uidx
  on public.central_business_commands (user_id, idempotency_key_hash);

create index if not exists central_business_commands_owner_requested_idx
  on public.central_business_commands (user_id, requested_at desc);

create table if not exists public.central_business_outbox (
  id uuid primary key default gen_random_uuid(),
  event_sequence bigint generated always as identity,
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  entity_version integer not null,
  operation_kind text not null,
  payload jsonb,
  content_hash text not null,
  actor_device_id text not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint central_business_outbox_type_v1 check (
    entity_type in (
      'customer',
      'supplier',
      'product',
      'expense',
      'recurring_expense',
      'user_reminder',
      'profile'
    )
  ),
  constraint central_business_outbox_operation_v1 check (
    operation_kind in ('upsert', 'delete')
  ),
  constraint central_business_outbox_identifier_v1 check (
    length(entity_id) between 1 and 200
  ),
  constraint central_business_outbox_version_v1 check (entity_version > 0),
  constraint central_business_outbox_hash_v1 check (content_hash <> ''),
  constraint central_business_outbox_payload_v1 check (
    (operation_kind = 'delete' and payload is null)
    or (operation_kind = 'upsert' and payload is not null)
  )
);

create unique index if not exists central_business_outbox_owner_entity_version_uidx
  on public.central_business_outbox (
    user_id,
    entity_type,
    entity_id,
    entity_version
  );

create unique index if not exists central_business_outbox_sequence_uidx
  on public.central_business_outbox (event_sequence);

create index if not exists central_business_outbox_owner_sequence_idx
  on public.central_business_outbox (user_id, event_sequence);

alter table public.central_business_commands
  drop constraint if exists central_business_commands_event_fk,
  add constraint central_business_commands_event_fk
  foreign key (result_event_id)
  references public.central_business_outbox(id);

alter table public.central_business_entities enable row level security;
alter table public.central_business_commands enable row level security;
alter table public.central_business_outbox enable row level security;

revoke all on table public.central_business_entities from public, anon, authenticated;
revoke all on table public.central_business_commands from public, anon, authenticated;
revoke all on table public.central_business_outbox from public, anon, authenticated;

grant all on table public.central_business_entities to service_role;
grant all on table public.central_business_commands to service_role;
grant all on table public.central_business_outbox to service_role;
grant usage, select on sequence public.central_business_outbox_event_sequence_seq
  to service_role;

drop policy if exists central_business_entities_deny_clients_v1
  on public.central_business_entities;
create policy central_business_entities_deny_clients_v1
  on public.central_business_entities
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists central_business_commands_deny_clients_v1
  on public.central_business_commands;
create policy central_business_commands_deny_clients_v1
  on public.central_business_commands
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists central_business_outbox_deny_clients_v1
  on public.central_business_outbox;
create policy central_business_outbox_deny_clients_v1
  on public.central_business_outbox
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

create or replace function public.mutate_central_business_entity_v1(
  p_user_id uuid,
  p_device_id text,
  p_session_hash text,
  p_idempotency_key_hash text,
  p_request_hash text,
  p_operation_kind text,
  p_entity_type text,
  p_entity_id text,
  p_expected_version integer,
  p_payload jsonb,
  p_content_hash text
)
returns table (
  result_status text,
  event_id uuid,
  event_sequence bigint,
  entity_version integer,
  deleted boolean,
  content_hash text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_command public.central_business_commands%rowtype;
  v_entity public.central_business_entities%rowtype;
  v_event public.central_business_outbox%rowtype;
  v_next_version integer;
  v_deleted boolean;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'mutate_central_business_entity_v1 requires service_role';
  end if;

  if p_user_id is null
    or coalesce(p_device_id, '') = ''
    or coalesce(p_session_hash, '') = ''
    or coalesce(p_idempotency_key_hash, '') = ''
    or coalesce(p_request_hash, '') = ''
    or coalesce(p_operation_kind, '') not in ('upsert', 'delete')
    or coalesce(p_entity_type, '') not in (
      'customer',
      'supplier',
      'product',
      'expense',
      'recurring_expense',
      'user_reminder',
      'profile'
    )
    or length(coalesce(p_entity_id, '')) not between 1 and 200
    or p_expected_version is null
    or p_expected_version < 0
    or coalesce(p_content_hash, '') = ''
    or (p_operation_kind = 'upsert' and p_payload is null)
    or (p_operation_kind = 'delete' and p_payload is not null)
  then
    raise exception 'invalid central business mutation command';
  end if;

  if p_entity_type = 'profile' and p_entity_id <> 'profile' then
    raise exception 'central business profile identifier mismatch';
  end if;

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
    p_operation_kind,
    p_entity_type,
    p_entity_id,
    p_expected_version,
    p_device_id,
    p_session_hash
  )
  on conflict (user_id, idempotency_key_hash)
  do update set idempotency_key_hash = excluded.idempotency_key_hash
  returning * into v_command;

  if v_command.request_hash <> p_request_hash then
    raise exception 'idempotency key reused with different request';
  end if;

  if v_command.status = 'committed' then
    return query
      select
        'replayed'::text,
        outbox.id,
        outbox.event_sequence,
        command.result_entity_version,
        outbox.operation_kind = 'delete',
        outbox.content_hash
      from public.central_business_commands as command
      join public.central_business_outbox as outbox
        on outbox.id = command.result_event_id
      where command.id = v_command.id;
    return;
  end if;

  -- A row lock cannot serialize two simultaneous creates because the row does
  -- not exist yet. This transaction-scoped key also serializes that first
  -- version without holding a global lock.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_user_id::text || ':' || p_entity_type || ':' || p_entity_id,
      0
    )
  );

  select *
    into v_entity
    from public.central_business_entities
    where user_id = p_user_id
      and entity_type = p_entity_type
      and entity_id = p_entity_id
    for update;

  if p_expected_version = 0 then
    if found then
      raise exception 'central business entity version mismatch';
    end if;
    if p_operation_kind = 'delete' then
      raise exception 'central business entity not found';
    end if;
    v_next_version := 1;
  else
    if not found or v_entity.current_version <> p_expected_version then
      raise exception 'central business entity version mismatch';
    end if;
    v_next_version := v_entity.current_version + 1;
  end if;

  v_deleted := p_operation_kind = 'delete';

  insert into public.central_business_entities (
    user_id,
    entity_type,
    entity_id,
    current_version,
    deleted,
    current_payload,
    content_hash,
    actor_device_id,
    actor_session_hash
  )
  values (
    p_user_id,
    p_entity_type,
    p_entity_id,
    v_next_version,
    v_deleted,
    p_payload,
    p_content_hash,
    p_device_id,
    p_session_hash
  )
  on conflict (user_id, entity_type, entity_id)
  do update set
    current_version = excluded.current_version,
    deleted = excluded.deleted,
    current_payload = excluded.current_payload,
    content_hash = excluded.content_hash,
    actor_device_id = excluded.actor_device_id,
    actor_session_hash = excluded.actor_session_hash,
    updated_at = statement_timestamp();

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
    v_next_version,
    p_operation_kind,
    p_payload,
    p_content_hash,
    p_device_id
  )
  returning * into v_event;

  update public.central_business_commands
    set
      status = 'committed',
      result_entity_version = v_next_version,
      result_event_id = v_event.id,
      completed_at = statement_timestamp()
    where id = v_command.id;

  return query
    select
      'committed'::text,
      v_event.id,
      v_event.event_sequence,
      v_next_version,
      v_deleted,
      p_content_hash;
end;
$$;

revoke all on function public.mutate_central_business_entity_v1(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  jsonb,
  text
) from public, anon, authenticated;

grant execute on function public.mutate_central_business_entity_v1(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  jsonb,
  text
) to service_role;

comment on table public.central_business_entities is
  'CENTRAL_BUSINESS_AUTHORITY_FOUNDATION_V1 private canonical state for versioned operational entities.';
comment on table public.central_business_commands is
  'CENTRAL_BUSINESS_AUTHORITY_FOUNDATION_V1 private idempotency ledger for operational mutations.';
comment on table public.central_business_outbox is
  'CENTRAL_BUSINESS_AUTHORITY_FOUNDATION_V1 ordered post-commit events used to update other devices.';
comment on function public.mutate_central_business_entity_v1(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  jsonb,
  text
) is
  'CENTRAL_BUSINESS_AUTHORITY_FOUNDATION_V1 service-role-only transactional idempotent mutation with optimistic concurrency.';

commit;
