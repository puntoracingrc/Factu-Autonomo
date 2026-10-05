begin;

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
  select coalesce((
    select case
      when subscription.plan in ('pro', 'pro_plus')
        and subscription.status in ('active', 'trialing')
        and (
          subscription.current_period_end is null
          or subscription.current_period_end >= p_now
        )
        then case when subscription.plan = 'pro_plus' then 5 else 2 end
      when subscription.promotional_plan in ('pro', 'pro_plus')
        and subscription.promotional_plan_ends_at >= p_now
        then case
          when subscription.promotional_plan = 'pro_plus' then 5
          else 2
        end
      when (subscription.plan = 'trial' or subscription.status = 'trialing')
        and subscription.trial_ends_at >= p_now
        then 2
      else 0
    end
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
  ), 0);
$$;

revoke all on function public.cloud_device_limit_for_user(uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.cloud_device_limit_for_user(uuid, timestamptz)
  to service_role;

commit;
