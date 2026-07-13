-- Manual rollback for AUD-P1-19 Stripe webhook leases and atomic pack grants.

begin;

-- Once the new protocol has observed traffic, deleting its effect ledger would
-- make a later Stripe retry capable of granting the same pack again. Rollback
-- is therefore permitted only before any new attempt/effect or unresolved
-- legacy event exists; otherwise deploy a forward fix.
do $$
begin
  if exists (
    select 1
      from public.stripe_events
     where effect_key is not null
        or attempt_count > 0
        or legacy_review_required
        or status in ('processing', 'failed')
  ) then
    raise exception 'Stripe webhook ledger is not empty; rollback is unsafe, use a forward fix'
      using errcode = '55000';
  end if;
end $$;

revoke all on function public.complete_stripe_scan_pack_event(
  text, uuid, uuid, text, integer, integer, text, text, timestamptz
) from service_role;
revoke all on function public.fail_stripe_event_attempt(
  text, uuid, text, timestamptz
) from service_role;
revoke all on function public.complete_stripe_event_attempt(
  text, uuid, timestamptz
) from service_role;
revoke all on function public.reserve_stripe_event_attempt(
  text, text, integer, timestamptz
) from service_role;

drop function if exists public.complete_stripe_scan_pack_event(
  text, uuid, uuid, text, integer, integer, text, text, timestamptz
);
drop function if exists public.fail_stripe_event_attempt(
  text, uuid, text, timestamptz
);
drop function if exists public.complete_stripe_event_attempt(
  text, uuid, timestamptz
);
drop function if exists public.reserve_stripe_event_attempt(
  text, text, integer, timestamptz
);

drop index if exists public.stripe_events_effect_key_unique_idx;

alter table public.stripe_events
  drop constraint if exists stripe_events_effect_state_check,
  drop constraint if exists stripe_events_legacy_review_state_check,
  drop constraint if exists stripe_events_lease_state_check,
  drop constraint if exists stripe_events_attempt_count_check,
  drop column if exists effect_applied_at,
  drop column if exists effect_payment_status,
  drop column if exists effect_ai_credit_units,
  drop column if exists effect_scan_credits,
  drop column if exists effect_user_id,
  drop column if exists effect_fulfillment_contract,
  drop column if exists effect_kind,
  drop column if exists effect_key,
  drop column if exists legacy_review_required,
  drop column if exists attempt_count,
  drop column if exists lease_expires_at,
  drop column if exists attempt_token;

commit;
