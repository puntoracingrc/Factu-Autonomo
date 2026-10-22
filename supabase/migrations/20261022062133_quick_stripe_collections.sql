-- Private, additive collection ledger. No existing invoice is changed on install.
begin;
create table public.quick_stripe_payments (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.quick_document_operations(operation_id),
  company_id uuid not null references public.app_companies(id),
  user_id uuid not null references auth.users(id),
  invoice_id uuid not null references public.central_invoice_documents(id),
  invoice_hash text not null,
  invoice_number text not null,
  amount integer not null check (amount between 50 and 99999999),
  currency text not null default 'eur' check (currency = 'eur'),
  stripe_account_id text not null check (stripe_account_id like 'acct\_%' escape '\'),
  livemode boolean not null,
  status text not null default 'creating' check (status in ('creating','open','paid','expired','review')),
  checkout_session_id text unique,
  checkout_url text,
  payment_intent_id text unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '23 hours'),
  paid_at timestamptz,
  last_event_id text,
  review_reason text
);
create unique index quick_stripe_payments_active_idx on public.quick_stripe_payments(operation_id,livemode)
  where status <> 'expired';
create index quick_stripe_payments_company_idx on public.quick_stripe_payments(company_id);
create index quick_stripe_payments_user_idx on public.quick_stripe_payments(user_id);
create index quick_stripe_payments_invoice_idx on public.quick_stripe_payments(invoice_id);
create index quick_stripe_payments_operation_idx on public.quick_stripe_payments(operation_id);
alter table public.quick_stripe_payments enable row level security;
revoke all on public.quick_stripe_payments from public, anon, authenticated;
grant select, insert, update on public.quick_stripe_payments to service_role;

-- Invoker functions deliberately inherit only the server's existing privileges.
create function public.reserve_quick_stripe_payment_v1(
  p_actor_id uuid, p_operation_id uuid, p_expected_version integer,
  p_amount integer, p_account_id text, p_livemode boolean
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_scope jsonb; v_op public.quick_document_operations%rowtype;
  v_doc public.central_invoice_documents%rowtype; v_payment public.quick_stripe_payments%rowtype;
begin
  if coalesce((select auth.role()),'') <> 'service_role' then raise exception using errcode='42501',message='STRIPE_SERVICE_ONLY'; end if;
  v_scope := public.quick_invoicing_scope_v1(p_actor_id);
  select * into v_op from public.quick_document_operations where operation_id=p_operation_id
    and company_id=(v_scope->>'company_id')::uuid and actor_user_id=p_actor_id and kind='factura';
  if not found then raise exception using errcode='42501',message='STRIPE_OPERATION_SCOPE'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('central-business-owner:'||v_op.user_id::text,0));
  select * into v_doc from public.central_invoice_documents where id=v_op.invoice_id and user_id=v_op.user_id for update;
  if not found or v_doc.lifecycle_status <> 'issued' or v_doc.kind <> 'invoice'
    or v_doc.emitted_hash is null or v_doc.current_payload->'document' is null then
    raise exception using errcode='P4510',message='STRIPE_INVOICE_UNAVAILABLE';
  end if;
  select * into v_payment from public.quick_stripe_payments where operation_id=p_operation_id and livemode=p_livemode and status<>'expired' for update;
  if found then
    if v_payment.stripe_account_id is distinct from p_account_id or v_payment.livemode is distinct from p_livemode then
      raise exception using errcode='P4510',message='STRIPE_ACCOUNT_CHANGED';
    end if;
    if v_payment.status in ('paid','review') then return to_jsonb(v_payment); end if;
    if v_payment.invoice_hash is distinct from v_doc.emitted_hash or v_payment.amount is distinct from p_amount then
      raise exception using errcode='P4510',message='STRIPE_INVOICE_CHANGED';
    end if;
    return to_jsonb(v_payment);
  end if;
  if v_doc.current_version is distinct from p_expected_version
    or v_doc.current_payload->'document'->>'paymentStatus' = 'paid'
    or v_doc.current_payload->'document'->>'status' in ('pagado','anulada','rectificada')
    or nullif(v_doc.current_payload->'document'->>'receiptDocumentId','') is not null then
    raise exception using errcode='P4510',message='STRIPE_INVOICE_CHANGED';
  end if;
  insert into public.quick_stripe_payments(operation_id,company_id,user_id,invoice_id,invoice_hash,invoice_number,amount,stripe_account_id,livemode)
    values(p_operation_id,v_op.company_id,v_op.user_id,v_op.invoice_id,v_doc.emitted_hash,
      v_doc.current_payload->'document'->>'number',p_amount,p_account_id,p_livemode) returning * into v_payment;
  return to_jsonb(v_payment);
end $$;

