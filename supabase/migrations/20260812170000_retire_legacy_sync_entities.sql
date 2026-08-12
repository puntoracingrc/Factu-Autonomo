-- PREPARE_LEGACY_SYNC_RETIREMENT_V1
-- The generic browser synchronizer is replaced by the central business and
-- invoice authorities. Existing rows remain available to service_role as a
-- cold archive; current auxiliary services move to dedicated tables.

begin;

create table if not exists public.expense_inbox_aliases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  alias_token text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint expense_inbox_aliases_token_check
    check (alias_token ~ '^[a-z0-9_-]{8,64}$')
);

create table if not exists public.expense_inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  alias_token text not null,
  from_email text,
  from_name text,
  subject text,
  received_at timestamptz not null default statement_timestamp(),
  attachment_filename text not null,
  attachment_content_type text not null,
  attachment_size integer not null check (attachment_size > 0),
  attachment_hash text not null,
  status text not null default 'pending',
  source text not null default 'email_forward',
  scan_payload jsonb,
  scan_error text,
  source_email_id text,
  source_attachment_id text,
  processed_at timestamptz,
  ignored_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint expense_inbox_items_status_check
    check (status in ('pending', 'processing', 'processed', 'ignored', 'duplicate', 'error')),
  constraint expense_inbox_items_hash_check
    check (attachment_hash ~ '^sha256:[a-f0-9]{64}$'),
  constraint expense_inbox_items_source_ids_check check (
    (source_email_id is null and source_attachment_id is null)
    or (
      source_email_id is not null
      and source_attachment_id is not null
      and char_length(source_email_id) between 1 and 200
      and char_length(source_attachment_id) between 1 and 200
    )
  )
);

create table if not exists public.expense_inbox_alias_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  alias_token text not null unique,
  status text not null default 'active',
  created_at timestamptz not null default statement_timestamp(),
  retired_at timestamptz,
  updated_at timestamptz not null default statement_timestamp(),
  constraint expense_inbox_alias_history_token_check
    check (alias_token ~ '^[a-z0-9_-]{8,64}$'),
  constraint expense_inbox_alias_history_status_check
    check (status in ('active', 'retired'))
);

create unique index if not exists expense_inbox_items_user_hash_idx
  on public.expense_inbox_items (user_id, attachment_hash);
create index if not exists expense_inbox_items_user_status_received_idx
  on public.expense_inbox_items (user_id, status, received_at desc);
create index if not exists expense_inbox_items_alias_received_idx
  on public.expense_inbox_items (alias_token, received_at desc);
create unique index if not exists expense_inbox_alias_history_active_user_idx
  on public.expense_inbox_alias_history (user_id)
  where status = 'active';
create index if not exists expense_inbox_alias_history_user_status_idx
  on public.expense_inbox_alias_history (user_id, status, updated_at desc);

insert into public.expense_inbox_aliases (
  user_id,
  alias_token,
  active,
  created_at,
  updated_at
)
select
  se.user_id,
  se.payload ->> 'aliasToken',
  coalesce((se.payload ->> 'active')::boolean, true),
  se.updated_at,
  se.updated_at
from public.sync_entities se
where se.entity_type = 'expense_inbox_alias'
  and not se.deleted
  and se.payload ->> 'aliasToken' ~ '^[a-z0-9_-]{8,64}$'
on conflict (user_id) do update
set alias_token = excluded.alias_token,
    active = excluded.active,
    updated_at = greatest(public.expense_inbox_aliases.updated_at, excluded.updated_at);

update public.expense_inbox_alias_history
set status = 'retired',
    retired_at = coalesce(retired_at, statement_timestamp()),
    updated_at = greatest(updated_at, statement_timestamp())
where status = 'active';

insert into public.expense_inbox_alias_history (
  user_id,
  alias_token,
  status,
  created_at,
  retired_at,
  updated_at
)
select
  se.user_id,
  coalesce(nullif(se.payload ->> 'aliasToken', ''), se.entity_id),
  'retired',
  se.updated_at,
  se.updated_at,
  se.updated_at
from public.sync_entities se
where se.entity_type = 'expense_inbox_alias_history'
  and not se.deleted
  and coalesce(nullif(se.payload ->> 'aliasToken', ''), se.entity_id)
    ~ '^[a-z0-9_-]{8,64}$'
on conflict (alias_token) do update
set status = 'retired',
    retired_at = coalesce(public.expense_inbox_alias_history.retired_at, excluded.retired_at),
    updated_at = greatest(public.expense_inbox_alias_history.updated_at, excluded.updated_at);

insert into public.expense_inbox_alias_history (
  user_id,
  alias_token,
  status,
  created_at,
  updated_at
)
select user_id, alias_token, 'active', created_at, updated_at
from public.expense_inbox_aliases
where active
on conflict (alias_token) do update
set user_id = excluded.user_id,
    status = 'active',
    retired_at = null,
    updated_at = greatest(public.expense_inbox_alias_history.updated_at, excluded.updated_at);

