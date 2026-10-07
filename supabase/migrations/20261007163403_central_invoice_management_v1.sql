-- CENTRAL_INVOICE_MANAGEMENT_V1 / ADR-0010 V5. Explicit owner-approved
-- correction/deletion, CAS and idempotency, no before-payload archive.
begin;

alter table public.central_invoice_identities add column released_at timestamptz;
alter table public.central_invoice_documents add column content_revision integer not null default 0;
drop index public.central_invoice_identities_scope_sequence_uidx;
drop index public.central_invoice_identities_scope_number_uidx;
create unique index central_invoice_identities_scope_sequence_uidx
  on public.central_invoice_identities
  (user_id, environment, issuer_nif, series_code, fiscal_year, sequence)
  where released_at is null;
create unique index central_invoice_identities_scope_number_uidx
  on public.central_invoice_identities
  (user_id, environment, issuer_nif, series_code, fiscal_year, full_number)
  where released_at is null;

alter table public.central_invoice_document_versions
  drop constraint central_invoice_document_versions_change_kind_v1,
  add constraint central_invoice_document_versions_change_kind_v1 check (change_kind in (
    'draft_created', 'draft_updated', 'issue_committed', 'rectification_committed',
    'repair_recorded', 'collection_status_updated', 'quote_relationship_updated',
    'invoice_updated', 'invoice_deleted', 'rejected'
  ));
alter table public.central_invoice_outbox
  drop constraint central_invoice_outbox_event_type_v1,
  add constraint central_invoice_outbox_event_type_v1 check (event_type in (
    'invoice_issued', 'rectification_issued', 'document_repaired',
    'invoice_collection_updated', 'invoice_relationship_updated',
    'invoice_updated', 'invoice_deleted'
  ));

create function public.manage_central_invoice_v1(
  p_user_id uuid, p_device_id text, p_session_hash text,
  p_idempotency_key_hash text, p_request_hash text,
  p_document_id uuid, p_identity_id uuid, p_expected_version integer,
  p_action text, p_document_payload jsonb, p_emitted_snapshot jsonb
)
returns table (
  result_status text, document_id uuid, identity_id uuid,
  outbox_event_id uuid, full_number text, sequence integer, document_version integer
)
language plpgsql security definer set search_path = '' as $$
declare
  v_doc public.central_invoice_documents%rowtype;
  v_identity public.central_invoice_identities%rowtype;
  v_event public.central_invoice_outbox%rowtype;
  v_old jsonb;
  v_next jsonb;
  v_payload jsonb;
  v_hash text;
  v_key text := 'central-management:' || p_idempotency_key_hash;
  v_version integer;
  v_type text;
