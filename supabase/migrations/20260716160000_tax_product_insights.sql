-- Minimal, first-party product telemetry for the orientative tax diagnostic.
-- It intentionally stores no auth UUID, e-mail, file name, document text or raw OCR.
create table if not exists public.tax_product_events (
  id uuid primary key,
  occurred_at timestamptz not null,
  anonymous_subject_id text not null check (length(anonymous_subject_id) = 64),
  session_id uuid not null,
  event_type text not null,
  page text,
  device_category text,
  question_id text,
  question_group text,
  risk_tag text,
  model_number text,
  recommendation_status text,
  document_family text,
  extraction_method text,
  confidence_bucket text,
  fiscal_year integer,
  engine_version text,
  ruleset_version text,
  layout_version text,
  properties jsonb not null default '{}'::jsonb,
  contract_version text not null,
  created_at timestamptz not null default now()
);

create index if not exists tax_product_events_occurred_at_idx on public.tax_product_events (occurred_at desc);
create index if not exists tax_product_events_event_type_idx on public.tax_product_events (event_type, occurred_at desc);
create index if not exists tax_product_events_question_idx on public.tax_product_events (question_id, occurred_at desc) where question_id is not null;
create index if not exists tax_product_events_model_idx on public.tax_product_events (model_number, occurred_at desc) where model_number is not null;
create index if not exists tax_product_events_family_idx on public.tax_product_events (document_family, occurred_at desc) where document_family is not null;

alter table public.tax_product_events enable row level security;
alter table public.tax_product_events force row level security;
revoke all on table public.tax_product_events from public, anon, authenticated;
grant all on table public.tax_product_events to service_role;

create table if not exists public.tax_product_weekly_reports (
  period_start date not null,
  period_end date not null,
  schema_version text not null,
  report jsonb not null,
  generated_at timestamptz not null default now(),
  primary key (period_start, period_end)
);

alter table public.tax_product_weekly_reports enable row level security;
alter table public.tax_product_weekly_reports force row level security;
revoke all on table public.tax_product_weekly_reports from public, anon, authenticated;
grant all on table public.tax_product_weekly_reports to service_role;

create or replace function public.purge_tax_product_events(p_retention_days integer default 90)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count bigint;
begin
  if p_retention_days < 1 or p_retention_days > 365 then
    raise exception 'retention days out of range';
  end if;
  delete from public.tax_product_events
  where occurred_at < now() - make_interval(days => p_retention_days);
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_tax_product_events(integer) from public, anon, authenticated;
grant execute on function public.purge_tax_product_events(integer) to service_role;
