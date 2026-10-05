begin;

-- A cloud-enabled plan still requires an active subscription, a registered
-- device token and a live Supabase session lease. NULL means that every active
-- device of the company is eligible; 0 keeps Gratis local-only.
create or replace function public.cloud_device_limit_for_user(
  p_user_id uuid,
  p_now timestamptz default now()
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (
      select 1
      from public.user_subscriptions as subscription
      where subscription.user_id = coalesce(
        (
          select company.billing_owner_user_id
          from public.app_companies as company
          where company.data_owner_id = p_user_id
            and company.status = 'active'
        ),
        p_user_id
      )
        and (
          (
            subscription.plan in ('pro', 'pro_plus')
            and subscription.status in ('active', 'trialing')
            and (
              subscription.current_period_end is null
              or subscription.current_period_end >= p_now
            )
          )
          or (
            subscription.promotional_plan in ('pro', 'pro_plus')
            and subscription.promotional_plan_ends_at >= p_now
          )
          or (
            (subscription.plan = 'trial' or subscription.status = 'trialing')
            and subscription.trial_ends_at >= p_now
          )
        )
    ) then null::integer
    else 0
  end;
$$;

revoke all on function public.cloud_device_limit_for_user(uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.cloud_device_limit_for_user(uuid, timestamptz)
  to service_role;

comment on function public.cloud_device_limit_for_user(uuid, timestamptz) is
  'Devuelve 0 sin nube y NULL con nube activa: los dispositivos son ilimitados, pero siguen registrados, revocables y ligados a una sesion.';

commit;
