-- COMPANY_SCOPED_CENTRAL_BUSINESS_REALTIME_V1
-- Realtime topics contain the central data owner. Since company workspaces
-- were introduced, that owner is not necessarily the signed-in Google user.

begin;

create or replace function public.can_receive_central_business_realtime_v1(
  p_topic text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid := (select auth.uid());
  v_data_owner_id uuid;
begin
  if v_actor_user_id is null or p_topic is null then
    return false;
  end if;

  if p_topic !~* '^central-business:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return false;
  end if;

  v_data_owner_id := split_part(p_topic, ':', 2)::uuid;

  if v_data_owner_id = v_actor_user_id then
    return true;
  end if;

  return exists (
    select 1
    from public.app_companies as company
    join public.app_company_members as member
      on member.company_id = company.id
    where company.data_owner_id = v_data_owner_id
      and company.status = 'active'
      and member.user_id = v_actor_user_id
      and member.status = 'active'
  );
end;
$$;

revoke all on function public.can_receive_central_business_realtime_v1(text)
  from public, anon, authenticated;
grant execute on function public.can_receive_central_business_realtime_v1(text)
  to authenticated, service_role;

drop policy if exists central_business_broadcast_owner_select_v1
  on realtime.messages;

create policy central_business_broadcast_owner_select_v1
  on realtime.messages
  for select
  to authenticated
  using (
    extension = 'broadcast'
    and public.can_receive_central_business_realtime_v1(
      (select realtime.topic())
    )
  );

comment on function public.can_receive_central_business_realtime_v1(text) is
  'Authorizes payload-free central business wakeups for an active company member without exposing another company topic.';

commit;
