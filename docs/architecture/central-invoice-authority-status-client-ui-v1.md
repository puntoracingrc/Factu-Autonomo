# Central Invoice Authority Status Client UI V1

Marker: `CENTRAL_INVOICE_AUTHORITY_STATUS_CLIENT_V1`

Status: manual account preflight UI, no fiscal writes.

This phase adds a browser client and a Cuenta card for the existing private
`GET /api/central-invoice-authority/status` route. It lets a confirmed account
with an active cloud device see whether the central authority is ready before
any form canary or required rollout is enabled.

## Flow

1. the card lives in `Cuenta > Sincronizacion`;
2. it is manual and has no automatic polling;
3. the browser client obtains the current Supabase access token and local cloud
   device token;
4. it calls the status route with `GET`, `Authorization`, `X-Factu-Device-Token`
   and `cache: "no-store"`;
5. it accepts only the safe route envelope and rejects any check that is not
   `noBusinessRows: true` and `destructive: false`;
6. the UI displays mode, readiness, blockers and the last server check.

## Safety

The UI does not emit invoices, does not sync events, does not repair cloud data
and does not call the document form canary. It only mirrors the server summary:
`summary.fiscalWritesPossible` stays false unless the server reports both
activation gates and schema readiness as ready.

The component is intentionally separate from `CloudSyncContext`, the legacy
cloud repair flow and document forms. The status client does not import admin
Supabase code, service-role secrets, server RPC adapters or document payload
builders.
