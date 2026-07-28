-- CENTRAL_INVOICE_AUTHORITY_EXPLICIT_DENIES_V1
--
-- The central ledger is service-role-only. These restrictive policies keep
-- browser roles denied even if table grants are accidentally broadened later.

drop policy if exists central_invoice_commands_deny_clients_v1
  on public.central_invoice_commands;
create policy central_invoice_commands_deny_clients_v1
  on public.central_invoice_commands
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists central_invoice_document_versions_deny_clients_v1
  on public.central_invoice_document_versions;
create policy central_invoice_document_versions_deny_clients_v1
  on public.central_invoice_document_versions
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists central_invoice_documents_deny_clients_v1
  on public.central_invoice_documents;
create policy central_invoice_documents_deny_clients_v1
  on public.central_invoice_documents
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists central_invoice_identities_deny_clients_v1
  on public.central_invoice_identities;
create policy central_invoice_identities_deny_clients_v1
  on public.central_invoice_identities
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists central_invoice_outbox_deny_clients_v1
  on public.central_invoice_outbox;
create policy central_invoice_outbox_deny_clients_v1
  on public.central_invoice_outbox
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists central_invoice_series_state_deny_clients_v1
  on public.central_invoice_series_state;
create policy central_invoice_series_state_deny_clients_v1
  on public.central_invoice_series_state
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);
