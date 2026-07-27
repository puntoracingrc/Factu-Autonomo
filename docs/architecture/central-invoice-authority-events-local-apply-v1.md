# Central Invoice Authority Events Local Apply V1

Status: guarded local applicator.

This phase adds a pure browser-safe applicator for pulled central invoice
authority events. It does not poll automatically and it does not enable the
central form canary in production.

The applicator receives already-authenticated events from
`pullCentralInvoiceAuthorityEventsFromBrowser` and decides whether they can be
materialized in the local document list.

Safety contract:

- Only `invoice_issued` events are applied in this phase.
- Missing invoices are inserted only when the materialized payload is a complete
  invoice document whose visible number matches the central `fullNumber`.
- Existing invoices with the same central `serverDocumentId` or `identityId`
  receive metadata only; fiscal content is not overwritten.
- A different local invoice with the same fiscal number creates
  `duplicate_fiscal_number` and leaves the local list unchanged.
- A local id collision creates `local_document_id_collision` unless it is the
  same visible invoice and only lacks central metadata.
- `rectification_issued` and `document_repaired` stay skipped until they have a
  dedicated protected merge contract.
- The module is pure: no `fetch`, no `localStorage`, no Supabase client and no
  cloud snapshot writes.

Local documents now carry `centralInvoiceAuthority` metadata outside the fiscal
snapshot. The metadata is operational matching evidence for later pulls; it is
not rendered in PDFs and does not change tax calculations.
