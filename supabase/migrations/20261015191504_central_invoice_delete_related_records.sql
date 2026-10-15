-- ADR-0010 V9: explicit invoice deletion keeps quotes, unlinks expenses and
-- deletes associated receipts in the SAME transaction. No existing row changes
-- merely by installing this migration. Private helper, not a browser RPC.
begin;

create function public.delete_central_invoice_related_records_v1(
  p_user_id uuid, p_device_id text, p_session_hash text,
  p_document_id uuid, p_local_document_id text, p_receipt_id text, p_command_key text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_entity public.central_business_entities%rowtype;
  v_payload jsonb;
  v_allocations jsonb;
  v_operations jsonb := '[]'::jsonb;
  v_key text;
  v_hash text;
  v_source text;
  v_snapshot_source text;
begin
  if (select auth.role()) <> 'service_role' then raise exception 'service_role required'; end if;
  -- The caller already owns the company advisory lock and invoice row lock.
  if not exists (select 1 from public.central_invoice_documents d
    where d.id = p_document_id and d.user_id = p_user_id
      and d.local_document_id = p_local_document_id and d.lifecycle_status = 'retired') then
    raise exception 'invoice deletion must be confirmed in this transaction';
  end if;

  for v_entity in
    select e.* from public.central_business_entities e
    where e.user_id = p_user_id and not e.deleted and (
      (e.entity_type = 'receipt' and (
        e.current_payload ->> 'sourceDocumentId' = p_local_document_id
        or e.current_payload #>> '{documentSnapshot,sourceDocumentId}' = p_local_document_id
        or e.entity_id = nullif(p_receipt_id, '')))
      or (e.entity_type = 'expense' and (
        e.current_payload ->> 'workDocumentId' = p_local_document_id
        or e.current_payload -> 'workAllocations' @>
          jsonb_build_array(jsonb_build_object('workDocumentId', p_local_document_id))))
    ) order by e.entity_type, e.entity_id for update
  loop
    if jsonb_array_length(v_operations) >= 100 then
      raise exception using errcode = 'P4142', message = 'too many invoice relationships; deletion rolled back';
    end if;
    if v_entity.entity_type = 'receipt' then
      v_source := nullif(v_entity.current_payload ->> 'sourceDocumentId', '');
      v_snapshot_source := nullif(v_entity.current_payload #>> '{documentSnapshot,sourceDocumentId}', '');
      if v_entity.current_payload ? 'legacyImportAttestation'
        or v_entity.current_payload ? 'legacyImportProvenance'
        or v_entity.current_payload ? 'appIssuedRecoveryAttestation'
        or v_entity.current_payload #>> '{documentSnapshot,source}' in ('legacy_import_attested','legacy_backfill')
        or v_entity.current_payload #>> '{snapshotIntegrity,status}' = 'blocked'
        or v_entity.current_payload #>> '{verifactu,environment}' = 'production'
        or v_entity.current_payload #>> '{verifactu,status}' = 'registered'
        or (v_source is not null and v_source <> p_local_document_id)
        or (v_snapshot_source is not null and v_snapshot_source <> p_local_document_id)
        or exists (select 1 from public.central_invoice_documents d
          where d.user_id = p_user_id and d.id <> p_document_id
            and d.lifecycle_status in ('issued','rectified','voided')
            and coalesce(d.current_payload -> 'document', d.current_payload) ->> 'receiptDocumentId' = v_entity.entity_id) then
        raise exception using errcode = 'P4143', message = 'protected or ambiguous linked receipt; deletion rolled back';
      end if;
      v_payload := null;
    else
      -- Only remove the selected invoice's allocations. Preserve supplier,
      -- amounts, tax, original archive, repairs and allocations to other works.
      v_payload := v_entity.current_payload;
      if v_payload ? 'workAllocations' and v_payload -> 'workAllocations' <> 'null'::jsonb
        and jsonb_typeof(v_payload -> 'workAllocations') <> 'array' then
        raise exception using errcode = 'P4143', message = 'invalid expense allocations; deletion rolled back';
      end if;
      select coalesce(jsonb_agg(a.value order by a.ordinality), '[]'::jsonb) into v_allocations
      from jsonb_array_elements(coalesce(nullif(v_payload -> 'workAllocations', 'null'::jsonb), '[]'::jsonb))
        with ordinality as a(value, ordinality)
      where a.value ->> 'workDocumentId' is distinct from p_local_document_id;
      v_payload := (v_payload - 'workDocumentId' - 'workAllocations') || jsonb_build_object('workAllocationClosed', false);
      if jsonb_array_length(v_allocations) > 0 then
        v_payload := v_payload || jsonb_build_object('workAllocations', v_allocations,
          'workDocumentId', v_allocations -> 0 ->> 'workDocumentId');
      end if;
    end if;
    v_key := 'invoice-delete-related:' || pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
      p_command_key || ':' || v_entity.entity_type || ':' || v_entity.entity_id, 'UTF8'), 'sha256'), 'hex');
    v_hash := pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
      case when v_entity.entity_type = 'receipt' then 'central-business-tombstone-v1'
        else public.central_business_stable_json_text_v1(v_payload) end,
      'UTF8'), 'sha256'), 'hex');
    v_operations := v_operations || jsonb_build_array(jsonb_build_object(
      'operationIndex', jsonb_array_length(v_operations), 'idempotencyKeyHash', v_key,
      'requestHash', v_hash, 'operationKind', case when v_entity.entity_type = 'receipt' then 'delete' else 'upsert' end,
      'entityType', v_entity.entity_type, 'entityId', v_entity.entity_id,
      'expectedVersion', v_entity.current_version, 'payload', v_payload, 'contentHash', v_hash));
  end loop;
  if jsonb_array_length(v_operations) > 0 then
    perform * from public.mutate_central_business_batch_v1(p_user_id, p_device_id, p_session_hash, v_operations);
  end if;
end;
$$;
revoke all on function public.delete_central_invoice_related_records_v1(uuid,text,text,uuid,text,text,text)
  from public, anon, authenticated, service_role;

-- Retain the deployed management contract verbatim except for this authorized
-- cascade. Abort on an unexpected definition rather than replace other work.
do $migration$
declare
  v_definition text := pg_catalog.pg_get_functiondef(
    'public.manage_central_invoice_v1(uuid,text,text,text,text,uuid,uuid,integer,text,jsonb,jsonb)'::regprocedure);
  v_guard text := $guard$  if exists (select 1 from public.central_business_entities e
    where e.user_id = p_user_id and e.entity_type = 'receipt' and not e.deleted
      and e.current_payload ->> 'sourceDocumentId' = v_doc.local_document_id) then$guard$;
  v_return text := $return$  return query select 'committed'::text, v_doc.id, v_identity.id, v_event.id,$return$;
begin
  if position(v_guard in v_definition) = 0 or position(v_return in v_definition) = 0
    or position('central-business-owner:' in v_definition) = 0 then
    raise exception 'unexpected central invoice management definition';
  end if;
  v_definition := replace(v_definition, v_guard, replace(v_guard, 'if exists', 'if p_action = ''update'' and exists'));
  v_definition := replace(v_definition, v_return, $cascade$
  if p_action = 'delete' then
    perform public.delete_central_invoice_related_records_v1(p_user_id, p_device_id, p_session_hash,
      v_doc.id, v_doc.local_document_id, v_old ->> 'receiptDocumentId', v_key);
  end if;
$cascade$ || v_return);
  execute v_definition;
end;
$migration$;

commit;
