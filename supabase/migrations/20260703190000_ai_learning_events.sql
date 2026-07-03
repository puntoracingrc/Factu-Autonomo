create table if not exists public.ai_learning_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  account_label text not null,
  event_type text not null,
  source text not null,
  payload_schema_version text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  constraint ai_learning_events_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint ai_learning_events_account_label check (
    account_label in ('owner_test', 'persianas_almar')
  ),
  constraint ai_learning_events_event_type check (
    event_type in ('expense_scan_feedback')
  )
);

create index if not exists ai_learning_events_created_at_idx
  on public.ai_learning_events (created_at desc);

create index if not exists ai_learning_events_account_label_idx
  on public.ai_learning_events (account_label);

alter table public.ai_learning_events enable row level security;

grant all on table public.ai_learning_events to service_role;
