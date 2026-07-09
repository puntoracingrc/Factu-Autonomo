begin;

-- Keep browser cloud sync scoped to the signed-in owner only.
alter table public.user_backups enable row level security;
alter table public.sync_entities enable row level security;

drop policy if exists "Leer copia propia" on public.user_backups;
create policy "Leer copia propia"
  on public.user_backups
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Crear copia propia" on public.user_backups;
create policy "Crear copia propia"
  on public.user_backups
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Actualizar copia propia" on public.user_backups;
create policy "Actualizar copia propia"
  on public.user_backups
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Leer entidades propias" on public.sync_entities;
create policy "Leer entidades propias"
  on public.sync_entities
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Crear entidades propias" on public.sync_entities;
create policy "Crear entidades propias"
  on public.sync_entities
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Actualizar entidades propias" on public.sync_entities;
create policy "Actualizar entidades propias"
  on public.sync_entities
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.user_backups from public, anon, authenticated;
revoke all on table public.sync_entities from public, anon, authenticated;

grant select, insert, update on table public.user_backups to authenticated;
grant select, insert, update on table public.sync_entities to authenticated;
grant all on table public.user_backups to service_role;
grant all on table public.sync_entities to service_role;

-- Billing summary remains browser-readable, but never browser-writable.
alter table public.user_subscriptions enable row level security;
alter table public.user_usage enable row level security;

drop policy if exists "Leer suscripcion propia" on public.user_subscriptions;
drop policy if exists "Leer suscripción propia" on public.user_subscriptions;
drop policy if exists "Crear suscripcion propia" on public.user_subscriptions;
drop policy if exists "Crear suscripción propia" on public.user_subscriptions;
drop policy if exists "Actualizar suscripcion propia" on public.user_subscriptions;
drop policy if exists "Actualizar suscripción propia" on public.user_subscriptions;

create policy "Leer suscripcion propia"
  on public.user_subscriptions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Leer uso propio" on public.user_usage;
drop policy if exists "Crear uso propio" on public.user_usage;
drop policy if exists "Actualizar uso propio" on public.user_usage;

create policy "Leer uso propio"
  on public.user_usage
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.user_subscriptions from public, anon, authenticated;
revoke all on table public.user_usage from public, anon, authenticated;

grant select on table public.user_subscriptions to authenticated;
grant select on table public.user_usage to authenticated;
grant all on table public.user_subscriptions to service_role;
grant all on table public.user_usage to service_role;

-- Internal tables are served through authenticated API routes, not direct browser table access.
alter table public.payment_receipts enable row level security;
alter table public.referral_codes enable row level security;
alter table public.referral_redemptions enable row level security;
alter table public.verifactu_records enable row level security;
alter table public.verifactu_chain_state enable row level security;
alter table public.expense_inbox_aliases enable row level security;
alter table public.expense_inbox_items enable row level security;
alter table public.expense_inbox_alias_history enable row level security;
alter table public.admin_user_controls enable row level security;
alter table public.app_error_events enable row level security;
alter table public.ai_learning_events enable row level security;
alter table public.admin_user_restore_points enable row level security;
alter table public.admin_user_restore_events enable row level security;
alter table public.stripe_events enable row level security;
alter table public.fiscal_evidence_packets enable row level security;

drop policy if exists "Leer recibos propios" on public.payment_receipts;
drop policy if exists "Leer código de referido propio" on public.referral_codes;
drop policy if exists "Leer redención como invitado" on public.referral_redemptions;
drop policy if exists "Leer registros Verifactu propios" on public.verifactu_records;
drop policy if exists "Leer cadena Verifactu propia" on public.verifactu_chain_state;
drop policy if exists "Leer buzón propio" on public.expense_inbox_aliases;
drop policy if exists "Leer entradas de buzón propias" on public.expense_inbox_items;
drop policy if exists "Actualizar entradas de buzón propias" on public.expense_inbox_items;
drop policy if exists "Leer histórico de buzón propio" on public.expense_inbox_alias_history;

