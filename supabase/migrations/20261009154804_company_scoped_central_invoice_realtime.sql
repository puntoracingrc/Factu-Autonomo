-- COMPANY_SCOPED_CENTRAL_INVOICE_REALTIME_V1
-- Reuse the existing audited company-membership predicate. Wakeups contain
-- only opaque IDs/timestamps; invoice payloads remain behind authenticated API.
begin;

drop policy if exists central_invoice_event_wakeups_owner_select_v1
  on public.central_invoice_event_wakeups;
create policy central_invoice_event_wakeups_owner_select_v1
  on public.central_invoice_event_wakeups
  for select to authenticated
  using (
    public.can_receive_central_business_realtime_v1(
      'central-business:' || user_id::text
    )
  );

commit;
