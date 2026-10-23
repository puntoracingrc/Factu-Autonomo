begin;
alter table public.quick_stripe_payments
  add column channel text not null default 'checkout' check (channel in ('checkout','terminal')),
  add constraint quick_stripe_channel_session check (channel='checkout' or (checkout_session_id is null and checkout_url is null));

-- A short-lived handoff conveys only this payment, never the Google session,
-- device token, Stripe key, fiscal authority or another tenant's data.
create table public.quick_terminal_grants (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  payment_id uuid not null references public.quick_stripe_payments(id),
  actor_id uuid not null references auth.users(id),
  company_id uuid not null references public.app_companies(id),
  session_hash text not null check (session_hash ~ '^[a-f0-9]{64}$'),
  device_hash text not null check (device_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null default (now()+interval '10 minutes'),
  created_at timestamptz not null default now()
);
create index quick_terminal_grants_payment_idx on public.quick_terminal_grants(payment_id);
create index quick_terminal_grants_actor_idx on public.quick_terminal_grants(actor_id);
create index quick_terminal_grants_company_idx on public.quick_terminal_grants(company_id);
alter table public.quick_terminal_grants enable row level security;
revoke all on public.quick_terminal_grants from public,anon,authenticated;
grant select,insert,delete on public.quick_terminal_grants to service_role;

-- auth.sessions is deliberately unavailable to service_role. This narrowly
-- scoped boolean lookup lives outside the Data API; it exposes no session data
-- and does not grant the application general access to the Auth schema.
create schema if not exists quick_terminal_private;
revoke all on schema quick_terminal_private from public,anon,authenticated;
grant usage on schema quick_terminal_private to service_role;
create function quick_terminal_private.session_active(p_actor_id uuid,p_session_hash text)
returns boolean language plpgsql stable security definer set search_path='' as $$
begin
  if coalesce((select auth.role()),'')<>'service_role' then raise exception using errcode='42501',message='STRIPE_SERVICE_ONLY'; end if;
  return exists(select 1 from auth.sessions s join auth.users u on u.id=s.user_id where s.user_id=p_actor_id
    and public.cloud_device_session_hash(s.id::text)=p_session_hash
    and (s.not_after is null or s.not_after>now()) and u.email_confirmed_at is not null
    and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now()));
end $$;
revoke all on function quick_terminal_private.session_active(uuid,text) from public,anon,authenticated;
grant execute on function quick_terminal_private.session_active(uuid,text) to service_role;

create function public.reserve_quick_terminal_payment_v1(p_actor_id uuid,p_operation_id uuid,p_collection_id uuid,
  p_expected_version integer,p_amount integer,p_account_id text,p_livemode boolean)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_scope jsonb; v_payment public.quick_stripe_payments%rowtype; v_result jsonb; v_doc public.central_invoice_documents%rowtype;
begin
  if coalesce((select auth.role()),'')<>'service_role' then raise exception using errcode='42501',message='STRIPE_SERVICE_ONLY'; end if;
  if (p_operation_id is null)=(p_collection_id is null) then raise exception using errcode='P4510',message='TERMINAL_ORIGIN_REQUIRED'; end if;
  v_scope:=public.quick_invoicing_scope_v1(p_actor_id);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('central-business-owner:'||(v_scope->>'user_id'),0));
  select * into v_payment from public.quick_stripe_payments where company_id=(v_scope->>'company_id')::uuid
    and livemode=p_livemode and status<>'expired'
    and ((p_operation_id is not null and operation_id=p_operation_id) or (p_collection_id is not null and collection_id=p_collection_id)) for update;
  if found and v_payment.channel<>'terminal' then raise exception using errcode='P4510',message='PAYMENT_METHOD_ALREADY_OPEN'; end if;
  if p_collection_id is not null then
    v_result:=public.reserve_quick_collection_payment_v1(p_actor_id,p_collection_id,p_account_id,p_livemode);
  else
    v_result:=public.reserve_quick_stripe_payment_v1(p_actor_id,p_operation_id,p_expected_version,p_amount,p_account_id,p_livemode);
  end if;
  if nullif(v_result->>'invoice_id','') is not null and v_result->>'status' in ('creating','open') then
    select * into strict v_doc from public.central_invoice_documents where id=(v_result->>'invoice_id')::uuid and user_id=(v_scope->>'user_id')::uuid for update;
    if v_doc.emitted_hash is distinct from v_result->>'invoice_hash'
      or v_doc.emitted_hash is distinct from ('sha256:'||pg_catalog.encode(extensions.digest(pg_catalog.convert_to(v_doc.emitted_snapshot::text,'UTF8'),'sha256'),'hex'))
      or jsonb_typeof(v_doc.emitted_snapshot->'taxSummary'->'total') is distinct from 'number'
      or round((v_doc.emitted_snapshot->'taxSummary'->>'total')::numeric*100)::integer is distinct from (v_result->>'amount')::integer then
      raise exception using errcode='P4510',message='TERMINAL_INVOICE_AMOUNT_CHANGED';
    end if;
  end if;
  update public.quick_stripe_payments set channel='terminal' where id=(v_result->>'id')::uuid returning * into v_payment;
  return to_jsonb(v_payment);