begin
  if auth.role() <> 'service_role' then raise exception 'service_role required'; end if;
  if p_user_id is null or p_document_id is null or p_identity_id is null
    or coalesce(p_device_id, '') = '' or coalesce(p_session_hash, '') = ''
    or coalesce(p_idempotency_key_hash, '') = '' or coalesce(p_request_hash, '') = ''
    or p_expected_version is null or p_expected_version < 1
    or coalesce(p_action, '') not in ('update', 'delete') then
    raise exception 'invalid invoice management command';
  end if;
  -- Same owner -> document -> series order as operational numbered documents.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'central-business-owner:' || p_user_id::text, 0));
  select * into v_doc from public.central_invoice_documents
    where id = p_document_id and user_id = p_user_id for update;
  if not found then raise exception using errcode = 'P4104', message = 'invoice not found'; end if;
  select i.* into v_identity from public.central_invoice_identities i
    where i.id = p_identity_id and i.document_id = v_doc.id and i.user_id = p_user_id;
  if not found or v_doc.identity_id <> p_identity_id then
    raise exception 'invoice identity mismatch';
  end if;
  select * into v_event from public.central_invoice_outbox
    where user_id = p_user_id and idempotency_key = v_key;
  if found then
    if v_event.document_id <> p_document_id or v_event.identity_id <> p_identity_id
      or v_event.safe_summary ->> 'requestHash' is distinct from p_request_hash then
      raise exception using errcode = 'P4102', message = 'idempotency conflict';
    end if;
    return query select 'replayed'::text, v_doc.id, v_identity.id, v_event.id,
      v_identity.full_number, v_identity.sequence, v_doc.current_version;
    return;
  end if;
  if v_doc.current_version <> p_expected_version then
    raise exception using errcode = 'P4103', message = 'invoice version conflict';
  end if;
  v_old := coalesce(v_doc.current_payload -> 'document', v_doc.current_payload);
  if v_doc.kind <> 'invoice' or v_doc.lifecycle_status <> 'issued' or v_identity.released_at is not null
    or v_old ? 'rectification' and v_old -> 'rectification' <> 'null'::jsonb
    or coalesce(v_old ->> 'rectifiedById', '') <> ''
    or v_old ? 'legacyImportAttestation' or v_old ? 'appIssuedRecoveryAttestation'
    or v_old #>> '{verifactu,environment}' = 'production'
    or v_old #>> '{verifactu,status}' = 'registered'
    or exists (select 1 from public.central_invoice_identities r
      where r.user_id = p_user_id and r.rectifies_identity_id = v_identity.id) then
    raise exception 'invoice cannot be managed through ordinary correction';
  end if;
  if exists (select 1 from public.central_business_entities e
    where e.user_id = p_user_id and e.entity_type = 'receipt' and not e.deleted
      and e.current_payload ->> 'sourceDocumentId' = v_doc.local_document_id) then
    raise exception using errcode = 'P4141', message = 'delete linked receipt first';
  end if;
  v_version := v_doc.current_version + 1;
  v_type := case when p_action = 'delete' then 'invoice_deleted' else 'invoice_updated' end;
  if p_action = 'update' then
    v_next := p_document_payload -> 'document';
    if v_next is null or p_emitted_snapshot is null
      or v_next ->> 'id' is distinct from v_doc.local_document_id
      or v_next ->> 'number' is distinct from v_identity.full_number
      or v_next ->> 'type' is distinct from 'factura'
      or v_next ->> 'status' is distinct from v_old ->> 'status'
      or v_next ->> 'createdAt' is distinct from v_old ->> 'createdAt'
      or v_next -> 'issuer' is distinct from v_doc.emitted_snapshot -> 'issuer'
      or v_next -> 'documentSnapshot' is distinct from p_emitted_snapshot
      or p_emitted_snapshot ->> 'number' is distinct from v_identity.full_number
      or p_emitted_snapshot -> 'issuer' is distinct from v_doc.emitted_snapshot -> 'issuer'
      or substring(v_next ->> 'date', 1, 4) is distinct from v_identity.fiscal_year::text
      or (v_next ->> 'issuedAt')::timestamptz is distinct from coalesce((v_old ->> 'issuedAt')::timestamptz, v_identity.issued_at)
      or v_next -> 'paymentStatus' is distinct from v_old -> 'paymentStatus'
      or v_next -> 'paidAt' is distinct from v_old -> 'paidAt'
      or v_next -> 'sourceQuoteDocumentId' is distinct from v_old -> 'sourceQuoteDocumentId'
      or v_next ? 'verifactu' then
      raise exception 'invalid amended invoice identity or preserved fields';
    end if;
    v_payload := p_document_payload || jsonb_build_object('centralAmendmentVersion', 1);
  else
    -- Only identifiers/version remain; there is no hidden document/PDF copy.
    v_payload := jsonb_build_object('deleted', true, 'localDocumentId', v_doc.local_document_id);
    perform 1 from public.central_invoice_series_state s where s.user_id = p_user_id
      and s.environment = v_identity.environment and s.issuer_nif = v_identity.issuer_nif
      and s.series_code = v_identity.series_code and s.fiscal_year = v_identity.fiscal_year for update;
    if not found then raise exception 'invoice series missing'; end if;
    update public.central_invoice_identities set released_at = statement_timestamp() where id = v_identity.id;
  end if;
  v_hash := 'sha256:' || pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
    (case when p_action = 'update' then p_emitted_snapshot else v_payload end)::text,
    'UTF8'), 'sha256'), 'hex');
  update public.central_invoice_documents set
    current_payload = v_payload, current_version = v_version,
    content_revision = case when p_action = 'update' then v_version else content_revision end,
    emitted_snapshot = case when p_action = 'update' then p_emitted_snapshot else null end,
    emitted_hash = v_hash, lifecycle_status = case when p_action = 'delete' then 'retired' else 'issued' end,
    updated_at = statement_timestamp() where id = v_doc.id;
  insert into public.central_invoice_document_versions
    (document_id, user_id, version, change_kind, previous_hash, next_hash, actor_device_id, actor_session_hash, safe_summary)
    values (v_doc.id, p_user_id, v_version, v_type, v_doc.emitted_hash, v_hash,
      p_device_id, p_session_hash, jsonb_build_object('eventType', v_type));
  insert into public.central_invoice_outbox (user_id, document_id, identity_id, event_type, idempotency_key, safe_summary)
    values (p_user_id, v_doc.id, v_identity.id, v_type, v_key,
      jsonb_build_object('requestHash', p_request_hash, 'documentVersion', v_version,
        'fullNumber', v_identity.full_number, 'sequence', v_identity.sequence)) returning * into v_event;
  return query select 'committed'::text, v_doc.id, v_identity.id, v_event.id,
    v_identity.full_number, v_identity.sequence, v_version;
