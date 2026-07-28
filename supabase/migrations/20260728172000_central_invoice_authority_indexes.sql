-- CENTRAL_INVOICE_AUTHORITY_INDEXES_V1
-- Scope: additive indexes for foreign-key checks and ordered per-owner outbox
-- pulls. No existing rows or fiscal identities are mutated.

begin;

create unique index if not exists central_invoice_documents_identity_uidx
  on public.central_invoice_documents (identity_id)
  where identity_id is not null;

create index if not exists central_invoice_identities_rectifies_idx
  on public.central_invoice_identities (rectifies_identity_id)
  where rectifies_identity_id is not null;

create index if not exists central_invoice_commands_result_document_idx
  on public.central_invoice_commands (result_document_id)
  where result_document_id is not null;

create index if not exists central_invoice_commands_result_identity_idx
  on public.central_invoice_commands (result_identity_id)
  where result_identity_id is not null;

create index if not exists central_invoice_commands_result_outbox_idx
  on public.central_invoice_commands (result_outbox_event_id)
  where result_outbox_event_id is not null;

create index if not exists central_invoice_outbox_document_idx
  on public.central_invoice_outbox (document_id);

create index if not exists central_invoice_outbox_identity_idx
  on public.central_invoice_outbox (identity_id)
  where identity_id is not null;

create index if not exists central_invoice_outbox_user_cursor_idx
  on public.central_invoice_outbox (user_id, created_at, id);

commit;
