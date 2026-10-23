begin;
-- Payment requests are operational records, never invoices or fiscal numbers.
create table public.quick_payment_requests (
  id uuid primary key,
  actor_user_id uuid not null references auth.users(id),
  company_id uuid not null references public.app_companies(id),
  user_id uuid not null references auth.users(id),
  amount integer not null check (amount between 50 and 99999999),
  description text not null check (length(description) between 1 and 500),
  customer_name text not null default '' check (length(customer_name) <= 200),
  created_at timestamptz not null default now(),
  -- This technical command ID can precede the actual invoice operation.
  invoice_operation_id uuid unique,
  invoice_id uuid references public.central_invoice_documents(id),
  invoice_number text,
  invoice_local_id text,
  linked_at timestamptz
);
create index quick_payment_requests_scope_idx on public.quick_payment_requests(company_id,actor_user_id,created_at desc,id desc);
create index quick_payment_requests_actor_idx on public.quick_payment_requests(actor_user_id);
create index quick_payment_requests_user_idx on public.quick_payment_requests(user_id);
create unique index quick_payment_requests_invoice_idx on public.quick_payment_requests(invoice_id) where invoice_id is not null;
alter table public.quick_payment_requests enable row level security;
revoke all on public.quick_payment_requests from public, anon, authenticated;
grant select, insert, update on public.quick_payment_requests to service_role;

alter table public.quick_stripe_payments
  alter column operation_id drop not null,
  alter column invoice_id drop not null,
  alter column invoice_hash drop not null,
  alter column invoice_number drop not null,
  add column collection_id uuid references public.quick_payment_requests(id),
  add column invoice_applied_at timestamptz,
  add constraint quick_stripe_payment_origin check ((operation_id is not null) <> (collection_id is not null));
create unique index quick_stripe_payments_active_collection_idx on public.quick_stripe_payments(collection_id,livemode) where status <> 'expired';
create index quick_stripe_payments_collection_idx on public.quick_stripe_payments(collection_id);
create unique index quick_stripe_payments_active_invoice_idx on public.quick_stripe_payments(invoice_id,livemode) where status <> 'expired';
-- Preserve confirmations from the previous contract; no invoice is rewritten.
update public.quick_stripe_payments set invoice_applied_at=paid_at where livemode and status='paid' and invoice_id is not null;

create function public.create_quick_payment_request_v1(p_actor_id uuid,p_id uuid,p_amount integer,p_description text,p_customer_name text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_scope jsonb; v_request public.quick_payment_requests%rowtype;
begin
  if coalesce((select auth.role()),'')<>'service_role' then raise exception using errcode='42501',message='STRIPE_SERVICE_ONLY'; end if;
  v_scope:=public.quick_invoicing_scope_v1(p_actor_id);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('central-business-owner:'||(v_scope->>'user_id'),0));
  select * into v_request from public.quick_payment_requests where id=p_id for update;
  if found then
    if v_request.actor_user_id<>p_actor_id or v_request.company_id<>(v_scope->>'company_id')::uuid
      or v_request.amount is distinct from p_amount or v_request.description is distinct from p_description
      or v_request.customer_name is distinct from p_customer_name then
      raise exception using errcode='P4510',message='COLLECTION_INTENT_MISMATCH';
    end if;
    return to_jsonb(v_request);
  end if;
  insert into public.quick_payment_requests(id,actor_user_id,company_id,user_id,amount,description,customer_name)
    values(p_id,p_actor_id,(v_scope->>'company_id')::uuid,(v_scope->>'user_id')::uuid,p_amount,p_description,p_customer_name)
    returning * into v_request;
  return to_jsonb(v_request);
end $$;

create function public.prepare_quick_collection_invoice_v1(p_actor_id uuid,p_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_scope jsonb; v_request public.quick_payment_requests%rowtype;
begin
  if coalesce((select auth.role()),'')<>'service_role' then raise exception using errcode='42501',message='STRIPE_SERVICE_ONLY'; end if;
  v_scope:=public.quick_invoicing_scope_v1(p_actor_id);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('central-business-owner:'||(v_scope->>'user_id'),0));
  select * into strict v_request from public.quick_payment_requests where id=p_id and actor_user_id=p_actor_id
    and company_id=(v_scope->>'company_id')::uuid for update;
  if v_request.invoice_operation_id is null and v_request.invoice_id is null then
    update public.quick_payment_requests set invoice_operation_id=gen_random_uuid() where id=p_id returning * into v_request;
  end if;
  return to_jsonb(v_request);
