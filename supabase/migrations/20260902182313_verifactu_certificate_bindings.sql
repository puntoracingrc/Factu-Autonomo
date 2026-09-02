-- VERIFACTU_CERTIFICATE_BINDINGS_V1
-- Certificate bytes are encrypted by the application before they enter the
-- private Storage bucket. This schema stores only tenant-scoped metadata.

begin;

create table if not exists public.verifactu_certificate_bindings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  issuer_nif text not null,
  environment text not null,
  certificate_channel text not null,
  envelope_id uuid not null,
  object_path text not null,
  p12_sha256 text not null,
  certificate_fingerprint_sha256 text not null,
  certificate_valid_from timestamptz not null,
  certificate_valid_to timestamptz not null,
  binding_version integer not null default 1,
  status text not null default 'active',
  reason text not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  revoked_at timestamptz,
  last_used_at timestamptz,
  constraint verifactu_certificate_bindings_scope_uidx
    unique (user_id, issuer_nif, environment),
  constraint verifactu_certificate_bindings_nif_check
    check (issuer_nif ~ '^[A-Z0-9]{9}$'),
  constraint verifactu_certificate_bindings_test_only_check
    check (environment = 'test'),
  constraint verifactu_certificate_bindings_channel_check
    check (certificate_channel in ('personal', 'sello')),
  constraint verifactu_certificate_bindings_hash_check
    check (
      p12_sha256 ~ '^[a-f0-9]{64}$'
      and certificate_fingerprint_sha256 ~ '^[a-f0-9]{64}$'
    ),
  constraint verifactu_certificate_bindings_validity_check
    check (certificate_valid_from < certificate_valid_to),
  constraint verifactu_certificate_bindings_version_check
    check (binding_version > 0),
  constraint verifactu_certificate_bindings_status_check
    check (status in ('active', 'revoked')),
  constraint verifactu_certificate_bindings_reason_check
    check (char_length(btrim(reason)) between 3 and 500),
  constraint verifactu_certificate_bindings_revocation_check
    check (
      (status = 'active' and revoked_at is null)
      or (status = 'revoked' and revoked_at is not null)
    ),
  constraint verifactu_certificate_bindings_envelope_uidx
    unique (envelope_id)
);

comment on table public.verifactu_certificate_bindings is
  'Server-only metadata that binds one encrypted certificate to one user, issuer NIF and test environment.';
comment on column public.verifactu_certificate_bindings.object_path is
  'Path in the private verifactu-certificates bucket. The object contains an application-encrypted envelope.';

create index if not exists verifactu_certificate_bindings_active_idx
  on public.verifactu_certificate_bindings (user_id, issuer_nif)
  where status = 'active';

create table if not exists public.verifactu_certificate_binding_audit (
  id uuid primary key default gen_random_uuid(),
  binding_id uuid not null references public.verifactu_certificate_bindings(id)
    on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  issuer_nif text not null,
  environment text not null,
  event_type text not null,
  envelope_id uuid not null,
  binding_version integer not null,
  p12_sha256 text not null,
  certificate_fingerprint_sha256 text not null,
  certificate_valid_from timestamptz not null,
  certificate_valid_to timestamptz not null,
  reason text not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint verifactu_certificate_binding_audit_event_check
    check (event_type in ('provisioned', 'rotated', 'revoked', 'used')),
  constraint verifactu_certificate_binding_audit_test_only_check
    check (environment = 'test'),
  constraint verifactu_certificate_binding_audit_hash_check
    check (
      p12_sha256 ~ '^[a-f0-9]{64}$'
      and certificate_fingerprint_sha256 ~ '^[a-f0-9]{64}$'
    ),
  constraint verifactu_certificate_binding_audit_validity_check
    check (certificate_valid_from < certificate_valid_to),
  constraint verifactu_certificate_binding_audit_reason_check
    check (char_length(btrim(reason)) between 3 and 500)
);

comment on table public.verifactu_certificate_binding_audit is
  'Append-only safe certificate audit. It never stores object contents, passwords or decrypted material.';

create index if not exists verifactu_certificate_binding_audit_scope_idx
  on public.verifactu_certificate_binding_audit
  (user_id, issuer_nif, created_at desc);
create index if not exists verifactu_certificate_binding_audit_binding_idx
  on public.verifactu_certificate_binding_audit (binding_id);

create or replace function public.verifactu_certificate_binding_audit_immutable_v1()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'verifactu certificate audit rows are immutable'
    using errcode = '25006';
end;
$$;

drop trigger if exists verifactu_certificate_binding_audit_immutable_v1
  on public.verifactu_certificate_binding_audit;
create trigger verifactu_certificate_binding_audit_immutable_v1
before update or delete on public.verifactu_certificate_binding_audit
for each row execute function public.verifactu_certificate_binding_audit_immutable_v1();