create function public.bind_quick_stripe_session_v1(p_payment_id uuid,p_session_id text,p_url text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_payment public.quick_stripe_payments%rowtype;
begin
  if coalesce((select auth.role()),'') <> 'service_role' then raise exception using errcode='42501',message='STRIPE_SERVICE_ONLY'; end if;
  select * into strict v_payment from public.quick_stripe_payments where id=p_payment_id for update;
  if nullif(p_session_id,'') is null or p_url !~ '^https://checkout[.]stripe[.]com/'
    or (v_payment.checkout_session_id is not null and v_payment.checkout_session_id<>p_session_id) then
    raise exception using errcode='P4510',message='STRIPE_SESSION_MISMATCH';
  end if;
  update public.quick_stripe_payments set checkout_session_id=p_session_id,checkout_url=p_url,
    status=case when status='creating' then 'open' else status end where id=p_payment_id returning * into v_payment;
  return to_jsonb(v_payment);
end $$;

create function public.confirm_quick_stripe_payment_v1(
  p_payment_id uuid,p_session_id text,p_account_id text,p_livemode boolean,
  p_amount integer,p_currency text,p_intent_id text,p_paid_at timestamptz,p_event_id text,p_review_reason text default null
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  v_payment public.quick_stripe_payments%rowtype; v_doc public.central_invoice_documents%rowtype;
  v_next jsonb; v_key text; v_identity uuid;
begin
  if coalesce((select auth.role()),'') <> 'service_role' then raise exception using errcode='42501',message='STRIPE_SERVICE_ONLY'; end if;
  select * into strict v_payment from public.quick_stripe_payments where id=p_payment_id;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('central-business-owner:'||v_payment.user_id::text,0));
  select * into strict v_doc from public.central_invoice_documents where id=v_payment.invoice_id and user_id=v_payment.user_id for update;
  select * into strict v_payment from public.quick_stripe_payments where id=p_payment_id for update;
  if v_payment.stripe_account_id is distinct from p_account_id or v_payment.livemode is distinct from p_livemode
    or v_payment.amount is distinct from p_amount or v_payment.currency is distinct from p_currency
    or nullif(p_intent_id,'') is null or nullif(p_session_id,'') is null or p_paid_at is null or nullif(p_event_id,'') is null
    or (v_payment.checkout_session_id is not null and v_payment.checkout_session_id<>p_session_id)
    or (v_payment.payment_intent_id is not null and v_payment.payment_intent_id<>p_intent_id) then
    raise exception using errcode='P4510',message='STRIPE_PAYMENT_MISMATCH';
  end if;
  if v_payment.paid_at is not null then
    if p_review_reason is not null then
      update public.quick_stripe_payments set status='review',review_reason=p_review_reason,last_event_id=p_event_id
        where id=p_payment_id returning * into v_payment;
    end if;
    return to_jsonb(v_payment);
  end if;
  update public.quick_stripe_payments set checkout_session_id=p_session_id,payment_intent_id=p_intent_id,
    paid_at=p_paid_at,last_event_id=p_event_id where id=p_payment_id;
  -- Test Stripe money is never a payment of a real Factu invoice. Test and live
  -- ledgers are separate so a rehearsal cannot consume the live checkout slot.
  if not v_payment.livemode then
    update public.quick_stripe_payments set status=case when p_review_reason is null then 'paid' else 'review' end,
      review_reason=p_review_reason where id=p_payment_id returning * into v_payment;
    return to_jsonb(v_payment);
  end if;
  -- Money received against a removed/edited/already-paid invoice is retained
  -- as evidence for review. Never overwrite a newer fiscal or collection state.
  if p_review_reason is not null or v_doc.lifecycle_status <> 'issued' or v_doc.emitted_hash is distinct from v_payment.invoice_hash
    or v_doc.current_payload->'document'->>'paymentStatus'='paid'
    or v_doc.current_payload->'document'->>'status' in ('pagado','anulada','rectificada') then
    update public.quick_stripe_payments set status='review',review_reason=coalesce(p_review_reason,'INVOICE_CHANGED_AFTER_CHECKOUT')
      where id=p_payment_id returning * into v_payment;
    return to_jsonb(v_payment);
  end if;
  select id into strict v_identity from public.central_invoice_identities where document_id=v_doc.id and user_id=v_payment.user_id;
  v_next := jsonb_set(v_doc.current_payload,'{document}',(v_doc.current_payload->'document') ||
    jsonb_build_object('status','pagado','paymentStatus','paid','paidAt',p_paid_at));
  v_key := pg_catalog.encode(extensions.digest('quick-stripe:'||p_intent_id,'sha256'),'hex');
  perform public.update_central_invoice_collection_v1(v_payment.user_id,'stripe-checkout',v_key,v_key,v_key,
    v_doc.id,v_identity,v_doc.current_version,'pagado','paid',p_paid_at,v_next);
  update public.quick_stripe_payments set status='paid' where id=p_payment_id returning * into v_payment;
  return to_jsonb(v_payment);
end $$;

revoke all on function public.reserve_quick_stripe_payment_v1(uuid,uuid,integer,integer,text,boolean),
  public.bind_quick_stripe_session_v1(uuid,text,text),
  public.confirm_quick_stripe_payment_v1(uuid,text,text,boolean,integer,text,text,timestamptz,text,text) from public,anon,authenticated;
grant execute on function public.reserve_quick_stripe_payment_v1(uuid,uuid,integer,integer,text,boolean),
  public.bind_quick_stripe_session_v1(uuid,text,text),
  public.confirm_quick_stripe_payment_v1(uuid,text,text,boolean,integer,text,text,timestamptz,text,text) to service_role;
commit;
