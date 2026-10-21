-- Explicit private enrollment may admit active company administrators too.
-- No enrollment, membership, historical operation or document is changed here.
begin;

create or replace function public.quick_invoicing_scope_v1(p_actor_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_scope jsonb;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'QUICK_SERVICE_ONLY';
  end if;
  select jsonb_build_object(
    'actor_id', a.actor_user_id, 'company_id', c.id, 'company_name', c.name,
    'user_id', c.data_owner_id, 'billing_user_id', c.billing_owner_user_id,
    'profile_version', p.current_version,
    'profile', (select jsonb_object_agg(k, v) from jsonb_each(p.current_payload) as fields(k,v)
      where k = any(array['commercialName','name','nif','vatId','address','city','postalCode','province','country','phone','email','website','iban','logoUrl','iva','vatExempt','numbering','documentTemplate','quoteValidityDays','verifactu']))
  ) into v_scope
  from public.quick_invoicing_access a
  join public.app_companies c on c.id = a.company_id and c.status = 'active'
  join public.app_company_members m on m.company_id = c.id and m.user_id = a.actor_user_id
    and m.status = 'active' and m.role in ('owner', 'admin')
  join public.central_business_entities p on p.user_id = c.data_owner_id and p.entity_type = 'profile' and p.entity_id = 'profile' and not p.deleted
  where a.actor_user_id = p_actor_id and a.enabled;
  if v_scope is null then raise exception using errcode = '42501', message = 'QUICK_PILOT_UNAVAILABLE'; end if;
  return v_scope;
end $$;

revoke all on function public.quick_invoicing_scope_v1(uuid) from public, anon, authenticated;
grant execute on function public.quick_invoicing_scope_v1(uuid) to service_role;
comment on function public.quick_invoicing_scope_v1(uuid) is
  'Private quick-app enrollment plus active owner/admin membership; never grants access to another workspace or changes main-app membership.';

commit;