create or replace function public.activate_verifactu_certificate_binding_v1(
  p_user_id uuid,
  p_issuer_nif text,
  p_environment text,
  p_certificate_channel text,
  p_envelope_id uuid,
  p_object_path text,
  p_p12_sha256 text,
  p_certificate_fingerprint_sha256 text,
  p_certificate_valid_from timestamptz,
  p_certificate_valid_to timestamptz,
  p_reason text
)
returns table (
  binding_id uuid,
  binding_version integer,
  previous_object_path text,
  activated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.verifactu_certificate_bindings%rowtype;
  v_binding public.verifactu_certificate_bindings%rowtype;
  v_nif text := upper(regexp_replace(btrim(coalesce(p_issuer_nif, '')), '\s+', '', 'g'));
  v_reason text := btrim(coalesce(p_reason, ''));
  v_now timestamptz := statement_timestamp();
  v_event text;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'activate_verifactu_certificate_binding_v1 requires service_role';
  end if;
  if v_nif !~ '^[A-Z0-9]{9}$'
    or coalesce(p_environment, '') <> 'test'
    or coalesce(p_certificate_channel, '') not in ('personal', 'sello')
    or p_envelope_id is null
    or p_user_id is null
    or coalesce(p_p12_sha256, '') !~ '^[a-f0-9]{64}$'
    or coalesce(p_certificate_fingerprint_sha256, '') !~ '^[a-f0-9]{64}$'
    or p_certificate_valid_from is null
    or p_certificate_valid_to is null
    or p_certificate_valid_from >= v_now
    or p_certificate_valid_to <= v_now
    or char_length(v_reason) not between 3 and 500
    or coalesce(p_object_path, '') <> (
      p_user_id::text || '/' || v_nif || '/test/' || p_envelope_id::text || '.vfce'
    ) then
    raise exception 'invalid verifactu certificate binding metadata'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text || ':' || v_nif || ':test', 0)
  );

  select * into v_existing
  from public.verifactu_certificate_bindings
  where user_id = p_user_id
    and issuer_nif = v_nif
    and environment = 'test'
  for update;

  insert into public.verifactu_certificate_bindings (
    user_id,
    issuer_nif,
    environment,
    certificate_channel,
    envelope_id,
    object_path,
    p12_sha256,
    certificate_fingerprint_sha256,
    certificate_valid_from,
    certificate_valid_to,
    binding_version,
    status,
    reason,
    created_at,
    updated_at,
    revoked_at
  ) values (
    p_user_id,
    v_nif,
    'test',
    p_certificate_channel,
    p_envelope_id,
    p_object_path,
    p_p12_sha256,
    p_certificate_fingerprint_sha256,
    p_certificate_valid_from,
    p_certificate_valid_to,
    coalesce(v_existing.binding_version, 0) + 1,
    'active',
    v_reason,
    coalesce(v_existing.created_at, v_now),
    v_now,
    null
  )
  on conflict (user_id, issuer_nif, environment)
  do update set
    certificate_channel = excluded.certificate_channel,
    envelope_id = excluded.envelope_id,
    object_path = excluded.object_path,
    p12_sha256 = excluded.p12_sha256,
    certificate_fingerprint_sha256 = excluded.certificate_fingerprint_sha256,
    certificate_valid_from = excluded.certificate_valid_from,
    certificate_valid_to = excluded.certificate_valid_to,
    binding_version = public.verifactu_certificate_bindings.binding_version + 1,
    status = 'active',
    reason = excluded.reason,
    updated_at = v_now,
    revoked_at = null
  returning * into v_binding;

  v_event := case when v_existing.id is null then 'provisioned' else 'rotated' end;
  insert into public.verifactu_certificate_binding_audit (
    binding_id,
    user_id,
    issuer_nif,
    environment,
    event_type,
    envelope_id,
    binding_version,
    p12_sha256,
    certificate_fingerprint_sha256,
    certificate_valid_from,
    certificate_valid_to,
    reason,
    created_at
  ) values (
    v_binding.id,
    v_binding.user_id,
    v_binding.issuer_nif,
    v_binding.environment,
    v_event,
    v_binding.envelope_id,
    v_binding.binding_version,
    v_binding.p12_sha256,
    v_binding.certificate_fingerprint_sha256,
    v_binding.certificate_valid_from,
    v_binding.certificate_valid_to,
    v_reason,
    v_now
  );

  return query select
    v_binding.id,
    v_binding.binding_version,
    v_existing.object_path,
    v_now;
end;
$$;

