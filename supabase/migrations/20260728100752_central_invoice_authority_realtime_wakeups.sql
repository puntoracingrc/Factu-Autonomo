-- CENTRAL_INVOICE_AUTHORITY_REALTIME_WAKEUPS_V1
-- Scope: publish lightweight, owner-scoped browser wakeups for central invoice
-- authority events without exposing the protected outbox or fiscal payloads.

begin;

create table if not exists public.central_invoice_event_wakeups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  outbox_event_id uuid not null references public.central_invoice_outbox(id) on delete cascade,
  created_at timestamptz not null default statement_timestamp(),
  constraint central_invoice_event_wakeups_outbox_unique_v1 unique (outbox_event_id)
);

create index if not exists central_invoice_event_wakeups_user_created_idx
  on public.central_invoice_event_wakeups (user_id, created_at desc, id desc);

alter table public.central_invoice_event_wakeups enable row level security;

revoke all on table public.central_invoice_event_wakeups from public, anon, authenticated;
grant select on table public.central_invoice_event_wakeups to authenticated;
grant all on table public.central_invoice_event_wakeups to service_role;

drop policy if exists central_invoice_event_wakeups_owner_select_v1
  on public.central_invoice_event_wakeups;

create policy central_invoice_event_wakeups_owner_select_v1
  on public.central_invoice_event_wakeups
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.central_invoice_authority_insert_wakeup_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.central_invoice_event_wakeups (
    user_id,
    outbox_event_id,
    created_at
  )
  values (
    new.user_id,
    new.id,
    new.created_at
  )
  on conflict (outbox_event_id) do nothing;

  return new;
end;
$$;

revoke all on function public.central_invoice_authority_insert_wakeup_v1()
  from public, anon, authenticated;

grant execute on function public.central_invoice_authority_insert_wakeup_v1()
  to service_role;

drop trigger if exists central_invoice_outbox_wakeups_ai_v1
  on public.central_invoice_outbox;

create trigger central_invoice_outbox_wakeups_ai_v1
  after insert on public.central_invoice_outbox
  for each row
  execute function public.central_invoice_authority_insert_wakeup_v1();

do $$
begin
  if exists (
    select 1
      from pg_publication
      where pubname = 'supabase_realtime'
  )
  and not exists (
    select 1
      from pg_publication_rel publication_relation
      join pg_publication publication
        on publication.oid = publication_relation.prpubid
      join pg_class relation
        on relation.oid = publication_relation.prrelid
      join pg_namespace namespace
        on namespace.oid = relation.relnamespace
      where publication.pubname = 'supabase_realtime'
        and namespace.nspname = 'public'
        and relation.relname = 'central_invoice_event_wakeups'
  ) then
    alter publication supabase_realtime
      add table public.central_invoice_event_wakeups;
  end if;
end;
$$;

comment on table public.central_invoice_event_wakeups is
  'CENTRAL_INVOICE_AUTHORITY_REALTIME_WAKEUPS_V1 owner-scoped lightweight Realtime wakeups without fiscal payload.';

comment on function public.central_invoice_authority_insert_wakeup_v1() is
  'CENTRAL_INVOICE_AUTHORITY_REALTIME_WAKEUPS_V1 inserts owner-scoped wakeups when central invoice outbox events are committed.';

commit;