end;
$$;
revoke all on function public.manage_central_invoice_v1(uuid,text,text,text,text,uuid,uuid,integer,text,jsonb,jsonb)
  from public, anon, authenticated;
grant execute on function public.manage_central_invoice_v1(uuid,text,text,text,text,uuid,uuid,integer,text,jsonb,jsonb)
  to service_role;

-- Removing a receipt must also remove any persisted operational backlink,
-- atomically with the business tombstone. Fiscal content/payment stay intact.
create function public.central_receipt_delete_unlink_invoice_v1()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_doc public.central_invoice_documents%rowtype;
  v_document jsonb;
  v_payload jsonb;
  v_version integer;
begin
  if new.entity_type <> 'receipt' or not new.deleted or old.deleted then return new; end if;
  for v_doc in select * from public.central_invoice_documents d
    where d.user_id = new.user_id and d.lifecycle_status in ('issued', 'rectified', 'voided')
      and coalesce(d.current_payload -> 'document', d.current_payload) ->> 'receiptDocumentId' = new.entity_id
    order by d.id for update loop
    v_document := coalesce(v_doc.current_payload -> 'document', v_doc.current_payload) - 'receiptDocumentId';
    v_payload := case when v_doc.current_payload ? 'document'
      then jsonb_set(v_doc.current_payload, '{document}', v_document) else v_document end;
    v_version := v_doc.current_version + 1;
    update public.central_invoice_documents set current_payload = v_payload,
      current_version = v_version, updated_at = statement_timestamp() where id = v_doc.id;
    insert into public.central_invoice_document_versions
      (document_id,user_id,version,change_kind,previous_hash,next_hash,actor_device_id,actor_session_hash,safe_summary)
      values (v_doc.id,new.user_id,v_version,'quote_relationship_updated',v_doc.emitted_hash,v_doc.emitted_hash,
        'central-receipt-delete','central-receipt-delete',jsonb_build_object('relationship','receipt_deleted'));
    insert into public.central_invoice_outbox (user_id,document_id,identity_id,event_type,idempotency_key,safe_summary)
      values (new.user_id,v_doc.id,v_doc.identity_id,'invoice_relationship_updated',
        'receipt-delete-unlink:' || new.user_id::text || ':' || new.entity_id || ':' || new.current_version::text,
        jsonb_build_object('relationship','receipt_deleted','receiptId',new.entity_id));
  end loop;
  return new;
end;
$$;
revoke all on function public.central_receipt_delete_unlink_invoice_v1() from public,anon,authenticated;
create trigger central_receipt_delete_unlink_invoice_v1 after update on public.central_business_entities
  for each row when (new.entity_type = 'receipt' and new.deleted and not old.deleted)
  execute function public.central_receipt_delete_unlink_invoice_v1();