create or replace function public.revoke_verifactu_certificate_binding_v1(
  p_user_id uuid,
  p_issuer_nif text,
  p_reason text
)
returns table (
  binding_id uuid,
  revoked_object_path text,
  revoked_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_binding public.verifactu_certificate_bindings%rowtype;
  v_nif text := upper(regexp_replace(btrim(coalesce(p_issuer_nif, '')), '\s+', '', 'g'));
  v_reason text := btrim(coalesce(p_reason, ''));
  v_now timestamptz := statement_timestamp();
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'revoke_verifactu_certificate_binding_v1 requires service_role';
  end if;
  if char_length(v_reason) not between 3 and 500 then
    raise exception 'invalid verifactu certificate revocation reason'
      using errcode = '22023';
  end if;

  select * into v_binding
  from public.verifactu_certificate_bindings
  where user_id = p_user_id
    and issuer_nif = v_nif
    and environment = 'test'
  for update;

  if v_binding.id is null then
    raise exception 'verifactu certificate binding not found'
      using errcode = 'P0002';
  end if;

  if v_binding.status = 'active' then
    update public.verifactu_certificate_bindings
    set status = 'revoked',
        reason = v_reason,
        revoked_at = v_now,
        updated_at = v_now
    where id = v_binding.id;

    insert into public.verifactu_certificate_binding_audit (
      binding_id,
      user_id,
      issuer_nif,
      environment,
      event_type,
      envelope_id,
      binding_version,
      p12_sha256,
      certificate_fingerprint_sha256,
      certificate_valid_from,
      certificate_valid_to,
      reason,
      created_at
    ) values (
      v_binding.id,
      v_binding.user_id,
      v_binding.issuer_nif,
      v_binding.environment,
      'revoked',
      v_binding.envelope_id,
      v_binding.binding_version,
      v_binding.p12_sha256,
      v_binding.certificate_fingerprint_sha256,
      v_binding.certificate_valid_from,
      v_binding.certificate_valid_to,
      v_reason,
      v_now
    );
  end if;

  return query select v_binding.id, v_binding.object_path, v_now;
end;
$$;

create or replace function public.mark_verifactu_certificate_binding_used_v1(
  p_binding_id uuid,
  p_user_id uuid,
  p_issuer_nif text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_binding public.verifactu_certificate_bindings%rowtype;
  v_reason text := btrim(coalesce(p_reason, ''));
  v_now timestamptz := statement_timestamp();
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'mark_verifactu_certificate_binding_used_v1 requires service_role';
  end if;
  if char_length(v_reason) not between 3 and 500 then
    raise exception 'invalid verifactu certificate use reason'
      using errcode = '22023';
  end if;

  select * into v_binding
  from public.verifactu_certificate_bindings
  where id = p_binding_id
    and user_id = p_user_id
    and issuer_nif = upper(regexp_replace(btrim(coalesce(p_issuer_nif, '')), '\s+', '', 'g'))
    and environment = 'test'
    and status = 'active'
    and certificate_valid_from <= statement_timestamp()
    and certificate_valid_to > statement_timestamp()
  for update;

  if v_binding.id is null then
    raise exception 'active verifactu certificate binding not found'
      using errcode = 'P0002';
  end if;

  update public.verifactu_certificate_bindings
  set last_used_at = v_now,
      updated_at = v_now
  where id = v_binding.id;

  insert into public.verifactu_certificate_binding_audit (
    binding_id,
    user_id,
    issuer_nif,
    environment,
    event_type,
    envelope_id,
    binding_version,
    p12_sha256,
    certificate_fingerprint_sha256,
    certificate_valid_from,
    certificate_valid_to,
    reason,
    created_at
  ) values (
    v_binding.id,
    v_binding.user_id,
    v_binding.issuer_nif,
    v_binding.environment,
    'used',
    v_binding.envelope_id,
    v_binding.binding_version,
    v_binding.p12_sha256,
    v_binding.certificate_fingerprint_sha256,
    v_binding.certificate_valid_from,
    v_binding.certificate_valid_to,
    v_reason,
    v_now
  );
end;
$$;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'verifactu-certificates',
  'verifactu-certificates',
  false,
  524288,
  array['application/octet-stream']::text[]
)
on conflict (id) do update set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.verifactu_certificate_bindings enable row level security;
alter table public.verifactu_certificate_binding_audit enable row level security;

revoke all on table public.verifactu_certificate_bindings
  from public, anon, authenticated, service_role;
revoke all on table public.verifactu_certificate_binding_audit
  from public, anon, authenticated, service_role;
grant select on table public.verifactu_certificate_bindings to service_role;
grant select on table public.verifactu_certificate_binding_audit to service_role;

revoke all on function public.verifactu_certificate_binding_audit_immutable_v1()
  from public, anon, authenticated;
revoke all on function public.activate_verifactu_certificate_binding_v1(
  uuid, text, text, text, uuid, text, text, text, timestamptz, timestamptz, text
) from public, anon, authenticated;
revoke all on function public.revoke_verifactu_certificate_binding_v1(
  uuid, text, text
) from public, anon, authenticated;
revoke all on function public.mark_verifactu_certificate_binding_used_v1(
  uuid, uuid, text, text
) from public, anon, authenticated;
grant execute on function public.activate_verifactu_certificate_binding_v1(
  uuid, text, text, text, uuid, text, text, text, timestamptz, timestamptz, text
) to service_role;
grant execute on function public.revoke_verifactu_certificate_binding_v1(
  uuid, text, text
) to service_role;
grant execute on function public.mark_verifactu_certificate_binding_used_v1(
  uuid, uuid, text, text
) to service_role;

commit;
