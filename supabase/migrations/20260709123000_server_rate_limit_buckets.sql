create table if not exists public.server_rate_limit_buckets (
  namespace text not null,
  identifier_hash text not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (namespace, identifier_hash)
);

alter table public.server_rate_limit_buckets enable row level security;

revoke all on table public.server_rate_limit_buckets from public;
revoke all on table public.server_rate_limit_buckets from anon;
revoke all on table public.server_rate_limit_buckets from authenticated;
grant all on table public.server_rate_limit_buckets to service_role;

create or replace function public.claim_rate_limit_bucket(
  p_namespace text,
  p_identifier_hash text,
  p_limit integer,
  p_window_ms integer
)
returns table (
  allowed boolean,
  limit_count integer,
  remaining_count integer,
  reset_at timestamptz,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window interval;
  v_count integer;
  v_reset_at timestamptz;
begin
  if p_namespace is null or length(trim(p_namespace)) = 0 then
    raise exception 'namespace_required';
  end if;
  if p_identifier_hash is null or length(trim(p_identifier_hash)) = 0 then
    raise exception 'identifier_required';
  end if;
  if p_limit is null or p_limit < 0 then
    raise exception 'invalid_limit';
  end if;
  if p_window_ms is null or p_window_ms < 1000 then
    raise exception 'invalid_window';
  end if;

  v_window := make_interval(secs => p_window_ms::double precision / 1000);

  delete from public.server_rate_limit_buckets
  where expires_at < v_now - interval '1 hour';

  insert into public.server_rate_limit_buckets (
    namespace,
    identifier_hash,
    window_start,
    request_count,
    expires_at,
    updated_at
  )
  values (
    p_namespace,
    p_identifier_hash,
    v_now,
    1,
    v_now + v_window,
    v_now
  )
  on conflict (namespace, identifier_hash) do update
  set
    request_count = case
      when public.server_rate_limit_buckets.expires_at <= v_now then 1
      else public.server_rate_limit_buckets.request_count + 1
    end,
    window_start = case
      when public.server_rate_limit_buckets.expires_at <= v_now then v_now
      else public.server_rate_limit_buckets.window_start
    end,
    expires_at = case
      when public.server_rate_limit_buckets.expires_at <= v_now then v_now + v_window
      else public.server_rate_limit_buckets.expires_at
    end,
    updated_at = v_now
  returning request_count, expires_at into v_count, v_reset_at;

  allowed := v_count <= p_limit;
  limit_count := p_limit;
  remaining_count := greatest(0, p_limit - v_count);
  reset_at := v_reset_at;
  retry_after_seconds := greatest(1, ceil(extract(epoch from (v_reset_at - v_now)))::integer);
  return next;
end;
$$;

revoke all on function public.claim_rate_limit_bucket(text, text, integer, integer) from public;
revoke all on function public.claim_rate_limit_bucket(text, text, integer, integer) from anon;
revoke all on function public.claim_rate_limit_bucket(text, text, integer, integer) from authenticated;
grant execute on function public.claim_rate_limit_bucket(text, text, integer, integer) to service_role;
