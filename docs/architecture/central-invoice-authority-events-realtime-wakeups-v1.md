# Central Invoice Authority Events Realtime Wakeups V1

Status: feature-flagged Realtime wakeups, disabled by default.

This phase adds an owner-scoped Supabase Realtime signal for central invoice
authority events. It is inert unless both flags are present at build time:

- `NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_EVENTS_AUTO_SYNC=true`
- `NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_EVENTS_REALTIME_WAKEUPS=true`

The same browser canary scope used by auto-sync applies here:

- `NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_EVENTS_CANARY_USERS=<uuid>[,<uuid>]`

If that optional list is present, only those Supabase user UUIDs subscribe to
Realtime. Invalid entries are ignored and a non-empty list with no matching
valid UUID fails closed. The list must not contain emails, customer names,
NIFs, invoice numbers or any business payload.

## Contract

Realtime is a wakeup only. It never becomes the source of truth and never
applies database payloads directly to `AppStore`. The browser ignores the
Realtime payload and only wakes the existing durable bridge
`syncCentralInvoiceAuthorityEvents`, which rereads events through the private
Next.js API and persists only through `commitDurableAppData`.

Lost wakeups remain recoverable because the previous polling loop stays active.
If Realtime is unavailable, not configured or denied by RLS, the app keeps the
same automatic polling behavior.

## Supabase surface

`central_invoice_outbox` remains private: no grants are added to `anon` or
`authenticated`.

The browser subscribes only to `central_invoice_event_wakeups`, a lightweight
table containing:

- `user_id`;
- `outbox_event_id`;
- `created_at`.

The table has RLS enabled and a single owner-select policy for
`authenticated`. It is added idempotently to the `supabase_realtime`
publication when that publication exists.

The wakeup row is inserted by a trigger after `central_invoice_outbox` receives
a new event inside the central transaction. The trigger writes no fiscal
payload, no invoice snapshot, no hash material, no PDF/XML bytes and no safe
summary.

## Client surface

The client imports the Supabase browser client dynamically only after the two
flags and readiness checks pass. The subscription:

- listens only for `INSERT`;
- targets the public wakeup table;
- filters by `user_id=eq.<authenticated-user-id>`;
- calls the same scheduler used by browser `online`, `focus` and
  `visibilitychange` wakeups.

This keeps the Holded-style model intact: server commits invoice identity,
browser receives a signal, browser rereads the canonical event stream from the
server, and local writes remain durable and conflict-aware.
