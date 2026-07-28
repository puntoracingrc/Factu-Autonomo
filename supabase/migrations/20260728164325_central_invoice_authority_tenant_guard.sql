-- CENTRAL_INVOICE_AUTHORITY_TENANT_GUARD_V1
-- Keep permanent fiscal identities immutable and prevent rectifications from
-- referencing an identity outside their owner, environment, or issuer scope.

begin;

create or replace function public.central_invoice_authority_validate_identity_scope_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_document_user_id uuid;
  v_document_kind text;
  v_rectified_user_id uuid;
  v_rectified_environment text;
  v_rectified_issuer_nif text;
begin
  select
    document.user_id,
    document.kind
    into
      v_document_user_id,
      v_document_kind
    from public.central_invoice_documents as document
    where document.id = new.document_id;

  if not found or v_document_user_id <> new.user_id then
    raise exception 'central invoice identity document scope mismatch';
  end if;

  if v_document_kind = 'invoice' and new.rectifies_identity_id is not null then
    raise exception 'central invoice identity cannot rectify another identity';
  end if;

  if v_document_kind = 'rectification' and new.rectifies_identity_id is null then
    raise exception 'central rectification identity requires rectified identity';
  end if;

  if new.rectifies_identity_id is not null then
    select
      identity.user_id,
      identity.environment,
      identity.issuer_nif
      into
        v_rectified_user_id,
        v_rectified_environment,
        v_rectified_issuer_nif
      from public.central_invoice_identities as identity
      where identity.id = new.rectifies_identity_id;

    if not found
      or v_rectified_user_id <> new.user_id
      or v_rectified_environment <> new.environment
      or v_rectified_issuer_nif <> new.issuer_nif
    then
      raise exception 'central rectified identity scope mismatch';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.central_invoice_authority_validate_identity_scope_v1()
  from public, anon, authenticated;

grant execute on function public.central_invoice_authority_validate_identity_scope_v1()
  to service_role;

drop trigger if exists central_invoice_identities_scope_bi_v1
  on public.central_invoice_identities;

create trigger central_invoice_identities_scope_bi_v1
  before insert on public.central_invoice_identities
  for each row
  execute function public.central_invoice_authority_validate_identity_scope_v1();

revoke update, delete, truncate
  on table public.central_invoice_identities
  from service_role;

comment on function public.central_invoice_authority_validate_identity_scope_v1() is
  'CENTRAL_INVOICE_AUTHORITY_TENANT_GUARD_V1 rejects cross-owner, cross-environment, and cross-issuer rectification references.';

commit;
