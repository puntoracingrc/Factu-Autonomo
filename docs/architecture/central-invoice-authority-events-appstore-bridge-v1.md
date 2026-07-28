# Central Invoice Authority Events AppStore Bridge V1

Status: manual durable bridge, no automatic polling.

This phase wires central invoice authority event reception into the existing
`AppStore` durable commit path. It is intentionally manual: consumers can call
`syncCentralInvoiceAuthorityEvents`, but the store does not start timers,
background polling or cloud-sync coupling.

Safety contract:

- Browser tabs serialize central issuance and event reception through one Web
  Locks key, with an in-process queue fallback when Web Locks is unavailable.
- A tab that waited for another tab adopts the newer durable cursor/state
  before pulling again; it never replaces newer in-memory work with an older
  persisted copy.
- The browser first pulls central events using the cursor already stored in
  `centralInvoiceAuthorityEventsSync`.
- The resulting local sync decision is committed through
  `commitDurableAppData`, so a device cannot persist the transition if local
  data changed while the request was in flight.
- The durable build step records the result against the current accepted
  baseline instead of blindly publishing a precomputed object.
- Successful pulls can update documents and advance the cursor together.
- Conflicts and network/session errors preserve the local document list and the
  previous cursor, while storing status, counts, error code and diagnostic
  `serverNextCursor`.
- The bridge does not modify invoice creation, forms, VeriFactu, cloud device
  sync, Supabase migrations or routes.

The next phase can add a small user-facing trigger/status surface around this
method. Automatic polling should remain behind a later explicit rollout gate.