revoke all on table public.payment_receipts from public, anon, authenticated;
revoke all on table public.referral_codes from public, anon, authenticated;
revoke all on table public.referral_redemptions from public, anon, authenticated;
revoke all on table public.verifactu_records from public, anon, authenticated;
revoke all on table public.verifactu_chain_state from public, anon, authenticated;
revoke all on table public.expense_inbox_aliases from public, anon, authenticated;
revoke all on table public.expense_inbox_items from public, anon, authenticated;
revoke all on table public.expense_inbox_alias_history from public, anon, authenticated;
revoke all on table public.admin_user_controls from public, anon, authenticated;
revoke all on table public.app_error_events from public, anon, authenticated;
revoke all on table public.ai_learning_events from public, anon, authenticated;
revoke all on table public.admin_user_restore_points from public, anon, authenticated;
revoke all on table public.admin_user_restore_events from public, anon, authenticated;
revoke all on table public.stripe_events from public, anon, authenticated;
revoke all on table public.fiscal_evidence_packets from public, anon, authenticated;

grant all on table public.payment_receipts to service_role;
grant all on table public.referral_codes to service_role;
grant all on table public.referral_redemptions to service_role;
grant all on table public.verifactu_records to service_role;
grant all on table public.verifactu_chain_state to service_role;
grant all on table public.expense_inbox_aliases to service_role;
grant all on table public.expense_inbox_items to service_role;
grant all on table public.expense_inbox_alias_history to service_role;
grant all on table public.admin_user_controls to service_role;
grant all on table public.app_error_events to service_role;
grant all on table public.ai_learning_events to service_role;
grant all on table public.admin_user_restore_points to service_role;
grant all on table public.admin_user_restore_events to service_role;
grant all on table public.stripe_events to service_role;
grant all on table public.fiscal_evidence_packets to service_role;

-- Existing document/fiscal read surfaces keep their authenticated read contract,
-- but the policies use init-plan-safe auth.uid() evaluation and no PUBLIC grants.
alter table public.server_documents enable row level security;
alter table public.server_document_versions enable row level security;
alter table public.document_conflicts enable row level security;
alter table public.fiscal_operations enable row level security;
alter table public.fiscal_invoice_identities enable row level security;
alter table public.fiscal_records enable row level security;
alter table public.fiscal_chain_state enable row level security;
alter table public.fiscal_transport_attempts enable row level security;

drop policy if exists server_documents_select_own on public.server_documents;
create policy server_documents_select_own
  on public.server_documents
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists server_document_versions_select_own on public.server_document_versions;
create policy server_document_versions_select_own
  on public.server_document_versions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists document_conflicts_select_own on public.document_conflicts;
create policy document_conflicts_select_own
  on public.document_conflicts
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists fiscal_operations_select_own on public.fiscal_operations;
create policy fiscal_operations_select_own
  on public.fiscal_operations
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists fiscal_invoice_identities_select_own on public.fiscal_invoice_identities;
create policy fiscal_invoice_identities_select_own
  on public.fiscal_invoice_identities
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists fiscal_records_select_own on public.fiscal_records;
create policy fiscal_records_select_own
  on public.fiscal_records
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists fiscal_chain_state_select_own on public.fiscal_chain_state;
create policy fiscal_chain_state_select_own
  on public.fiscal_chain_state
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists fiscal_transport_attempts_select_own on public.fiscal_transport_attempts;
create policy fiscal_transport_attempts_select_own
  on public.fiscal_transport_attempts
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.server_documents from public;
revoke all on table public.server_document_versions from public;
revoke all on table public.document_conflicts from public;
revoke all on table public.fiscal_operations from public;
revoke all on table public.fiscal_invoice_identities from public;
revoke all on table public.fiscal_records from public;
revoke all on table public.fiscal_chain_state from public;
revoke all on table public.fiscal_transport_attempts from public;
revoke all on table public.server_documents_safe from public, anon;
revoke all on table public.fiscal_records_safe from public, anon;
revoke all on table public.fiscal_transport_attempts_safe from public, anon;

grant select on table public.server_documents_safe to authenticated;
grant select on table public.fiscal_records_safe to authenticated;
grant select on table public.fiscal_transport_attempts_safe to authenticated;

commit;