insert into public.expense_inbox_items (
  id,
  user_id,
  alias_token,
  from_email,
  from_name,
  subject,
  received_at,
  attachment_filename,
  attachment_content_type,
  attachment_size,
  attachment_hash,
  status,
  scan_payload,
  scan_error,
  processed_at,
  ignored_at,
  created_at,
  updated_at
)
select
  se.entity_id::uuid,
  se.user_id,
  se.payload ->> 'aliasToken',
  nullif(se.payload ->> 'fromEmail', ''),
  nullif(se.payload ->> 'fromName', ''),
  nullif(se.payload ->> 'subject', ''),
  case
    when pg_input_is_valid(nullif(se.payload ->> 'receivedAt', ''), 'timestamptz')
      then (se.payload ->> 'receivedAt')::timestamptz
    else se.updated_at
  end,
  se.payload ->> 'attachmentFilename',
  coalesce(nullif(se.payload ->> 'attachmentContentType', ''), 'application/octet-stream'),
  (se.payload ->> 'attachmentSize')::integer,
  se.payload ->> 'attachmentHash',
  case
    when se.payload ->> 'status' in ('pending', 'processing', 'processed', 'ignored', 'duplicate', 'error')
      then se.payload ->> 'status'
    else 'error'
  end,
  se.payload -> 'scanPayload',
  nullif(se.payload ->> 'scanError', ''),
  case
    when pg_input_is_valid(nullif(se.payload ->> 'processedAt', ''), 'timestamptz')
      then (se.payload ->> 'processedAt')::timestamptz
    else null
  end,
  case
    when pg_input_is_valid(nullif(se.payload ->> 'ignoredAt', ''), 'timestamptz')
      then (se.payload ->> 'ignoredAt')::timestamptz
    else null
  end,
  case
    when pg_input_is_valid(nullif(se.payload ->> 'createdAt', ''), 'timestamptz')
      then (se.payload ->> 'createdAt')::timestamptz
    else se.updated_at
  end,
  se.updated_at
from public.sync_entities se
where se.entity_type = 'expense_inbox_item'
  and not se.deleted
  and se.entity_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and se.payload ->> 'aliasToken' ~ '^[a-z0-9_-]{8,64}$'
  and se.payload ->> 'attachmentFilename' <> ''
  and se.payload ->> 'attachmentHash' ~ '^sha256:[a-f0-9]{64}$'
  and (se.payload ->> 'attachmentSize') ~ '^[1-9][0-9]*$'
  and length(se.payload ->> 'attachmentSize') <= 9
on conflict (user_id, attachment_hash) do nothing;

alter table public.expense_inbox_aliases enable row level security;
alter table public.expense_inbox_items enable row level security;
alter table public.expense_inbox_alias_history enable row level security;
revoke all on table public.expense_inbox_aliases from public, anon, authenticated;
revoke all on table public.expense_inbox_items from public, anon, authenticated;
revoke all on table public.expense_inbox_alias_history from public, anon, authenticated;
grant all on table public.expense_inbox_aliases to service_role;
grant all on table public.expense_inbox_items to service_role;
grant all on table public.expense_inbox_alias_history to service_role;

create table if not exists public.workspace_auxiliary_entities (
  user_id uuid not null references auth.users (id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  payload jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default statement_timestamp(),
  primary key (user_id, entity_type, entity_id),
  constraint workspace_auxiliary_entities_type_v1 check (
    entity_type = 'fiscal_notifications_workspace'
  ),
  constraint workspace_auxiliary_entities_active_v1 check (not deleted)
);

insert into public.workspace_auxiliary_entities (
  user_id,
  entity_type,
  entity_id,
  payload,
  deleted,
  updated_at
)
select distinct on (user_id)
  user_id,
  entity_type,
  entity_id,
  payload,
  false,
  updated_at
from public.sync_entities
where entity_type = 'fiscal_notifications_workspace'
  and not deleted
  and payload is not null
order by user_id, updated_at desc, entity_id desc
on conflict (user_id, entity_type, entity_id) do update
set payload = excluded.payload,
    deleted = false,
    updated_at = greatest(public.workspace_auxiliary_entities.updated_at, excluded.updated_at);

create index if not exists workspace_auxiliary_entities_owner_updated_idx
  on public.workspace_auxiliary_entities (user_id, updated_at);
create unique index if not exists workspace_auxiliary_entities_owner_type_uidx
  on public.workspace_auxiliary_entities (user_id, entity_type);
alter table public.workspace_auxiliary_entities enable row level security;
revoke all on table public.workspace_auxiliary_entities from public, anon, authenticated;
grant select, insert, update on table public.workspace_auxiliary_entities to authenticated;
grant all on table public.workspace_auxiliary_entities to service_role;

drop policy if exists workspace_auxiliary_entities_owner_select_v1
  on public.workspace_auxiliary_entities;
create policy workspace_auxiliary_entities_owner_select_v1
  on public.workspace_auxiliary_entities for select to authenticated
  using (
    (select auth.uid()) = user_id
    and (select public.cloud_device_access_allowed())
  );
drop policy if exists workspace_auxiliary_entities_owner_insert_v1
  on public.workspace_auxiliary_entities;
create policy workspace_auxiliary_entities_owner_insert_v1
  on public.workspace_auxiliary_entities for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (select public.cloud_device_access_allowed())
  );
drop policy if exists workspace_auxiliary_entities_owner_update_v1
  on public.workspace_auxiliary_entities;
create policy workspace_auxiliary_entities_owner_update_v1
  on public.workspace_auxiliary_entities for update to authenticated
  using (
    (select auth.uid()) = user_id
    and (select public.cloud_device_access_allowed())
  )
  with check (
    (select auth.uid()) = user_id
    and (select public.cloud_device_access_allowed())
  );

comment on table public.workspace_auxiliary_entities is
  'Current device-scoped persistence for the fiscal-notifications workspace only; not a generic business synchronizer.';

commit;
