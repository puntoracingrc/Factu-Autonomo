-- CENTRAL_BUSINESS_REALTIME_WAKEUPS_V1
-- Scope: send an owner-scoped, payload-free wakeup after each committed
-- central business event. Browsers still pull and verify the durable outbox.

begin;

drop policy if exists central_business_broadcast_owner_select_v1
  on realtime.messages;

create policy central_business_broadcast_owner_select_v1
  on realtime.messages
  for select
  to authenticated
  using (
    extension = 'broadcast'
    and (select realtime.topic()) =
      'central-business:' || (select auth.uid())::text
  );

create or replace function public.central_business_authority_broadcast_wakeup_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(
    jsonb_build_object('event_sequence', new.event_sequence),
    'central_business_changed',
    'central-business:' || new.user_id::text,
    true
  );

  return new;
end;
$$;

revoke all on function public.central_business_authority_broadcast_wakeup_v1()
  from public, anon, authenticated;

grant execute on function public.central_business_authority_broadcast_wakeup_v1()
  to service_role;

drop trigger if exists central_business_outbox_broadcast_wakeup_ai_v1
  on public.central_business_outbox;

create trigger central_business_outbox_broadcast_wakeup_ai_v1
  after insert on public.central_business_outbox
  for each row
  execute function public.central_business_authority_broadcast_wakeup_v1();

comment on function public.central_business_authority_broadcast_wakeup_v1() is
  'CENTRAL_BUSINESS_REALTIME_WAKEUPS_V1 emits only an owner-scoped event sequence; clients pull the authoritative outbox separately.';

commit;
