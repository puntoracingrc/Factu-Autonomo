# Central Invoice Authority Events Auto Sync V1

Status: feature-flagged browser polling, disabled by default.

This phase adds a silent client component that can wake the existing central
invoice authority event bridge automatically. The runtime is inert unless
`NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_EVENTS_AUTO_SYNC=true` is present at
build time.

An optional canary scope can further restrict the flag to explicit Supabase
user UUIDs with
`NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_EVENTS_CANARY_USERS=<uuid>[,<uuid>]`.
When that variable is empty, the explicit auto-sync flag keeps its previous
global semantics. When it is non-empty, a malformed or absent user ID does not
run automatic sync and does not contact Realtime.

Safety contract:

- The component never renders fiscal data, document payloads, emitted hashes,
  PDF bytes or safe summaries.
- It calls only the existing AppStore durable bridge
  `syncCentralInvoiceAuthorityEvents`, so every write still goes through
  `commitDurableAppData`.
- It does not call legacy cloud repair, force-download, Google Drive backup,
  document forms, issue routes or Supabase admin code.
- It requires local data ready, cloud enabled, authenticated user, confirmed
  email, online browser and visible document before polling.
- It does not overlap polls in the same tab.
- A durable blocked or indeterminate result retries later without changing the
  cursor outside the durable bridge.
- A central local conflict remains fail-closed: no document changes and the
  cursor does not advance. Polling retries at a bounded interval so a stale
  conflict can recover automatically; the user-facing manual card in Cuenta
  remains the immediate recovery surface.
- Browser `online`, `focus` and `visibilitychange` are wakeup signals only.
- Realtime wakeups remain optional in
  `central-invoice-authority-events-realtime-wakeups-v1.md` and, per ADR-0010,
  only signal a reread through this polling bridge.

This keeps the current production behavior unchanged while preparing the route
to a Holded-style central source of truth: server commits the invoice identity,
clients receive the canonical event stream, and lost wakeups remain recoverable
by polling.