end $$;

-- Common atomic application for payment-before-invoice and invoice-before-payment.
create function public.apply_quick_stripe_invoice_payment_v1(p_payment_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_payment public.quick_stripe_payments%rowtype; v_doc public.central_invoice_documents%rowtype;
  v_identity uuid; v_next jsonb; v_key text;
begin
  if coalesce((select auth.role()),'')<>'service_role' then raise exception using errcode='42501',message='STRIPE_SERVICE_ONLY'; end if;
  select * into strict v_payment from public.quick_stripe_payments where id=p_payment_id;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('central-business-owner:'||v_payment.user_id::text,0));
  if v_payment.invoice_id is not null then
    select * into strict v_doc from public.central_invoice_documents where id=v_payment.invoice_id and user_id=v_payment.user_id for update;
  end if;
  select * into strict v_payment from public.quick_stripe_payments where id=p_payment_id for update;
  if v_payment.invoice_id is null or not v_payment.livemode or v_payment.status<>'paid'
    or v_payment.paid_at is null or v_payment.invoice_applied_at is not null then return to_jsonb(v_payment); end if;
  if v_doc.lifecycle_status<>'issued' or v_doc.emitted_hash is distinct from v_payment.invoice_hash
    or v_doc.current_payload->'document'->>'paymentStatus'='paid'
    or v_doc.current_payload->'document'->>'status' in ('pagado','anulada','rectificada')
    or nullif(v_doc.current_payload->'document'->>'receiptDocumentId','') is not null then
    update public.quick_stripe_payments set status='review',review_reason='INVOICE_CHANGED_AFTER_CHECKOUT'
      where id=p_payment_id returning * into v_payment;
    return to_jsonb(v_payment);
  end if;
  select id into strict v_identity from public.central_invoice_identities where document_id=v_doc.id and user_id=v_payment.user_id;
  v_next:=jsonb_set(v_doc.current_payload,'{document}',(v_doc.current_payload->'document') ||
    jsonb_build_object('status','pagado','paymentStatus','paid','paidAt',v_payment.paid_at));
  v_key:=pg_catalog.encode(extensions.digest('quick-stripe:'||v_payment.payment_intent_id,'sha256'),'hex');
  perform public.update_central_invoice_collection_v1(v_payment.user_id,'stripe-checkout',v_key,v_key,v_key,
    v_doc.id,v_identity,v_doc.current_version,'pagado','paid',v_payment.paid_at,v_next);
  update public.quick_stripe_payments set invoice_applied_at=now() where id=p_payment_id returning * into v_payment;
  return to_jsonb(v_payment);
end $$;

create or replace function public.confirm_quick_stripe_payment_v1(
  p_payment_id uuid,p_session_id text,p_account_id text,p_livemode boolean,
  p_amount integer,p_currency text,p_intent_id text,p_paid_at timestamptz,p_event_id text,p_review_reason text default null
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_payment public.quick_stripe_payments%rowtype;
begin
  if coalesce((select auth.role()),'')<>'service_role' then raise exception using errcode='42501',message='STRIPE_SERVICE_ONLY'; end if;
  select * into strict v_payment from public.quick_stripe_payments where id=p_payment_id;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('central-business-owner:'||v_payment.user_id::text,0));
  select * into strict v_payment from public.quick_stripe_payments where id=p_payment_id for update;
  if v_payment.stripe_account_id is distinct from p_account_id or v_payment.livemode is distinct from p_livemode
    or v_payment.amount is distinct from p_amount or v_payment.currency is distinct from p_currency
    or nullif(p_intent_id,'') is null or nullif(p_session_id,'') is null or p_paid_at is null or nullif(p_event_id,'') is null
    or (v_payment.checkout_session_id is not null and v_payment.checkout_session_id<>p_session_id)
    or (v_payment.payment_intent_id is not null and v_payment.payment_intent_id<>p_intent_id) then
    raise exception using errcode='P4510',message='STRIPE_PAYMENT_MISMATCH';
  end if;
  if v_payment.paid_at is null then
    update public.quick_stripe_payments set checkout_session_id=p_session_id,payment_intent_id=p_intent_id,
      paid_at=p_paid_at,last_event_id=p_event_id,status=case when p_review_reason is null and review_reason is null then 'paid' else 'review' end,
      review_reason=coalesce(review_reason,p_review_reason) where id=p_payment_id;
  elsif p_review_reason is not null then
    update public.quick_stripe_payments set status='review',review_reason=p_review_reason,last_event_id=p_event_id where id=p_payment_id;
  end if;
  return public.apply_quick_stripe_invoice_payment_v1(p_payment_id);
