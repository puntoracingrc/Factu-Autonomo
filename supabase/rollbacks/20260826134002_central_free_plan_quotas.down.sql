begin;

drop function if exists public.complete_stripe_quota_pack_event(
  text, uuid, uuid, text, text, integer, text, text, timestamptz
);
drop function if exists public.reconcile_billing_quota_claims(
  uuid, text, text, text[], boolean, timestamptz
);
drop function if exists public.release_billing_quota_subject(
  uuid, text, text, timestamptz
);
drop function if exists public.release_billing_quota_claim(
  uuid, uuid, timestamptz
);
drop function if exists public.commit_billing_quota_claim(
  uuid, uuid, text, timestamptz
);
drop function if exists public.reserve_billing_quota_claim(
  uuid, text, text, text, text, text, integer, timestamptz, text, integer, timestamptz
);

drop table if exists public.billing_quota_pack_purchases;
drop table if exists public.billing_quota_block_events;
drop table if exists public.billing_quota_claims;
drop table if exists public.billing_quota_entitlements;

commit;