-- Guarded replacements keep all previously audited issue/pull code intact.
-- Abort the migration if a deployed function differs from the known contract.
do $$
declare v_def text; v_signature text;
begin
  v_signature := 'public.issue_central_invoice_v1(uuid,text,text,text,text,text,text,integer,text,text,text,text,integer,timestamp with time zone,jsonb,jsonb,text,uuid)';
  v_def := pg_catalog.pg_get_functiondef(v_signature::regprocedure);
  if position('v_next_sequence := v_series.last_sequence + 1;' in v_def) = 0 then
    raise exception 'unexpected issue allocator definition';
  end if;
  v_def := replace(v_def, 'v_next_sequence := v_series.last_sequence + 1;', $replacement$
  -- The series row is already exclusively locked. Reuse only explicitly
  -- released numbers in this exact scope, never an arbitrary historic gap.
  select min(f.sequence) into v_next_sequence from public.central_invoice_identities f
    where f.user_id = p_user_id and f.environment = p_environment
      and f.issuer_nif = p_issuer_nif and f.series_code = p_series_code
      and f.fiscal_year = p_fiscal_year and f.released_at is not null
      and not exists (select 1 from public.central_invoice_identities a
        where a.user_id = f.user_id and a.environment = f.environment
          and a.issuer_nif = f.issuer_nif and a.series_code = f.series_code
          and a.fiscal_year = f.fiscal_year and a.sequence = f.sequence and a.released_at is null);
  v_next_sequence := coalesce(v_next_sequence, v_series.last_sequence + 1);
  $replacement$);
  v_def := replace(v_def, 'last_sequence = v_next_sequence,', 'last_sequence = greatest(last_sequence, v_next_sequence),');
  v_def := replace(v_def, 'if v_document.lifecycle_status = ''issued'' then', 'if v_document.lifecycle_status <> ''draft'' then');
  v_def := replace(v_def, 'where d.id = v_command.result_document_id;',
    'where d.id = v_command.result_document_id and i.released_at is null;');
  execute v_def;
  foreach v_signature in array array[
    'public.list_central_invoice_events_v1(uuid,text,timestamp with time zone,uuid,integer)',
    'public.get_central_invoice_event_v1(uuid,text,uuid)'
  ] loop
    v_def := pg_catalog.pg_get_functiondef(v_signature::regprocedure);
    if position('o.event_type,' in v_def) = 0 or
      position('d.current_payload as document_payload,' in v_def) = 0 or
      position('d.lifecycle_status in (''issued'', ''rectified'', ''voided'')' in v_def) = 0 then
      raise exception 'unexpected event pull definition';
    end if;
    v_def := replace(v_def, 'o.event_type,',
      'case when d.lifecycle_status = ''retired'' and i.released_at is not null then ''invoice_deleted'' else o.event_type end,');
    v_def := replace(v_def, 'd.lifecycle_status in (''issued'', ''rectified'', ''voided'')',
      '(d.lifecycle_status in (''issued'', ''rectified'', ''voided'') or (d.lifecycle_status = ''retired'' and i.released_at is not null))');
    v_def := replace(v_def, 'd.current_payload as document_payload,',
      'case when d.content_revision > 0 then d.current_payload || jsonb_build_object(''centralAmendmentVersion'', 1) else d.current_payload end as document_payload,');
    execute v_def;
  end loop;
  -- A fresh device must not replay an old receipt creation whose source invoice
  -- has since been deleted. Project the current receipt tombstone on every old
  -- receipt wake-up while retaining ordered event sequence/technical identity.
  v_signature := 'public.list_central_business_events_v1(uuid,text,bigint,integer)';
  v_def := pg_catalog.pg_get_functiondef(v_signature::regprocedure);
  if position('outbox.entity_version,' in v_def) = 0 or
    position('outbox.operation_kind,' in v_def) = 0 or
    position('outbox.payload,' in v_def) = 0 or
    position('outbox.content_hash,' in v_def) = 0 or
    position('from public.central_business_outbox as outbox' in v_def) = 0 then
    raise exception 'unexpected business event pull definition';
  end if;
  v_def := replace(v_def, 'outbox.entity_version,',
    'case when outbox.entity_type = ''receipt'' and current_entity.deleted then current_entity.current_version else outbox.entity_version end,');
  v_def := replace(v_def, 'outbox.operation_kind,',
    'case when outbox.entity_type = ''receipt'' and current_entity.deleted then ''delete'' else outbox.operation_kind end,');
  v_def := replace(v_def, 'outbox.payload,',
    'case when outbox.entity_type = ''receipt'' and current_entity.deleted then null::jsonb else outbox.payload end,');
  v_def := replace(v_def, 'outbox.content_hash,',
    'case when outbox.entity_type = ''receipt'' and current_entity.deleted then current_entity.content_hash else outbox.content_hash end,');
  v_def := replace(v_def, 'from public.central_business_outbox as outbox',
    'from public.central_business_outbox as outbox left join public.central_business_entities as current_entity
      on current_entity.user_id = outbox.user_id and current_entity.entity_type = outbox.entity_type
      and current_entity.entity_id = outbox.entity_id and outbox.entity_type = ''receipt''');
  execute v_def;
end;
$$;

commit;
