-- CENTRAL_WORKSPACE_HISTORICAL_ARCHIVE_V1
-- Stores the pre-central invoice history as a tenant-scoped immutable archive.
-- Uploads remain invisible until every document and the ordered manifest hash
-- have been verified in one final transaction.

begin;

create table if not exists public.central_workspace_historical_archives (
  user_id uuid primary key references auth.users(id) on delete cascade,
  archive_id uuid not null unique,
  status text not null default 'uploading',
  expected_document_count integer not null,
  stored_document_count integer not null default 0,
  stored_payload_bytes bigint not null default 0,
  manifest_hash text not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  completed_at timestamptz,
  constraint central_workspace_historical_archives_status_v1 check (
    status in ('uploading', 'ready')
  ),
  constraint central_workspace_historical_archives_count_v1 check (
    expected_document_count between 1 and 10000
    and stored_document_count between 0 and expected_document_count
  ),
  constraint central_workspace_historical_archives_bytes_v1 check (
    stored_payload_bytes between 0 and 67108864
  ),
  constraint central_workspace_historical_archives_hash_v1 check (
    manifest_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  constraint central_workspace_historical_archives_completion_v1 check (
    (status = 'uploading' and completed_at is null)
    or
    (
      status = 'ready'
      and completed_at is not null
      and stored_document_count = expected_document_count
    )
  ),
  constraint central_workspace_historical_archives_owner_archive_v1 unique (
    user_id,
    archive_id
  )
);

create table if not exists public.central_workspace_historical_documents (
  user_id uuid not null,
  archive_id uuid not null,
  local_document_id text not null,
  document_kind text not null,
  content_hash text not null,
  payload jsonb not null,
  created_at timestamptz not null default statement_timestamp(),
  primary key (user_id, archive_id, local_document_id),
  constraint central_workspace_historical_documents_archive_fk_v1
    foreign key (user_id, archive_id)
    references public.central_workspace_historical_archives(user_id, archive_id)
    on delete cascade,
  constraint central_workspace_historical_documents_id_v1 check (
    char_length(local_document_id) between 1 and 200
  ),
  constraint central_workspace_historical_documents_kind_v1 check (
    document_kind in ('factura', 'factura_rectificativa')
  ),
  constraint central_workspace_historical_documents_hash_v1 check (
    content_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  constraint central_workspace_historical_documents_payload_v1 check (
    jsonb_typeof(payload) = 'object'
    and payload ->> 'id' = local_document_id
    and payload ->> 'type' = 'factura'
    and not (payload ? 'centralInvoiceAuthority')
    and pg_catalog.octet_length(payload::text) between 2 and 524288
  )
);

create index if not exists central_workspace_historical_documents_pull_idx
  on public.central_workspace_historical_documents (
    user_id,
    archive_id,
    local_document_id
  );

alter table public.central_workspace_historical_archives enable row level security;
alter table public.central_workspace_historical_documents enable row level security;

drop policy if exists central_workspace_historical_archives_deny_clients_v1
  on public.central_workspace_historical_archives;
create policy central_workspace_historical_archives_deny_clients_v1
  on public.central_workspace_historical_archives
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists central_workspace_historical_documents_deny_clients_v1
  on public.central_workspace_historical_documents;
create policy central_workspace_historical_documents_deny_clients_v1
  on public.central_workspace_historical_documents
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on table public.central_workspace_historical_archives
  from public, anon, authenticated;
revoke all on table public.central_workspace_historical_documents
  from public, anon, authenticated;
grant all on table public.central_workspace_historical_archives to service_role;
grant all on table public.central_workspace_historical_documents to service_role;

create or replace function public.begin_central_workspace_historical_archive_v1(
  p_user_id uuid,
  p_archive_id uuid,
  p_expected_document_count integer,
  p_manifest_hash text
)
returns table (
  result_status text,
  archive_id uuid,
  expected_document_count integer,
  stored_document_count integer,
  manifest_hash text,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.central_workspace_historical_archives%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'begin_central_workspace_historical_archive_v1 requires service_role';
  end if;
  if p_user_id is null
    or p_archive_id is null
    or p_expected_document_count is null
    or p_expected_document_count < 1
    or p_expected_document_count > 10000
    or coalesce(p_manifest_hash, '') !~ '^sha256:[0-9a-f]{64}$'
  then
    raise exception 'invalid central workspace historical archive manifest';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_user_id::text || ':central-workspace-historical-archive',
      0
    )
  );

  select *
    into v_existing
    from public.central_workspace_historical_archives as archive
    where archive.user_id = p_user_id
    for update;

  if found and v_existing.status = 'ready' then
    if v_existing.expected_document_count <> p_expected_document_count
      or v_existing.manifest_hash <> p_manifest_hash
    then
      raise exception 'ready central workspace historical archive is immutable';
    end if;
    return query
      select
        'ready'::text,
        v_existing.archive_id,
        v_existing.expected_document_count,
        v_existing.stored_document_count,
        v_existing.manifest_hash,
        v_existing.completed_at;
    return;
  end if;

  if found
    and v_existing.status = 'uploading'
    and v_existing.expected_document_count = p_expected_document_count
    and v_existing.manifest_hash = p_manifest_hash
  then
    return query
      select
        'uploading'::text,
        v_existing.archive_id,
        v_existing.expected_document_count,
        v_existing.stored_document_count,
        v_existing.manifest_hash,
        v_existing.completed_at;
    return;
  end if;

  if found and (
    v_existing.archive_id <> p_archive_id
    or v_existing.expected_document_count <> p_expected_document_count
    or v_existing.manifest_hash <> p_manifest_hash
  ) then
    delete from public.central_workspace_historical_documents as document
      where document.user_id = p_user_id;
  end if;

  insert into public.central_workspace_historical_archives (
    user_id,
    archive_id,
    status,
    expected_document_count,
    stored_document_count,
    manifest_hash,
    created_at,
    updated_at,
    completed_at
  )
  values (
    p_user_id,
    p_archive_id,
    'uploading',
    p_expected_document_count,
    0,
    p_manifest_hash,
    statement_timestamp(),
    statement_timestamp(),
    null
  )
  on conflict (user_id) do update
    set
      archive_id = excluded.archive_id,
      status = 'uploading',
      expected_document_count = excluded.expected_document_count,
      stored_document_count = case
        when public.central_workspace_historical_archives.archive_id = excluded.archive_id
          and public.central_workspace_historical_archives.manifest_hash = excluded.manifest_hash
        then public.central_workspace_historical_archives.stored_document_count
        else 0
      end,
      stored_payload_bytes = case
        when public.central_workspace_historical_archives.archive_id = excluded.archive_id
          and public.central_workspace_historical_archives.manifest_hash = excluded.manifest_hash
        then public.central_workspace_historical_archives.stored_payload_bytes
        else 0
      end,
      manifest_hash = excluded.manifest_hash,
      created_at = case
        when public.central_workspace_historical_archives.archive_id = excluded.archive_id
          and public.central_workspace_historical_archives.manifest_hash = excluded.manifest_hash
        then public.central_workspace_historical_archives.created_at
        else statement_timestamp()
      end,
      updated_at = statement_timestamp(),
      completed_at = null
  returning * into v_existing;

  return query
    select
      'uploading'::text,
      v_existing.archive_id,
      v_existing.expected_document_count,
      v_existing.stored_document_count,
      v_existing.manifest_hash,
      v_existing.completed_at;
end;
$$;

create or replace function public.append_central_workspace_historical_archive_v1(
  p_user_id uuid,
  p_archive_id uuid,
  p_documents jsonb
)
returns table (
  archive_id uuid,
  stored_document_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_archive public.central_workspace_historical_archives%rowtype;
  v_entry jsonb;
  v_local_document_id text;
  v_document_kind text;
  v_content_hash text;
  v_payload jsonb;
  v_existing_hash text;
  v_existing_payload jsonb;
  v_count integer;
  v_payload_bytes bigint;
begin
  if auth.role() <> 'service_role' then
    raise exception 'append_central_workspace_historical_archive_v1 requires service_role';
  end if;
  if p_user_id is null
    or p_archive_id is null
    or jsonb_typeof(p_documents) <> 'array'
    or jsonb_array_length(p_documents) < 1
    or jsonb_array_length(p_documents) > 100
  then
    raise exception 'invalid central workspace historical archive batch';
  end if;

  select *
    into v_archive
    from public.central_workspace_historical_archives as archive
    where archive.user_id = p_user_id
      and archive.archive_id = p_archive_id
    for update;

  if not found or v_archive.status <> 'uploading' then
    raise exception 'central workspace historical archive is not accepting documents';
  end if;

  for v_entry in select value from jsonb_array_elements(p_documents)
  loop
    v_local_document_id := v_entry ->> 'localDocumentId';
    v_document_kind := v_entry ->> 'documentKind';
    v_content_hash := v_entry ->> 'contentHash';
    v_payload := v_entry -> 'payload';

    if jsonb_typeof(v_entry) <> 'object'
      or char_length(coalesce(v_local_document_id, '')) not between 1 and 200
      or coalesce(v_document_kind, '') not in ('factura', 'factura_rectificativa')
      or coalesce(v_content_hash, '') !~ '^sha256:[0-9a-f]{64}$'
      or jsonb_typeof(v_payload) <> 'object'
      or pg_catalog.octet_length(v_payload::text) > 524288
      or v_payload ->> 'id' <> v_local_document_id
      or v_payload ->> 'type' <> 'factura'
      or v_payload ? 'centralInvoiceAuthority'
      or (
        v_document_kind = 'factura_rectificativa'
        and jsonb_typeof(v_payload -> 'rectification') <> 'object'
      )
      or (
        v_document_kind = 'factura'
        and v_payload ? 'rectification'
      )
    then
      raise exception 'invalid central workspace historical document';
    end if;

    select document.content_hash, document.payload
      into v_existing_hash, v_existing_payload
      from public.central_workspace_historical_documents as document
      where document.user_id = p_user_id
        and document.archive_id = p_archive_id
        and document.local_document_id = v_local_document_id;

    if found then
      if v_existing_hash <> v_content_hash or v_existing_payload <> v_payload then
        raise exception 'central workspace historical document changed during upload';
      end if;
    else
      insert into public.central_workspace_historical_documents (
        user_id,
        archive_id,
        local_document_id,
        document_kind,
        content_hash,
        payload
      )
      values (
        p_user_id,
        p_archive_id,
        v_local_document_id,
        v_document_kind,
        v_content_hash,
        v_payload
      );
    end if;
  end loop;

  select
    count(*)::integer,
    coalesce(sum(pg_catalog.octet_length(document.payload::text)), 0)::bigint
    into v_count, v_payload_bytes
    from public.central_workspace_historical_documents as document
    where document.user_id = p_user_id
      and document.archive_id = p_archive_id;

  if v_count > v_archive.expected_document_count then
    raise exception 'central workspace historical archive exceeds manifest count';
  end if;
  if v_payload_bytes > 67108864 then
    raise exception 'central workspace historical archive exceeds storage limit';
  end if;

  update public.central_workspace_historical_archives as archive
    set
      stored_document_count = v_count,
      stored_payload_bytes = v_payload_bytes,
      updated_at = statement_timestamp()
    where archive.user_id = p_user_id
      and archive.archive_id = p_archive_id;

  return query select p_archive_id, v_count;
end;
$$;

create or replace function public.finalize_central_workspace_historical_archive_v1(
  p_user_id uuid,
  p_archive_id uuid
)
returns table (
  archive_id uuid,
  document_count integer,
  manifest_hash text,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_archive public.central_workspace_historical_archives%rowtype;
  v_count integer;
  v_manifest_hash text;
  v_completed_at timestamptz;
begin
  if auth.role() <> 'service_role' then
    raise exception 'finalize_central_workspace_historical_archive_v1 requires service_role';
  end if;
  if p_user_id is null or p_archive_id is null then
    raise exception 'invalid central workspace historical archive finalization';
  end if;

  select *
    into v_archive
    from public.central_workspace_historical_archives as archive
    where archive.user_id = p_user_id
      and archive.archive_id = p_archive_id
    for update;

  if not found then
    raise exception 'central workspace historical archive not found';
  end if;
  if v_archive.status = 'ready' then
    return query
      select
        v_archive.archive_id,
        v_archive.stored_document_count,
        v_archive.manifest_hash,
        v_archive.completed_at;
    return;
  end if;

  select
    count(*)::integer,
    'sha256:' || pg_catalog.encode(
      extensions.digest(
        pg_catalog.convert_to(
          coalesce(
            string_agg(
              document.local_document_id || ':' || document.content_hash,
              E'\n'
              order by document.local_document_id collate "C"
            ),
            ''
          ),
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    )
    into v_count, v_manifest_hash
    from public.central_workspace_historical_documents as document
    where document.user_id = p_user_id
      and document.archive_id = p_archive_id;

  if v_count <> v_archive.expected_document_count
    or v_manifest_hash <> v_archive.manifest_hash
  then
    raise exception 'central workspace historical archive manifest mismatch';
  end if;

  v_completed_at := statement_timestamp();
  update public.central_workspace_historical_archives as archive
    set
      status = 'ready',
      stored_document_count = v_count,
      updated_at = v_completed_at,
      completed_at = v_completed_at
    where archive.user_id = p_user_id
      and archive.archive_id = p_archive_id;

  return query
    select p_archive_id, v_count, v_manifest_hash, v_completed_at;
end;
$$;

revoke all on function public.begin_central_workspace_historical_archive_v1(
  uuid,
  uuid,
  integer,
  text
) from public, anon, authenticated;
revoke all on function public.append_central_workspace_historical_archive_v1(
  uuid,
  uuid,
  jsonb
) from public, anon, authenticated;
revoke all on function public.finalize_central_workspace_historical_archive_v1(
  uuid,
  uuid
) from public, anon, authenticated;

grant execute on function public.begin_central_workspace_historical_archive_v1(
  uuid,
  uuid,
  integer,
  text
) to service_role;
grant execute on function public.append_central_workspace_historical_archive_v1(
  uuid,
  uuid,
  jsonb
) to service_role;
grant execute on function public.finalize_central_workspace_historical_archive_v1(
  uuid,
  uuid
) to service_role;

comment on table public.central_workspace_historical_archives is
  'Tenant-scoped immutable manifests for pre-central invoice recovery.';
comment on table public.central_workspace_historical_documents is
  'Full historical invoice payloads, visible only after their archive manifest is finalized.';

commit;