end $$;

create function public.attach_quick_collection_to_invoice_v1(p_actor_id uuid,p_id uuid,p_invoice_id uuid,p_expected_version integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_scope jsonb; v_request public.quick_payment_requests%rowtype; v_op public.quick_document_operations%rowtype;
  v_doc public.central_invoice_documents%rowtype; v_payment public.quick_stripe_payments%rowtype;
begin
  if coalesce((select auth.role()),'')<>'service_role' then raise exception using errcode='42501',message='STRIPE_SERVICE_ONLY'; end if;
  v_scope:=public.quick_invoicing_scope_v1(p_actor_id);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('central-business-owner:'||(v_scope->>'user_id'),0));
  select * into strict v_request from public.quick_payment_requests where id=p_id and actor_user_id=p_actor_id
    and company_id=(v_scope->>'company_id')::uuid for update;
  if v_request.linked_at is not null then
    if v_request.invoice_id is distinct from p_invoice_id then raise exception using errcode='P4510',message='COLLECTION_ALREADY_LINKED'; end if;
    return to_jsonb(v_request);
  end if;
  if v_request.invoice_operation_id is not null then
    select * into strict v_op from public.quick_document_operations where operation_id=v_request.invoice_operation_id and actor_user_id=p_actor_id
      and company_id=v_request.company_id and kind='factura';
    if v_op.invoice_id is distinct from p_invoice_id then raise exception using errcode='P4510',message='COLLECTION_INVOICE_MISMATCH'; end if;
  end if;
  select * into strict v_doc from public.central_invoice_documents where id=p_invoice_id and user_id=v_request.user_id for update;
  if v_doc.kind<>'invoice' or v_doc.lifecycle_status<>'issued' or v_doc.current_version is distinct from p_expected_version
    or v_doc.current_payload->'document'->>'type'<>'factura' or v_doc.emitted_hash is null
    or v_doc.current_payload->'document'->>'paymentStatus'='paid'
    or v_doc.current_payload->'document'->>'status' in ('pagado','anulada','rectificada')
    or nullif(v_doc.current_payload->'document'->>'receiptDocumentId','') is not null
    or nullif(v_doc.current_payload->'document'->>'rectifiedById','') is not null
    or v_doc.current_payload->'document'->'legacyImportAttestation' is not null
    or v_doc.current_payload->'document'->'legacyImportProvenance' is not null
    or v_doc.emitted_hash is distinct from ('sha256:'||pg_catalog.encode(extensions.digest(pg_catalog.convert_to(v_doc.emitted_snapshot::text,'UTF8'),'sha256'),'hex'))
    or jsonb_typeof(v_doc.emitted_snapshot->'taxSummary'->'total') is distinct from 'number'
    or round((v_doc.emitted_snapshot->'taxSummary'->>'total')::numeric*100)::integer is distinct from v_request.amount then
    raise exception using errcode='P4510',message='COLLECTION_INVOICE_MISMATCH';
  end if;
  -- An invoice cannot acquire two active checkouts, including across both flows.
  if exists(select 1 from public.quick_stripe_payments where invoice_id=v_doc.id and status<>'expired' and collection_id is distinct from p_id) then
    raise exception using errcode='P4510',message='COLLECTION_INVOICE_ALREADY_HAS_PAYMENT';
  end if;
  for v_payment in select * from public.quick_stripe_payments where collection_id=p_id and status<>'expired' for update loop
    update public.quick_stripe_payments set invoice_id=v_doc.id,invoice_hash=v_doc.emitted_hash,
      invoice_number=v_doc.current_payload->'document'->>'number' where id=v_payment.id;
    perform public.apply_quick_stripe_invoice_payment_v1(v_payment.id);
  end loop;
  update public.quick_payment_requests set linked_at=now(),invoice_id=v_doc.id,invoice_number=v_doc.current_payload->'document'->>'number',
    invoice_local_id=v_doc.current_payload->'document'->>'id' where id=p_id returning * into v_request;
  return to_jsonb(v_request);
end $$;

