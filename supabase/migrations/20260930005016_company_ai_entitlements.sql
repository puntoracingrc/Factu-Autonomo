begin;

create table if not exists public.app_company_ai_entitlements (
  company_id uuid primary key
    references public.app_companies(id) on delete cascade,
  access_mode text not null default 'unlimited',
  reason text not null,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint app_company_ai_entitlements_access_mode_v1
    check (access_mode in ('unlimited')),
  constraint app_company_ai_entitlements_reason_v1
    check (char_length(btrim(reason)) between 1 and 500)
);

alter table public.app_company_ai_entitlements enable row level security;

revoke all on table public.app_company_ai_entitlements
  from public, anon, authenticated;
grant all on table public.app_company_ai_entitlements to service_role;

comment on table public.app_company_ai_entitlements is
  'Concesiones de IA por empresa. Solo el backend service_role puede consultarlas o administrarlas.';
comment on column public.app_company_ai_entitlements.access_mode is
  'unlimited concede IA sin consumo de cuota a todos los miembros activos de la empresa.';

commit;
