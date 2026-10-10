-- Shared saved drafts are operational entities, never fiscal invoices.
begin;

do $$
declare t text; c text;
begin
  foreach t in array array['entities','commands','outbox'] loop
    c := 'central_business_' || t || '_type_v1';
    execute format('alter table public.%I drop constraint %I, add constraint %I check
      (entity_type in (''customer'',''supplier'',''product'',''expense'',''recurring_expense'',
       ''user_reminder'',''quote'',''receipt'',''profile'',''document_draft''))',
      'central_business_' || t, c, c);
  end loop;
end $$;

do $$
declare d text; needle text;
begin
  d := pg_catalog.pg_get_functiondef('public.mutate_central_business_entity_v1(uuid,text,text,text,text,text,text,text,integer,jsonb,text)'::regprocedure);
  needle := '''user_reminder'',';
  if position(needle in d) = 0 or position('''document_draft''' in d) > 0 then
    raise exception 'unexpected business mutation type definition';
  end if;
  d := replace(d, needle, needle || ' ''document_draft'',');
  needle := '  select *
    into v_entity
    from public.central_business_entities';
  if position(needle in d) = 0 then raise exception 'unexpected business mutation locking definition'; end if;
  -- Runs AFTER the entity advisory lock, so a concurrent issue can retire the
  -- draft atomically before an old browser tries to save it again.
  d := replace(d, needle, $guard$
  if p_entity_type = 'document_draft' then
    if exists (select 1 from public.central_invoice_documents i
      where i.user_id = p_user_id and i.local_document_id = p_entity_id
        and i.lifecycle_status <> 'draft') or exists (select 1 from public.central_business_entities r
      where r.user_id = p_user_id and r.entity_type = 'receipt' and r.entity_id = p_entity_id) then
      raise exception using errcode = 'P4101', message = 'draft already issued or retired';
    end if;
    if p_operation_kind = 'upsert' and (
      jsonb_typeof(p_payload) is distinct from 'object'
      or p_payload->>'id' is distinct from p_entity_id
      or coalesce(p_payload->>'type','') not in ('factura','recibo')
      or p_payload->>'status' is distinct from 'borrador'
      or p_payload->>'number' is distinct from 'BORRADOR'
      or coalesce(p_payload->>'documentLifecycle','draft') <> 'draft'
      or coalesce(p_payload->>'integrityLock','unlocked') <> 'unlocked'
      or coalesce(p_payload->>'deliveryStatus','not_sent') <> 'not_sent'
      or coalesce(p_payload->>'paymentStatus','not_applicable') <> 'not_applicable'
      or jsonb_typeof(p_payload->'client') is distinct from 'object'
      or jsonb_typeof(p_payload->'items') is distinct from 'array'
      or p_payload ?| array['centralInvoiceAuthority','centralBusinessReceiptAuthority',
        'centralBusinessDraftVersion','issuer','documentSnapshot','pdfSnapshot','snapshotSeal',
        'snapshotIntegrityRequired','snapshotIntegrity','integrityQuarantine','issuedAt','verifactu','verifactuPersistence',
        'legacyImportAttestation','legacyImportProvenance','appIssuedRecoveryAttestation',
        'receiptDocumentId','sourceDocumentId','paidAt','sentAt','acceptedAt','rectifiedById','collectionStatusOverride']
    ) then
      raise exception using errcode = 'P4100', message = 'invalid shared document draft';
    end if;
  end if;
$guard$ || needle);
  execute d;

  d := pg_catalog.pg_get_functiondef('public.list_central_business_events_v1(uuid,text,bigint,integer)'::regprocedure);
  if position('outbox.entity_type = ''receipt''' in d) = 0 then
    raise exception 'unexpected business event tombstone projection';
  end if;
  d := replace(d, 'outbox.entity_type = ''receipt''', 'outbox.entity_type in (''receipt'', ''document_draft'')');
  execute d;
end $$;

