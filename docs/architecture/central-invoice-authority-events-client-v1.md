# Central Invoice Authority Events Client V1

Status: guarded client bridge.

This phase adds the browser-side pull client for central invoice authority
events. It does not yet apply pulled documents to the local store; that is a
separate phase with its own conflict rules.

The client calls `/api/central-invoice-authority/events` with `GET`, the current
Supabase bearer token, and `X-Factu-Device-Token`. The server route remains the
only code path that can use `service_role` and the private RPC.

Safety contract:

- No request body is sent from the browser.
- The device token is required before contacting the route.
- Event pages are cursor-based and clamped to 100 rows.
- Browser code accepts only the materialized document payload and safe summary.
- Internal emitted snapshots are not part of the browser pull contract.
- Applying events to local data is intentionally left for the next phase.