create function public.attach_quick_collection_invoice_v1(p_actor_id uuid,p_id uuid,p_operation_id uuid,p_expected_version integer,p_amount integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_scope jsonb; v_request public.quick_payment_requests%rowtype; v_op public.quick_document_operations%rowtype;
begin
  if coalesce((select auth.role()),'')<>'service_role' then raise exception using errcode='42501',message='STRIPE_SERVICE_ONLY'; end if;
  v_scope:=public.quick_invoicing_scope_v1(p_actor_id);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('central-business-owner:'||(v_scope->>'user_id'),0));
  select * into strict v_request from public.quick_payment_requests where id=p_id and actor_user_id=p_actor_id and company_id=(v_scope->>'company_id')::uuid for update;
  if v_request.invoice_operation_id is distinct from p_operation_id or v_request.amount is distinct from p_amount then
    raise exception using errcode='P4510',message='COLLECTION_INVOICE_MISMATCH';
  end if;
  select * into strict v_op from public.quick_document_operations where operation_id=p_operation_id and actor_user_id=p_actor_id and company_id=v_request.company_id;
  return public.attach_quick_collection_to_invoice_v1(p_actor_id,p_id,v_op.invoice_id,p_expected_version);
end $$;

create function public.reserve_quick_collection_payment_v1(p_actor_id uuid,p_id uuid,p_account_id text,p_livemode boolean)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_scope jsonb; v_request public.quick_payment_requests%rowtype; v_payment public.quick_stripe_payments%rowtype;
  v_op public.quick_document_operations%rowtype; v_doc public.central_invoice_documents%rowtype;
begin
  if coalesce((select auth.role()),'')<>'service_role' then raise exception using errcode='42501',message='STRIPE_SERVICE_ONLY'; end if;
  v_scope:=public.quick_invoicing_scope_v1(p_actor_id);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('central-business-owner:'||(v_scope->>'user_id'),0));
  select * into strict v_request from public.quick_payment_requests where id=p_id and actor_user_id=p_actor_id
    and company_id=(v_scope->>'company_id')::uuid for update;
  select * into v_payment from public.quick_stripe_payments where collection_id=p_id and livemode=p_livemode and status<>'expired' for update;
  if found then
    if v_payment.stripe_account_id is distinct from p_account_id then raise exception using errcode='P4510',message='STRIPE_ACCOUNT_CHANGED'; end if;
    return to_jsonb(v_payment);
  end if;
  if v_request.linked_at is not null then
    select * into strict v_doc from public.central_invoice_documents where id=v_request.invoice_id and user_id=v_request.user_id for update;
    if v_doc.lifecycle_status<>'issued' or v_doc.current_payload->'document'->>'paymentStatus'='paid'
      or v_doc.current_payload->'document'->>'status' in ('pagado','anulada','rectificada') then
      raise exception using errcode='P4510',message='COLLECTION_INVOICE_NOT_COLLECTIBLE';
    end if;
  end if;
  insert into public.quick_stripe_payments(collection_id,company_id,user_id,invoice_id,invoice_hash,invoice_number,amount,stripe_account_id,livemode)
    values(p_id,v_request.company_id,v_request.user_id,v_doc.id,v_doc.emitted_hash,v_doc.current_payload->'document'->>'number',v_request.amount,p_account_id,p_livemode)
    returning * into v_payment;
  return to_jsonb(v_payment);
end $$;

revoke all on function public.create_quick_payment_request_v1(uuid,uuid,integer,text,text),
  public.prepare_quick_collection_invoice_v1(uuid,uuid),public.apply_quick_stripe_invoice_payment_v1(uuid),
  public.attach_quick_collection_invoice_v1(uuid,uuid,uuid,integer,integer),public.reserve_quick_collection_payment_v1(uuid,uuid,text,boolean)
  ,public.attach_quick_collection_to_invoice_v1(uuid,uuid,uuid,integer)
  from public,anon,authenticated;
grant execute on function public.create_quick_payment_request_v1(uuid,uuid,integer,text,text),
  public.prepare_quick_collection_invoice_v1(uuid,uuid),public.apply_quick_stripe_invoice_payment_v1(uuid),
  public.attach_quick_collection_invoice_v1(uuid,uuid,uuid,integer,integer),public.reserve_quick_collection_payment_v1(uuid,uuid,text,boolean)
  ,public.attach_quick_collection_to_invoice_v1(uuid,uuid,uuid,integer)
  to service_role;
commit;