create function public.retire_shared_document_draft_v1(p_owner uuid, p_id text, p_version text)
returns void language plpgsql security definer set search_path = '' as $$
declare d public.central_business_entities%rowtype; h text;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    p_owner::text || ':document_draft:' || p_id, 0));
  select * into d from public.central_business_entities
    where user_id = p_owner and entity_type = 'document_draft'
      and entity_id = p_id for update;
  if not found then return; end if;
  if d.deleted or coalesce(p_version, '') <> d.current_version::text then
    raise exception using errcode = 'P4101', message = 'shared draft changed; reopen before issuing';
  end if;
  h := encode(extensions.digest('central-business-tombstone-v1','sha256'),'hex');
  update public.central_business_entities set deleted = true, current_payload = null,
    current_version = d.current_version + 1, content_hash = h, updated_at = statement_timestamp()
    where user_id = d.user_id and entity_type = d.entity_type and entity_id = d.entity_id;
  insert into public.central_business_outbox
    (user_id, entity_type, entity_id, entity_version, operation_kind, payload, content_hash, actor_device_id)
    values (d.user_id, d.entity_type, d.entity_id, d.current_version + 1, 'delete', null, h, 'central-invoice-issue');
end $$;
revoke all on function public.retire_shared_document_draft_v1(uuid,text,text) from public, anon, authenticated;

create function public.retire_shared_draft_on_central_invoice_issue_v1()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.lifecycle_status = 'issued' and (tg_op = 'INSERT' or old.lifecycle_status = 'draft') then
    perform public.retire_shared_document_draft_v1(new.user_id, new.local_document_id,
      new.current_payload #>> '{document,centralBusinessDraftVersion}');
  end if;
  return new;
end $$;
revoke all on function public.retire_shared_draft_on_central_invoice_issue_v1() from public, anon, authenticated;
create trigger retire_shared_draft_on_central_invoice_issue_v1
  after insert or update of lifecycle_status on public.central_invoice_documents
  for each row execute function public.retire_shared_draft_on_central_invoice_issue_v1();

create function public.retire_shared_draft_on_central_receipt_issue_v1()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.entity_type = 'receipt' then
    perform public.retire_shared_document_draft_v1(new.user_id, new.entity_id,
      new.current_payload ->> 'centralBusinessDraftVersion');
  end if;
  return new;
end $$;
revoke all on function public.retire_shared_draft_on_central_receipt_issue_v1() from public, anon, authenticated;
create trigger retire_shared_draft_on_central_receipt_issue_v1 after insert on public.central_business_entities
  for each row execute function public.retire_shared_draft_on_central_receipt_issue_v1();

-- Private, company-scoped invalidation only. Never transmit email contents,
-- attachment URLs, document payloads or other personal data over Broadcast.
create function public.broadcast_workspace_auxiliary_wakeup_v1()
returns trigger language plpgsql security definer set search_path = '' as $$
declare owner_id uuid; kind text;
begin
  owner_id := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
  kind := case when tg_table_name = 'workspace_auxiliary_entities' then 'fiscal_notifications' else 'expense_inbox' end;
  perform realtime.send(jsonb_build_object('kind',kind), 'workspace_auxiliary_changed', 'central-business:' || owner_id::text, true);
  return null;
end $$;
revoke all on function public.broadcast_workspace_auxiliary_wakeup_v1() from public, anon, authenticated;
create trigger workspace_auxiliary_realtime_wakeup_v1 after insert or update or delete on public.workspace_auxiliary_entities
  for each row execute function public.broadcast_workspace_auxiliary_wakeup_v1();
create trigger expense_inbox_items_realtime_wakeup_v1 after insert or update or delete on public.expense_inbox_items
  for each row execute function public.broadcast_workspace_auxiliary_wakeup_v1();
create trigger expense_inbox_aliases_realtime_wakeup_v1 after insert or update or delete on public.expense_inbox_aliases
  for each row execute function public.broadcast_workspace_auxiliary_wakeup_v1();

commit;