end $$;

create function public.read_quick_terminal_grant_v1(p_hash text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_grant public.quick_terminal_grants%rowtype; v_scope jsonb; v_payment public.quick_stripe_payments%rowtype;
begin
  if coalesce((select auth.role()),'')<>'service_role' then raise exception using errcode='42501',message='STRIPE_SERVICE_ONLY'; end if;
  select * into strict v_grant from public.quick_terminal_grants where token_hash=p_hash and expires_at>now();
  v_scope:=public.quick_invoicing_scope_v1(v_grant.actor_id);
  if v_grant.company_id is distinct from (v_scope->>'company_id')::uuid
    or not quick_terminal_private.session_active(v_grant.actor_id,v_grant.session_hash)
    or public.claim_cloud_device_session((v_scope->>'user_id')::uuid,v_grant.device_hash,v_grant.session_hash)<>'claimed' then
    raise exception using errcode='42501',message='TERMINAL_GRANT_REVOKED';
  end if;
  select * into strict v_payment from public.quick_stripe_payments where id=v_grant.payment_id
    and company_id=v_grant.company_id and channel='terminal';
  return to_jsonb(v_payment);
end $$;

create function public.bind_quick_terminal_intent_v1(p_payment_id uuid,p_intent_id text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_payment public.quick_stripe_payments%rowtype;
begin
  if coalesce((select auth.role()),'')<>'service_role' then raise exception using errcode='42501',message='STRIPE_SERVICE_ONLY'; end if;
  select * into strict v_payment from public.quick_stripe_payments where id=p_payment_id for update;
  if v_payment.channel<>'terminal' or p_intent_id !~ '^pi_[A-Za-z0-9]+$'
    or (v_payment.payment_intent_id is not null and v_payment.payment_intent_id<>p_intent_id) then
    raise exception using errcode='P4510',message='TERMINAL_INTENT_MISMATCH';
  end if;
  update public.quick_stripe_payments set payment_intent_id=p_intent_id,
    status=case when status='creating' then 'open' else status end where id=p_payment_id returning * into v_payment;
  return to_jsonb(v_payment);
end $$;

create function public.confirm_quick_terminal_payment_v1(p_payment_id uuid,p_account_id text,p_livemode boolean,
  p_amount integer,p_currency text,p_intent_id text,p_paid_at timestamptz,p_event_id text,p_review_reason text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_payment public.quick_stripe_payments%rowtype;
begin
  if coalesce((select auth.role()),'')<>'service_role' then raise exception using errcode='42501',message='STRIPE_SERVICE_ONLY'; end if;
  select * into strict v_payment from public.quick_stripe_payments where id=p_payment_id;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('central-business-owner:'||v_payment.user_id::text,0));
  select * into strict v_payment from public.quick_stripe_payments where id=p_payment_id for update;
  if v_payment.channel<>'terminal' or v_payment.stripe_account_id is distinct from p_account_id
    or v_payment.livemode is distinct from p_livemode or v_payment.amount is distinct from p_amount
    or v_payment.currency is distinct from p_currency or v_payment.payment_intent_id is distinct from p_intent_id
    or nullif(p_intent_id,'') is null or p_paid_at is null or nullif(p_event_id,'') is null then
    raise exception using errcode='P4510',message='TERMINAL_PAYMENT_MISMATCH';
  end if;
  if v_payment.paid_at is null then
    update public.quick_stripe_payments set paid_at=p_paid_at,last_event_id=p_event_id,
      status=case when coalesce(review_reason,p_review_reason) is null then 'paid' else 'review' end,
      review_reason=coalesce(review_reason,p_review_reason) where id=p_payment_id;
  elsif p_review_reason is not null then
    update public.quick_stripe_payments set status='review',review_reason=p_review_reason,last_event_id=p_event_id where id=p_payment_id;
  end if;
  return public.apply_quick_stripe_invoice_payment_v1(p_payment_id);
end $$;

revoke all on function public.reserve_quick_terminal_payment_v1(uuid,uuid,uuid,integer,integer,text,boolean),
  public.read_quick_terminal_grant_v1(text),public.bind_quick_terminal_intent_v1(uuid,text),
  public.confirm_quick_terminal_payment_v1(uuid,text,boolean,integer,text,text,timestamptz,text,text) from public,anon,authenticated;
grant execute on function public.reserve_quick_terminal_payment_v1(uuid,uuid,uuid,integer,integer,text,boolean),
  public.read_quick_terminal_grant_v1(text),public.bind_quick_terminal_intent_v1(uuid,text),
  public.confirm_quick_terminal_payment_v1(uuid,text,boolean,integer,text,text,timestamptz,text,text) to service_role;
commit;
