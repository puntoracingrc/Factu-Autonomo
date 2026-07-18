begin;

drop function if exists public.redeem_promo_code(uuid, text, timestamptz);
drop table if exists public.promo_module_entitlements;
drop table if exists public.promo_redemptions;
drop table if exists public.promo_campaigns;
alter table public.user_subscriptions
  drop constraint if exists user_subscriptions_promotional_plan_pair_check,
  drop constraint if exists user_subscriptions_promotional_plan_check,
  drop column if exists promotional_plan_ends_at,
  drop column if exists promotional_plan;

commit;
