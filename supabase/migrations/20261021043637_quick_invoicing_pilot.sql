-- FACTU_QUICK_PILOT_V1: private enrollment, atomic authority adapter and durable
-- customer admission. No existing series, document or company is modified.
create table public.quick_invoicing_access (
  actor_user_id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.app_companies(id) on delete cascade,
  enabled boolean not null default false,
  created_at timestamptz not null default now()
);
create index quick_invoicing_access_company_idx on public.quick_invoicing_access(company_id);
create table public.quick_document_operations (
  operation_id uuid primary key,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.app_companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  intent_hash text not null check (intent_hash ~ '^[0-9a-f]{64}$'),
  kind text not null check (kind in ('factura', 'presupuesto')),
  entity_id text not null,
  invoice_id uuid,
  rpc_result jsonb not null,
  render_profile jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, entity_id)
);
create index quick_document_operations_actor_idx on public.quick_document_operations(actor_user_id, company_id);
create index quick_document_operations_company_idx on public.quick_document_operations(company_id);
-- A cancellation tombstone contains no document copy. It prevents a delayed
-- first request from committing after the user is allowed to edit again.
create table public.quick_cancelled_operations (
  operation_id uuid primary key,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.app_companies(id) on delete cascade,
  intent_hash text not null check (intent_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);
create index quick_cancelled_operations_actor_idx on public.quick_cancelled_operations(actor_user_id);
create index quick_cancelled_operations_company_idx on public.quick_cancelled_operations(company_id);
create table public.quick_customer_jobs (
  operation_id uuid primary key references public.quick_document_operations(operation_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_payload jsonb not null,
  device_id text not null,
  session_hash text not null,
  status text not null default 'pending' check (status in ('pending', 'done', 'review')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error_code text,
  completed_at timestamptz
);
create index quick_customer_jobs_pending_idx on public.quick_customer_jobs(next_attempt_at) where status = 'pending';
create index quick_customer_jobs_user_idx on public.quick_customer_jobs(user_id);
alter table public.quick_invoicing_access enable row level security;
alter table public.quick_document_operations enable row level security;
alter table public.quick_customer_jobs enable row level security;
alter table public.quick_cancelled_operations enable row level security;
revoke all on public.quick_invoicing_access, public.quick_document_operations, public.quick_customer_jobs, public.quick_cancelled_operations from public, anon, authenticated;
grant all on public.quick_invoicing_access, public.quick_document_operations, public.quick_customer_jobs, public.quick_cancelled_operations to service_role;

create function public.quick_invoicing_scope_v1(p_actor_id uuid)
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
  join public.app_company_members m on m.company_id = c.id and m.user_id = a.actor_user_id and m.status = 'active' and m.role = 'owner'
  join public.central_business_entities p on p.user_id = c.data_owner_id and p.entity_type = 'profile' and p.entity_id = 'profile' and not p.deleted
  where a.actor_user_id = p_actor_id and a.enabled;
  if v_scope is null then raise exception using errcode = '42501', message = 'QUICK_PILOT_UNAVAILABLE'; end if;
  return v_scope;
end $$;

create function public.read_quick_document_v1(p_actor_id uuid, p_operation_id uuid, p_intent_hash text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_scope jsonb; v_op public.quick_document_operations%rowtype; v_doc jsonb; v_version integer;
begin
  v_scope := public.quick_invoicing_scope_v1(p_actor_id);
  select * into v_op from public.quick_document_operations
    where operation_id = p_operation_id and actor_user_id = p_actor_id
      and company_id = (v_scope->>'company_id')::uuid;
  if not found then return null; end if;
  if p_intent_hash is not null and v_op.intent_hash <> p_intent_hash then
    raise exception using errcode = 'P4502', message = 'QUICK_INTENT_MISMATCH';
  end if;
  if v_op.kind = 'factura' then
    select current_payload->'document', current_version into v_doc, v_version
      from public.central_invoice_documents where id = v_op.invoice_id and user_id = v_op.user_id;
  else
    select current_payload, current_version into v_doc, v_version
      from public.central_business_entities where user_id = v_op.user_id and entity_type = 'quote'
        and entity_id = v_op.entity_id and not deleted;
  end if;
  if v_doc is null then raise exception using errcode = 'P4503', message = 'QUICK_DOCUMENT_REMOVED'; end if;
  return jsonb_build_object('operation_id', v_op.operation_id, 'kind', v_op.kind,
    'document', v_doc, 'render_profile', v_op.render_profile,
    'invoice_id', v_op.invoice_id, 'rpc_result', v_op.rpc_result,
    'document_version', v_version,
    'customer_pending', exists(select 1 from public.quick_customer_jobs where operation_id = v_op.operation_id and status <> 'done'));
end $$;

create function public.commit_quick_document_v1(
  p_actor_id uuid, p_operation_id uuid, p_intent_hash text, p_profile_version integer,
  p_kind text, p_args jsonb, p_render_profile jsonb, p_customer jsonb default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_scope jsonb; v_user_id uuid; v_replay jsonb; v_result jsonb; v_entity_id text; v_version integer;
begin
  v_scope := public.quick_invoicing_scope_v1(p_actor_id);
  v_user_id := (v_scope->>'user_id')::uuid;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('quick-operation:'||p_operation_id::text,0));
  -- Global operation identity cannot be hijacked by a different enrolled actor.
  if exists(select 1 from public.quick_document_operations where operation_id = p_operation_id and actor_user_id <> p_actor_id) then
    raise exception using errcode = '42501', message = 'QUICK_OPERATION_SCOPE';
  end if;
  v_replay := public.read_quick_document_v1(p_actor_id,p_operation_id,p_intent_hash);
  if v_replay is not null then return v_replay; end if;
  if exists(select 1 from public.quick_cancelled_operations where operation_id = p_operation_id) then
    raise exception using errcode = 'P4508', message = 'QUICK_OPERATION_CANCELLED';
  end if;
  if p_kind not in ('factura','presupuesto') or p_kind is null or coalesce(p_intent_hash,'') !~ '^[0-9a-f]{64}$'
    or (p_args->>'p_user_id')::uuid is distinct from v_user_id
    or p_render_profile is null then
    raise exception using errcode = 'P4504', message = 'QUICK_INVALID_COMMAND';
  end if;
  -- Keep the ordinary business lock order (owner, then entity/profile). Taking
  -- the profile lock first could deadlock a concurrent settings mutation.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('central-business-owner:'||v_user_id::text,0));
  -- Hold the profile row while issuing so concurrent configuration changes
  -- cannot combine one issuer/template with another numbering configuration.
  select current_version into v_version from public.central_business_entities
    where user_id = v_user_id and entity_type = 'profile' and entity_id = 'profile' and not deleted for share;
  if v_version is distinct from p_profile_version then
    raise exception using errcode = 'P4505', message = 'QUICK_PROFILE_CHANGED';
  end if;
  v_entity_id := 'quick-'||p_operation_id::text;
  if p_customer is not null and (p_customer->>'id' is distinct from v_entity_id or length(coalesce(p_customer->>'name','')) = 0) then
    raise exception using errcode = 'P4504', message = 'QUICK_INVALID_CUSTOMER';
  end if;
  if p_kind = 'factura' then
    if p_args->>'p_local_document_id' is distinct from v_entity_id or p_args->>'p_kind' <> 'invoice' then
      raise exception using errcode = 'P4504', message = 'QUICK_INVALID_COMMAND';
    end if;
    select to_jsonb(r) into v_result from public.issue_central_invoice_v1(
      v_user_id, p_args->>'p_device_id', p_args->>'p_session_hash', p_args->>'p_idempotency_key_hash', p_args->>'p_request_hash',
      'invoice', v_entity_id, (p_args->>'p_expected_version')::integer, p_args->>'p_draft_hash',
      p_args->>'p_environment', p_args->>'p_issuer_nif', p_args->>'p_series_code', (p_args->>'p_fiscal_year')::integer,
      (p_args->>'p_issued_at')::timestamptz, p_args->'p_document_payload', p_args->'p_emitted_snapshot', p_args->>'p_emitted_hash', null
    ) r;
  else
    if p_args->>'p_entity_id' is distinct from v_entity_id or p_args->>'p_entity_type' <> 'quote' then
      raise exception using errcode = 'P4504', message = 'QUICK_INVALID_COMMAND';
    end if;
    select to_jsonb(r) into v_result from public.create_central_business_document_v1(
      v_user_id, p_args->>'p_device_id', p_args->>'p_session_hash', p_args->>'p_idempotency_key_hash', p_args->>'p_request_hash',
      'quote', v_entity_id, p_args->>'p_number_template', (p_args->>'p_padding')::integer,
      (p_args->>'p_fiscal_year')::integer, p_args->'p_payload_without_number'
    ) r;
  end if;
  if v_result is null then raise exception using errcode = 'P4506', message = 'QUICK_COMMIT_UNCONFIRMED'; end if;
  insert into public.quick_document_operations(operation_id,actor_user_id,company_id,user_id,intent_hash,kind,entity_id,invoice_id,rpc_result,render_profile)
    values(p_operation_id,p_actor_id,(v_scope->>'company_id')::uuid,v_user_id,p_intent_hash,p_kind,v_entity_id,(v_result->>'document_id')::uuid,v_result,p_render_profile);
  if p_customer is not null then
    insert into public.quick_customer_jobs(operation_id,user_id,customer_payload,device_id,session_hash)
      values(p_operation_id,v_user_id,p_customer,p_args->>'p_device_id',p_args->>'p_session_hash');
  end if;
  return public.read_quick_document_v1(p_actor_id,p_operation_id,p_intent_hash);
end $$;

create function public.cancel_quick_operation_v1(p_actor_id uuid,p_operation_id uuid,p_intent_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_scope jsonb; v_receipt jsonb; v_cancel public.quick_cancelled_operations%rowtype;
begin
  v_scope := public.quick_invoicing_scope_v1(p_actor_id);
  if coalesce(p_intent_hash,'') !~ '^[0-9a-f]{64}$' then raise exception using errcode = 'P4504', message = 'QUICK_INVALID_COMMAND'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('quick-operation:'||p_operation_id::text,0));
  if exists(select 1 from public.quick_document_operations where operation_id = p_operation_id and actor_user_id <> p_actor_id) then
    raise exception using errcode = '42501',message = 'QUICK_OPERATION_SCOPE';
  end if;
  v_receipt := public.read_quick_document_v1(p_actor_id,p_operation_id,p_intent_hash);
  if v_receipt is not null then return jsonb_build_object('cancelled',false,'receipt',v_receipt); end if;
  insert into public.quick_cancelled_operations(operation_id,actor_user_id,company_id,intent_hash)
    values(p_operation_id,p_actor_id,(v_scope->>'company_id')::uuid,p_intent_hash)
    on conflict (operation_id) do nothing;
  select * into v_cancel from public.quick_cancelled_operations where operation_id = p_operation_id;
  if v_cancel.actor_user_id <> p_actor_id or v_cancel.intent_hash <> p_intent_hash or v_cancel.company_id <> (v_scope->>'company_id')::uuid then
    raise exception using errcode = '42501',message = 'QUICK_OPERATION_SCOPE';
  end if;
  return jsonb_build_object('cancelled',true);
end $$;

-- Small, tenant-scoped catalog projections. Never return purchase costs,
-- margins, product images or whole catalog/customer payloads to the phone.
create function public.search_quick_catalog_v1(p_actor_id uuid,p_kind text,p_query text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_scope jsonb; v_query text; v_rows jsonb;
begin
  v_scope := public.quick_invoicing_scope_v1(p_actor_id);
  v_query := regexp_replace(lower(translate(left(coalesce(p_query,''),100),'áéíóúüñ','aeiouun')),'[^a-z0-9]','','g');
  if length(v_query) < 2 then return '[]'::jsonb; end if;
  if p_kind not in ('customer','product') or p_kind is null then raise exception using errcode = 'P4504', message = 'QUICK_INVALID_CATALOG'; end if;
  select coalesce(jsonb_agg(result),'[]'::jsonb) into v_rows from (
    select case when p_kind = 'customer' then jsonb_build_object(
      'id',e.entity_id,'name',e.current_payload->>'name','nif',e.current_payload->>'nif',
      'address',e.current_payload->>'address','postalCode',e.current_payload->>'postalCode',
      'city',e.current_payload->>'city','email',e.current_payload->>'email','phone',e.current_payload->>'phone'
      ,'streetType',e.current_payload->>'streetType','addressExtra',e.current_payload->>'addressExtra'
    ) else jsonb_build_object('id',e.entity_id,'name',e.current_payload->>'name','sku',e.current_payload->>'sku',
      'description',coalesce(e.current_payload#>>'{sales,description}',e.current_payload->>'name'),
      'unit',coalesce(e.current_payload#>>'{sales,unit}',e.current_payload->>'unit','ud'),
      'unitPrice',e.current_payload#>'{sales,unitPrice}', 'ivaPercent',e.current_payload#>'{sales,ivaPercent}') end as result
    from public.central_business_entities e
    where e.user_id = (v_scope->>'user_id')::uuid and e.entity_type = p_kind and not e.deleted
      and (p_kind <> 'product' or (coalesce(e.current_payload->>'hidden','false') <> 'true'
        and coalesce(e.current_payload#>>'{sales,enabled}','true') <> 'false'))
      and position(v_query in regexp_replace(lower(translate(
        coalesce(e.current_payload->>'sku','')||' '||coalesce(e.current_payload->>'name','')||' '||
        case when p_kind = 'customer' then coalesce(e.current_payload->>'nif','') else coalesce(e.current_payload#>>'{sales,description}','') end,
        'áéíóúüñ','aeiouun')),'[^a-z0-9]','','g')) > 0
    order by lower(e.current_payload->>'name'),e.entity_id limit 15
  ) found;
  return v_rows;
end $$;

create function public.process_quick_customer_jobs_v1(p_limit integer default 10)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  j public.quick_customer_jobs%rowtype; v_customer public.central_business_entities%rowtype;
  v_nif text; v_name text; v_matches integer; v_payload jsonb; v_id text;
  v_hash text; v_request_hash text; v_processed integer := 0;
  v_claims text := current_setting('request.jwt.claims',true);
begin
  -- Cron is a trusted database session, never an authenticated browser role.
  if coalesce((select auth.role()),'') <> 'service_role' and session_user not in ('postgres','supabase_admin') then
    raise exception using errcode = '42501', message = 'QUICK_SERVICE_ONLY';
  end if;
  perform set_config('request.jwt.claims','{"role":"service_role"}',true);
  for j in select * from public.quick_customer_jobs where status = 'pending' and next_attempt_at <= now()
    order by next_attempt_at for update skip locked limit greatest(1,least(coalesce(p_limit,10),25))
  loop
    begin
      -- Same owner lock as ordinary mutations: serialize admission and avoid
      -- duplicate customers across two phones issuing for the same new NIF.
      perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('central-business-owner:'||j.user_id::text,0));
      v_nif := upper(regexp_replace(coalesce(j.customer_payload->>'nif',''),'[\s.-]','','g'));
      -- Keep word boundaries and all Unicode letters. Compact SKU search keys
      -- are intentionally NOT customer identities (Juan Carlos != Juancarlos).
      v_name := regexp_replace(lower(btrim(j.customer_payload->>'name')),'\s+',' ','g');
      select count(*) into v_matches from public.central_business_entities e
        where e.user_id = j.user_id and e.entity_type = 'customer' and not e.deleted and
          case when v_nif <> '' then upper(regexp_replace(coalesce(e.current_payload->>'nif',''),'[\s.-]','','g')) = v_nif
          else upper(regexp_replace(coalesce(e.current_payload->>'nif',''),'[\s.-]','','g')) = '' and regexp_replace(lower(btrim(e.current_payload->>'name')),'\s+',' ','g') = v_name end;
      if v_matches > 1 then
        update public.quick_customer_jobs set status = 'review',last_error_code = 'AMBIGUOUS_CUSTOMER',attempts = attempts + 1 where operation_id = j.operation_id;
        continue;
      end if;
      v_id := j.customer_payload->>'id';
      if v_matches = 1 then
        select * into v_customer from public.central_business_entities e
          where e.user_id = j.user_id and e.entity_type = 'customer' and not e.deleted and
            case when v_nif <> '' then upper(regexp_replace(coalesce(e.current_payload->>'nif',''),'[\s.-]','','g')) = v_nif
            else upper(regexp_replace(coalesce(e.current_payload->>'nif',''),'[\s.-]','','g')) = '' and regexp_replace(lower(btrim(e.current_payload->>'name')),'\s+',' ','g') = v_name end;
        -- An operational alias resolves the new document to the existing
        -- customer without changing either the frozen client or master fields.
        v_payload := v_customer.current_payload;
        if v_customer.entity_id <> v_id and not coalesce(v_payload->'mergedCustomerIds','[]'::jsonb) ? v_id then
          v_payload := jsonb_set(v_payload,'{mergedCustomerIds}',coalesce(v_payload->'mergedCustomerIds','[]'::jsonb)||jsonb_build_array(v_id));
          v_payload := jsonb_set(v_payload,'{updatedAt}',to_jsonb(to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')));
        end if;
        v_id := v_customer.entity_id;
      else
        v_customer := null;
        if exists(select 1 from public.central_business_entities where user_id = j.user_id and entity_type = 'customer' and entity_id = v_id) then
          raise exception using errcode = 'P4507',message = 'QUICK_CUSTOMER_ID_RESERVED';
        end if;
        v_payload := j.customer_payload;
      end if;
      v_hash := encode(extensions.digest(convert_to(public.central_business_stable_json_text_v1(v_payload),'UTF8'),'sha256'),'hex');
      v_request_hash := encode(extensions.digest(convert_to(j.operation_id::text||':'||v_hash,'UTF8'),'sha256'),'hex');
      perform public.mutate_central_business_entity_v1(j.user_id,j.device_id,j.session_hash,
        encode(extensions.digest(convert_to('quick-customer:'||j.operation_id::text,'UTF8'),'sha256'),'hex'),
        v_request_hash,'upsert','customer',v_id,coalesce(v_customer.current_version,0),v_payload,v_hash);
      update public.quick_customer_jobs set status = 'done',completed_at = now(),attempts = attempts + 1,last_error_code = null where operation_id = j.operation_id;
      v_processed := v_processed + 1;
    exception when others then
      update public.quick_customer_jobs set attempts = attempts + 1,
        status = case when attempts >= 7 then 'review' else 'pending' end,
        next_attempt_at = now() + interval '30 seconds' * least(120,power(2,least(attempts,7))),
        last_error_code = sqlstate where operation_id = j.operation_id;
    end;
  end loop;
  perform set_config('request.jwt.claims',coalesce(v_claims,''),true);
  return v_processed;
end $$;

revoke all on function public.quick_invoicing_scope_v1(uuid) from public,anon,authenticated;
revoke all on function public.read_quick_document_v1(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.commit_quick_document_v1(uuid,uuid,text,integer,text,jsonb,jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.search_quick_catalog_v1(uuid,text,text) from public,anon,authenticated;
revoke all on function public.process_quick_customer_jobs_v1(integer) from public,anon,authenticated;
revoke all on function public.cancel_quick_operation_v1(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.quick_invoicing_scope_v1(uuid),public.read_quick_document_v1(uuid,uuid,text),
  public.commit_quick_document_v1(uuid,uuid,text,integer,text,jsonb,jsonb,jsonb),public.search_quick_catalog_v1(uuid,text,text),
  public.process_quick_customer_jobs_v1(integer),public.cancel_quick_operation_v1(uuid,uuid,text) to service_role;

-- after(response) is the fast path; pg_cron is the independent durable backstop
-- when the browser closes or a function dies after the transaction commits.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('factu-quick-customer-admission-v1','* * * * *',
  'select public.process_quick_customer_jobs_v1(10)');
