# Central Invoice Authority Events Manual UI V1

Status: manual account surface, no automatic polling.

This phase exposes the existing `syncCentralInvoiceAuthorityEvents` bridge from
Cuenta as an explicit user action. The UI does not start timers, subscribe to
Realtime, couple itself to `CloudSyncContext` operations or reuse the old cloud
repair flow.

Safety contract:

- The button calls the AppStore bridge with the current `AppData` reference.
- The bridge still pulls with the persisted central cursor and writes only
  through the durable AppStore commit path.
- If local data changes while the pull is in flight, the durable commit blocks
  with `stale_precondition` and the UI asks the user to run the check again.
- Conflicts and central errors remain visible but do not replace documents,
  do not advance the cursor and do not clear legacy cloud-sync issues.
- The card shows counters, dates and cursor IDs only. It does not render
  document payloads, emitted snapshots, PDF bytes, fiscal text or PII.

Automatic polling, Realtime wakeups and form-level activation remain reserved
for later rollout phases.
